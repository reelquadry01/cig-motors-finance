"""Connector CRUD + test/preview/sync/validate API routes.

All routes require Bearer token auth.  The router is mounted at
``/api/connectors``.
"""
from __future__ import annotations

import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..auth import require_auth
from ..connectors import get_connector_class, list_connector_types, ERP_GALLERY
from ..connectors import registry
from ..connectors.credentials import (
    store_credentials_batch,
    load_credential,
    clear_all_credentials,
)
from ..services.activity_log import log_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


# ── Request models ──────────────────────────────────────────────────


class ConnectorCreateRequest(BaseModel):
    type: str
    name: str
    config: dict[str, Any] = {}
    credentials: dict[str, str] = {}
    schedule: dict[str, Any] = {"mode": "manual"}


class ConnectorUpdateRequest(BaseModel):
    name: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    credentials: Optional[dict[str, str]] = None
    schedule: Optional[dict[str, Any]] = None


class ScheduleRequest(BaseModel):
    mode: str = "manual"
    time: Optional[str] = None
    day: Optional[str] = None
    expression: Optional[str] = None


class ClearSampleRequest(BaseModel):
    backup: bool = True


# ── Helpers ─────────────────────────────────────────────────────────

_CREDENTIAL_FIELDS = {
    "password", "api_key", "client_secret", "api_password",
    "consumer_secret", "token_secret", "access_token", "refresh_token", "pwd",
}


def _is_credential_field(field_name: str) -> bool:
    return any(kw in field_name.lower() for kw in ("password", "secret", "token", "key", "pwd"))


def _enrich_connector(entry: dict) -> dict:
    """Add status + type metadata to a connector entry for the UI."""
    result = dict(entry)
    result["status"] = registry.get_connector(entry["id"]).get("status", {}) if isinstance(registry.get_connector(entry["id"]), dict) else {}
    # Look up config schema
    cls = get_connector_class(entry.get("type", ""))
    if cls:
        result["config_schema"] = cls.CONFIG_SCHEMA
    return result


# ── Routes ──────────────────────────────────────────────────────────


@router.get("/types/{connector_type}/schema")
def get_connector_type_schema(connector_type: str) -> dict:
    """Return the config schema (editable fields) for a connector type."""
    cls = get_connector_class(connector_type)
    if not cls:
        raise HTTPException(status_code=404, detail=f"Unknown connector type: {connector_type}")
    return {"type": connector_type, "schema": cls.CONFIG_SCHEMA}


@router.get("/types")
def get_connector_types() -> dict:
    """List all available connector types with their config schemas."""
    types = list_connector_types()
    return {"types": types, "erp_gallery": ERP_GALLERY}


@router.get("", dependencies=[Depends(require_auth)])
def list_all_connectors() -> dict:
    """List all registered connectors with their current status."""
    connectors = registry.list_connectors()
    enriched = []
    for c in connectors:
        e = dict(c)
        # Load the status from registry
        full = registry.get_connector(c["id"])
        if full:
            e["status"] = full.get("status", {})
            e["schedule"] = full.get("schedule", {"mode": "manual"})
            e["first_sync_done"] = full.get("first_sync_done", False)
        enriched.append(e)
    return {"connectors": enriched}


@router.post("", dependencies=[Depends(require_auth)])
def create_connector(body: ConnectorCreateRequest) -> dict:
    """Create a new connector."""
    # Validate connector type
    cls = get_connector_class(body.type)
    if not cls:
        raise HTTPException(status_code=400, detail=f"Unknown connector type: {body.type}")

    # Create the connector entry
    entry = registry.create_connector({
        "type": body.type,
        "name": body.name,
        "config": body.config,
        "schedule": body.schedule,
    })

    # Store encrypted credentials
    if body.credentials:
        env_names = store_credentials_batch(entry["id"], body.credentials)
        cred_ref = {}
        for field, env_name in zip(body.credentials.keys(), env_names):
            cred_ref[field] = env_name
        registry.update_connector(entry["id"], {"credentials_ref": cred_ref})

    full = registry.get_connector(entry["id"])

    log_event("connector", f"Connector created: {body.name}", f"Type: {body.type}", {"connector_id": entry["id"], "connector_type": body.type})

    return {"connector": full, "message": f"Connector '{body.name}' created"}


@router.get("/{connector_id}", dependencies=[Depends(require_auth)])
def get_connector(connector_id: str) -> dict:
    """Get details for a single connector."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {"connector": entry}


@router.get("/{connector_id}/config", dependencies=[Depends(require_auth)])
def get_connector_config(connector_id: str) -> dict:
    """Return full connector config with credentials masked."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    raw_config = dict(entry.get("config", {}))
    cred_ref = entry.get("credentials_ref", {})

    # Mask credential fields in the config
    masked_config = {}
    for key, value in raw_config.items():
        if _is_credential_field(key) or key in cred_ref:
            masked_config[key] = "••••••••"
        else:
            masked_config[key] = value

    # Build sync info
    from .sync import get_sync_status
    sync_status = get_sync_status(connector_id)
    schedule = entry.get("schedule", {"mode": "manual"})
    last_sync = sync_status.get("last_sync")
    next_sync = None
    if schedule.get("mode") == "scheduled" and last_sync:
        next_sync = "see scheduler"

    return {
        "id": entry["id"],
        "type": entry.get("type", ""),
        "name": entry.get("name", ""),
        "status": entry.get("status", "active"),
        "config": masked_config,
        "sync": {
            "mode": schedule.get("mode", "manual"),
            "schedule": schedule.get("expression") or schedule.get("time"),
            "last_sync": last_sync,
            "next_sync": next_sync,
        },
        "clean_rules": entry.get("clean_rules", {
            "remove_duplicates": True,
            "auto_map_gl_codes": True,
            "flag_unknown": True,
        }),
        "first_sync_done": entry.get("first_sync_done", False),
        "created_at": entry.get("created_at"),
        "updated_at": entry.get("updated_at"),
    }


@router.put("/{connector_id}", dependencies=[Depends(require_auth)])
def update_connector(connector_id: str, body: ConnectorUpdateRequest) -> dict:
    """Update a connector's configuration."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.config is not None:
        updates["config"] = body.config
    if body.schedule is not None:
        updates["schedule"] = body.schedule

    # Handle credential updates
    if body.credentials is not None:
        # Clear old credentials
        clear_all_credentials(connector_id)
        # Store new ones
        if body.credentials:
            env_names = store_credentials_batch(connector_id, body.credentials)
            cred_ref = {}
            for field, env_name in zip(body.credentials.keys(), env_names):
                cred_ref[field] = env_name
            updates["credentials_ref"] = cred_ref
        else:
            updates["credentials_ref"] = {}

    updated = registry.update_connector(connector_id, updates)

    log_event("connector", f"Connector updated: {entry.get('name', connector_id)}", "", {"connector_id": connector_id})

    return {"connector": updated, "message": "Connector updated"}


@router.delete("/{connector_id}", dependencies=[Depends(require_auth)])
def delete_connector(connector_id: str) -> dict:
    """Delete a connector (backs up config first)."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    # Backup connector config
    from .. import config
    backup_dir = config.BACKUPS_DIR / "connectors"
    backup_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    import json
    backup_path = backup_dir / f"{ts}__{connector_id}.json"
    backup_path.write_text(json.dumps(entry, indent=2, default=str), encoding="utf-8")

    # Clear credentials
    clear_all_credentials(connector_id)

    # Delete from registry
    deleted = registry.delete_connector(connector_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Connector not found")

    log_event("connector", f"Connector deleted: {entry.get('name', connector_id)}", "", {"connector_id": connector_id})

    return {"status": "deleted", "connector_id": connector_id, "backup": str(backup_path)}


@router.post("/{connector_id}/test", dependencies=[Depends(require_auth)])
def test_connector(connector_id: str) -> dict:
    """Test the connection for a connector."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    cls = get_connector_class(entry["type"])
    if not cls:
        raise HTTPException(status_code=400, detail=f"Unknown connector type: {entry['type']}")

    # Build config with decrypted credentials
    config = dict(entry.get("config", {}))
    cred_ref = entry.get("credentials_ref", {})
    for field, env_name in cred_ref.items():
        from ..connectors.credentials import _env_var_name
        parts = env_name.split("_")
        if len(parts) >= 3:
            plain = load_credential(connector_id, parts[2])
            if plain:
                config[parts[2]] = plain

    connector = cls(connector_id, config)
    result = connector.test_connection()

    ok = result.get("ok", False) if isinstance(result, dict) else False
    log_event("connector", f"Connection tested: {entry.get('name', connector_id)}", f"Result: {'ok' if ok else 'failed'}", {"connector_id": connector_id})

    return result


@router.get("/{connector_id}/preview", dependencies=[Depends(require_auth)])
def preview_connector_data(
    connector_id: str,
    limit: int = Query(20, ge=1, le=200),
) -> dict:
    """Preview source data (first N rows) from a connector."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    cls = get_connector_class(entry["type"])
    if not cls:
        raise HTTPException(status_code=400, detail=f"Unknown connector type: {entry['type']}")

    config = dict(entry.get("config", {}))
    cred_ref = entry.get("credentials_ref", {})
    for field, env_name in cred_ref.items():
        parts = env_name.split("_")
        if len(parts) >= 3:
            plain = load_credential(connector_id, parts[2])
            if plain:
                config[parts[2]] = plain

    connector = cls(connector_id, config)
    try:
        df = connector.fetch_data()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Fetch failed: {exc}")

    total = len(df)
    df = df.head(limit).fillna("")

    def cell(v):
        if hasattr(v, "isoformat"):
            try:
                return v.isoformat()[:10]
            except Exception:
                pass
        return str(v)

    columns = [str(c) for c in df.columns]
    rows = [[cell(v) for v in row] for row in df.itertuples(index=False, name=None)]
    return {
        "columns": columns,
        "rows": rows,
        "total": total,
        "shown": len(rows),
        "empty": total == 0,
    }


@router.post("/{connector_id}/sync", dependencies=[Depends(require_auth)])
def trigger_sync(connector_id: str) -> dict:
    """Trigger a manual sync for a connector."""
    from .sync import start_sync
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    result = start_sync(connector_id)
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("error", "Sync failed"))
    return result


@router.get("/{connector_id}/sync/status", dependencies=[Depends(require_auth)])
def sync_status(connector_id: str) -> dict:
    """Get sync status + history for a connector."""
    from .sync import get_sync_status, get_sync_history
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    return {
        "status": get_sync_status(connector_id),
        "history": get_sync_history(connector_id),
    }


@router.post("/{connector_id}/schedule", dependencies=[Depends(require_auth)])
def set_schedule(connector_id: str, body: ScheduleRequest) -> dict:
    """Set the sync schedule for a connector."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    schedule_config = {"mode": body.mode}
    if body.time:
        schedule_config["time"] = body.time
    if body.day:
        schedule_config["day"] = body.day
    if body.expression:
        schedule_config["expression"] = body.expression

    registry.set_schedule(connector_id, schedule_config)
    return {"status": "ok", "schedule": schedule_config}


@router.get("/{connector_id}/validate", dependencies=[Depends(require_auth)])
def validate_connector_data(connector_id: str) -> dict:
    """Run financial integrity checks on a connector's synced data."""
    entry = registry.get_connector(connector_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Connector not found")

    import pandas as pd
    from .. import config

    file_type = entry.get("config", {}).get("file_type", "gl")
    if file_type not in config.FILE_TYPES:
        file_type = "gl"

    data_path = config.CURRENT_DIR / config.FILE_TYPES[file_type]["filename"]
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="No synced data found. Run a sync first.")

    try:
        df = pd.read_excel(data_path, sheet_name=config.FILE_TYPES[file_type].get("sheet", 0))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read data: {exc}")

    # Load mapping
    mapping_path = config.CURRENT_DIR / "statement_mapping.xlsx"
    mapping_df = None
    if mapping_path.exists():
        try:
            mapping_df = pd.read_excel(mapping_path)
        except Exception:
            pass

    from ..connectors.validator import run_all_checks
    results = run_all_checks(df, mapping_df)
    return {"checks": results}


@router.post("/clear-sample", dependencies=[Depends(require_auth)])
def clear_sample_data(body: ClearSampleRequest) -> dict:
    """Clear sample/placeholder data from data/current/."""
    from .. import config

    cleared = []
    for file_type, spec in config.FILE_TYPES.items():
        path = config.CURRENT_DIR / spec["filename"]
        if path.exists():
            if body.backup:
                from ..services import file_manager
                file_manager.backup_current(file_type)
            path.unlink()
            cleared.append(file_type)

    log_event("system", "Sample data cleared", f"Files removed: {', '.join(cleared)}" if cleared else "No files to clear", {"files_removed": cleared, "backup_taken": body.backup})

    return {
        "status": "cleared",
        "files_removed": cleared,
        "backup_taken": body.backup,
    }
