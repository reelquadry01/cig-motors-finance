"""File management — where uploaded files live, how they're backed up,
and how they get promoted to `data/current/` when the user confirms.

Keeps every raw upload under `data/uploads/` with a timestamp + uploadId
so we can trace exactly what was accepted. Backups of the previous
`data/current/` version are dropped in `data/backups/` before a replace,
so an unwanted merge is one command away from a rollback.
"""
from __future__ import annotations
import shutil, time, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .. import config


def new_upload_id() -> str:
    """Time-sortable id so `ls data/uploads/` reads as a history log."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{ts}-{uuid.uuid4().hex[:8]}"


def upload_path(upload_id: str, original_name: str) -> Path:
    """Path where a raw upload is persisted."""
    safe = Path(original_name).name.replace(" ", "_")
    return config.UPLOADS_DIR / f"{upload_id}__{safe}"


def current_path(file_type: str) -> Path:
    """Where the active version of this file type lives."""
    return config.CURRENT_DIR / config.FILE_TYPES[file_type]["filename"]


def backup_current(file_type: str) -> Optional[Path]:
    """Copy the current file (if any) into data/backups/ before overwriting."""
    src = current_path(file_type)
    if not src.exists():
        return None
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = config.BACKUPS_DIR / f"{ts}__{src.name}"
    shutil.copy2(src, dest)
    return dest


def promote(upload_id: str, file_type: str, source: Path) -> Path:
    """Move a merged/replaced file into data/current/ under the canonical name."""
    backup_current(file_type)
    dest = current_path(file_type)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
    return dest


def data_status() -> dict:
    """A snapshot of every managed file — row counts + last-updated date.

    Returns something the admin UI can display without extra formatting.
    Missing files are reported as {"rows": 0, "lastUpdated": None}.
    """
    import pandas as pd
    out = {}
    for t, spec in config.FILE_TYPES.items():
        p = current_path(t)
        entry = {
            "type": t,
            "label": spec["label"],
            "path": str(p),
            "rows": 0,
            "columns": len(spec["headers"]),
            "lastUpdated": None,
            "sizeKB": 0,
        }
        if p.exists():
            try:
                df = pd.read_excel(p, sheet_name=spec.get("sheet", 0))
                entry["rows"] = int(len(df))
            except Exception:
                entry["rows"] = -1  # signalled to UI as "unreadable"
            entry["lastUpdated"] = datetime.fromtimestamp(
                p.stat().st_mtime, tz=timezone.utc
            ).strftime("%Y-%m-%d")
            entry["sizeKB"] = round(p.stat().st_size / 1024)
        out[t] = entry
    return out
