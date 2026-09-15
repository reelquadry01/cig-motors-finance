"""CRUD registry for connector configurations stored in ``data/connectors.json``.

Thread-safe with file-level locking.  Auto-creates the JSON file if it
doesn't exist.  Each connector entry includes its config, credential
references, sync status, and schedule.

Schema stored per connector::

    {
        "id": "sql_001",
        "type": "sql",
        "name": "Production DB",
        "config": { ... },
        "credentials_ref": {"password": "CRED_sql_001_password"},
        "status": {"last_sync": ..., "next_sync": ..., "row_count": ..., "error": ...},
        "schedule": {"mode": "manual"},
        "first_sync_done": false,
        "created_at": "...",
        "updated_at": "..."
    }
"""
from __future__ import annotations

import filelock
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

_REGISTRY_DIR = Path(__file__).resolve().parents[2] / "data"
_REGISTRY_FILE = _REGISTRY_DIR / "connectors.json"
_LOCK_FILE = _REGISTRY_DIR / ".connectors.lock"


def _ensure_dir() -> None:
    _REGISTRY_DIR.mkdir(parents=True, exist_ok=True)


def _read() -> list[dict]:
    _ensure_dir()
    if not _REGISTRY_FILE.exists():
        return []
    try:
        data = json.loads(_REGISTRY_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to read connectors.json: %s", exc)
        return []


def _write(data: list[dict]) -> None:
    _ensure_dir()
    _REGISTRY_FILE.write_text(
        json.dumps(data, indent=2, default=str),
        encoding="utf-8",
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Public API ──────────────────────────────────────────────────────


def list_connectors() -> list[dict]:
    """Return all registered connectors."""
    with filelock.FileLock(_LOCK_FILE):
        return _read()


def get_connector(connector_id: str) -> Optional[dict]:
    """Return a single connector by ID, or *None*."""
    with filelock.FileLock(_LOCK_FILE):
        for c in _read():
            if c.get("id") == connector_id:
                return c
    return None


def create_connector(config: dict[str, Any]) -> dict:
    """Create a new connector entry.

    *config* must contain ``type``, ``name``, and ``config`` keys.
    Credentials are stored separately via ``credentials.store_credentials_batch``.
    """
    now = _now_iso()
    connector_id = f"{config['type']}_{uuid.uuid4().hex[:8]}"
    entry = {
        "id": connector_id,
        "type": config["type"],
        "name": config.get("name", config["type"].title()),
        "config": config.get("config", {}),
        "credentials_ref": {},
        "status": {
            "last_sync": None,
            "next_sync": None,
            "row_count": 0,
            "error": None,
        },
        "schedule": config.get("schedule", {"mode": "manual"}),
        "first_sync_done": False,
        "created_at": now,
        "updated_at": now,
    }
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        data.append(entry)
        _write(data)
    logger.info("Created connector %s (%s)", connector_id, config.get("type"))
    return entry


def update_connector(connector_id: str, updates: dict[str, Any]) -> Optional[dict]:
    """Merge *updates* into an existing connector entry.

    Supported top-level keys: ``name``, ``config``, ``schedule``.
    Credentials are handled externally; pass ``credentials_ref`` to update.
    """
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        for i, c in enumerate(data):
            if c.get("id") == connector_id:
                for key in ("name", "config", "schedule", "credentials_ref"):
                    if key in updates:
                        c[key] = updates[key]
                c["updated_at"] = _now_iso()
                data[i] = c
                _write(data)
                logger.info("Updated connector %s", connector_id)
                return c
    return None


def delete_connector(connector_id: str) -> bool:
    """Delete a connector.  Returns *True* if it existed."""
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        new_data = [c for c in data if c.get("id") != connector_id]
        if len(new_data) < len(data):
            _write(new_data)
            logger.info("Deleted connector %s", connector_id)
            return True
    return False


def set_sync_status(
    connector_id: str,
    status: str,
    error: Optional[str] = None,
    row_count: Optional[int] = None,
) -> None:
    """Update the sync status of a connector.

    *status* is one of: "idle", "syncing", "error".
    """
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        for c in data:
            if c.get("id") == connector_id:
                now = _now_iso()
                s = c.get("status", {})
                if status == "syncing":
                    s["last_sync"] = now
                elif status == "idle":
                    s["error"] = None
                elif status == "error":
                    s["error"] = error
                s["next_sync"] = s.get("next_sync")
                if row_count is not None:
                    s["row_count"] = row_count
                c["status"] = s
                c["updated_at"] = now
                _write(data)
                return


def set_schedule(connector_id: str, schedule_config: dict) -> None:
    """Set the sync schedule for a connector.

    schedule_config examples::

        {"mode": "manual"}
        {"mode": "daily", "time": "02:00"}
        {"mode": "weekly", "day": "monday", "time": "02:00"}
        {"mode": "cron", "expression": "0 2 * * *"}
    """
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        for c in data:
            if c.get("id") == connector_id:
                c["schedule"] = schedule_config
                c["updated_at"] = _now_iso()
                _write(data)
                logger.info("Set schedule for %s: %s", connector_id, schedule_config)
                return


def mark_first_sync_done(connector_id: str) -> None:
    """Mark that the first real sync has been completed."""
    with filelock.FileLock(_LOCK_FILE):
        data = _read()
        for c in data:
            if c.get("id") == connector_id:
                c["first_sync_done"] = True
                c["updated_at"] = _now_iso()
                _write(data)
                return
