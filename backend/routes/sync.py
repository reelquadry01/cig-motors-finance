"""Sync orchestration — fetch → clean → validate → diff → apply → pipeline.

Background sync runs in a worker thread.  Status and history are kept
in-memory (fine for single-instance; swap for Redis if scaling).
"""
from __future__ import annotations

import logging
import threading
import time
import traceback
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from ..connectors import get_connector_class, registry
from ..connectors.credentials import load_credentials_batch
from ..services.activity_log import log_event

logger = logging.getLogger(__name__)

# In-memory sync state
_SYNC_STATUS: dict[str, dict] = {}
_SYNC_HISTORY: dict[str, list[dict]] = defaultdict(list)
_LOCK = threading.Lock()
_HISTORY_LIMIT = 20


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_sync_status(connector_id: str) -> dict:
    """Return current sync status for a connector."""
    with _LOCK:
        return _SYNC_STATUS.get(connector_id, {
            "status": "idle",
            "last_sync": None,
            "error": None,
            "row_count": 0,
        })


def get_sync_history(connector_id: str, limit: int = 10) -> list[dict]:
    """Return last N sync runs for a connector."""
    with _LOCK:
        return _SYNC_HISTORY.get(connector_id, [])[:limit]


def _record_history(connector_id: str, entry: dict) -> None:
    with _LOCK:
        hist = _SYNC_HISTORY[connector_id]
        hist.insert(0, entry)
        _SYNC_HISTORY[connector_id] = hist[:_HISTORY_LIMIT]


def _update_status(connector_id: str, **kwargs) -> None:
    with _LOCK:
        if connector_id not in _SYNC_STATUS:
            _SYNC_STATUS[connector_id] = {"status": "idle", "last_sync": None, "error": None, "row_count": 0}
        _SYNC_STATUS[connector_id].update(kwargs)


def start_sync(connector_id: str) -> dict:
    """Trigger a manual sync for *connector_id* in a background thread.

    Returns an immediate acknowledgement.  The actual work runs async.
    """
    entry = registry.get_connector(connector_id)
    if not entry:
        return {"ok": False, "error": "Connector not found"}

    current = get_sync_status(connector_id)
    if current.get("status") == "syncing":
        return {"ok": False, "error": "Sync already in progress"}

    t = threading.Thread(target=_run_sync, args=(connector_id,), daemon=True, name=f"sync-{connector_id}")
    t.start()
    return {"ok": True, "message": "Sync started", "connector_id": connector_id}


def _run_sync(connector_id: str) -> None:
    """Worker thread: fetch → clean → validate → write → pipeline."""
    start_time = time.time()
    _update_status(connector_id, status="syncing", error=None)

    entry = registry.get_connector(connector_id)
    connector_name = entry.get("name", connector_id) if entry else connector_id
    log_event("sync", f"Sync started: {connector_name}", "", {"connector_id": connector_id})

    history_entry = {
        "start_time": _now_iso(),
        "end_time": None,
        "status": "running",
        "rows_fetched": 0,
        "rows_after_clean": 0,
        "checks_passed": 0,
        "checks_failed": 0,
        "error": None,
    }

    try:
        entry = registry.get_connector(connector_id)
        if not entry:
            raise ValueError("Connector not found")

        # ── 1. Build connector instance ──────────────────────────────
        connector_type = entry["type"]
        cls = get_connector_class(connector_type)
        if not cls:
            raise ValueError(f"Unknown connector type: {connector_type}")

        # Load encrypted credentials into the config
        config = dict(entry.get("config", {}))
        cred_ref = entry.get("credentials_ref", {})
        for field, env_name in cred_ref.items():
            from ..connectors.credentials import load_credential
            # Extract field name from env name: CRED_<id>_<field>
            parts = env_name.split("_")
            if len(parts) >= 3:
                plain = load_credential(connector_id, parts[2])
                if plain:
                    config[parts[2]] = plain

        connector = cls(connector_id, config)

        # ── 2. Fetch ─────────────────────────────────────────────────
        logger.info("Sync %s: fetching data...", connector_id)
        df = connector.fetch_data()
        history_entry["rows_fetched"] = len(df)

        if df.empty:
            raise ValueError("No data returned from source")

        # ── 3. Clean ─────────────────────────────────────────────────
        logger.info("Sync %s: cleaning data...", connector_id)
        mapping_df = connector._load_mapping_df()
        from ..connectors.cleaner import run_all_cleaners
        df_clean, clean_logs = run_all_cleaners(df, mapping_df)
        history_entry["rows_after_clean"] = len(df_clean)

        # ── 4. Validate ──────────────────────────────────────────────
        logger.info("Sync %s: running financial checks...", connector_id)
        from ..connectors.validator import run_all_checks
        check_results = run_all_checks(df_clean, mapping_df)
        history_entry["checks_passed"] = sum(1 for c in check_results if c["ok"])
        history_entry["checks_failed"] = sum(1 for c in check_results if not c["ok"])

        # ── 5. Write to data/current/ ────────────────────────────────
        logger.info("Sync %s: writing data...", connector_id)
        from .. import config
        from pathlib import Path
        import pandas as pd

        file_type = entry.get("config", {}).get("file_type", "gl")
        if file_type not in config.FILE_TYPES:
            file_type = "gl"

        out_path = config.CURRENT_DIR / config.FILE_TYPES[file_type]["filename"]
        out_path.parent.mkdir(parents=True, exist_ok=True)

        # Backup existing file
        from ..services import file_manager
        file_manager.backup_current(file_type)

        # Write Excel
        df_clean.to_excel(out_path, index=False, sheet_name=config.FILE_TYPES[file_type].get("sheet", "GL_Clean"))

        # ── 6. Mark first sync done ──────────────────────────────────
        registry.mark_first_sync_done(connector_id)

        # ── 7. Update status ─────────────────────────────────────────
        elapsed = round(time.time() - start_time, 2)
        _update_status(
            connector_id,
            status="idle",
            last_sync=_now_iso(),
            row_count=len(df_clean),
            error=None,
        )
        registry.set_sync_status(connector_id, "idle", row_count=len(df_clean))

        history_entry.update({
            "end_time": _now_iso(),
            "status": "completed",
            "elapsed_seconds": elapsed,
            "clean_logs": clean_logs,
            "check_results": check_results,
        })
        _record_history(connector_id, history_entry)
        logger.info("Sync %s completed: %d rows in %.1fs", connector_id, len(df_clean), elapsed)

        log_event("sync", f"Sync completed: {connector_name}", f"Rows: {len(df_clean)}", {"connector_id": connector_id, "rows": len(df_clean)})

    except Exception as exc:
        elapsed = round(time.time() - start_time, 2)
        error_msg = f"{type(exc).__name__}: {exc}"
        _update_status(connector_id, status="error", error=error_msg)
        registry.set_sync_status(connector_id, "error", error=error_msg)

        history_entry.update({
            "end_time": _now_iso(),
            "status": "failed",
            "elapsed_seconds": elapsed,
            "error": error_msg,
        })
        _record_history(connector_id, history_entry)
        logger.error("Sync %s failed: %s", connector_id, error_msg)

        log_event("sync", f"Sync failed: {connector_name}", f"Error: {error_msg}", {"connector_id": connector_id, "error": error_msg})
