"""Per-file management: preview, list backups, restore, delete.

Each mutating action creates a fresh backup of the current file first, so a
restore or delete is itself reversible from the same backups folder.
"""
from __future__ import annotations
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..auth import require_auth
from ..services import file_manager, pipeline_runner
from ..services.activity_log import log_event
from .. import config


router = APIRouter(prefix="/api/file", tags=["file"])


# ── Preview ──────────────────────────────────────────────────────────────
@router.get("/{file_type}/preview", dependencies=[Depends(require_auth)])
def preview(file_type: str, limit: int = Query(20, ge=1, le=200)) -> dict:
    """First `limit` rows of the current dataset for this file type.

    Returns the header + rows shaped so the UI can render them in a plain
    table. Handles the empty-file case cleanly.
    """
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")

    spec = config.FILE_TYPES[file_type]
    path = file_manager.current_path(file_type)
    if not path.exists():
        return {"columns": spec["headers"], "rows": [], "total": 0, "empty": True}

    import pandas as pd
    try:
        df = pd.read_excel(path, sheet_name=spec.get("sheet", 0))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read file: {exc}")

    total = int(len(df))
    df = df.head(limit).fillna("")

    def cell(v):
        if hasattr(v, "isoformat"):
            try: return v.isoformat()[:10]
            except Exception: pass
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


# ── Download current ───────────────────────────────────────────────────
@router.get("/{file_type}/download", dependencies=[Depends(require_auth)])
def download_current(file_type: str) -> FileResponse:
    """Serve the current file as an .xlsx download.

    Uses a friendly download name (e.g. `general_ledger.xlsx`) rather than
    the internal canonical filename, since that's what the person clicking
    save-as will see.
    """
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")
    spec = config.FILE_TYPES[file_type]
    path = file_manager.current_path(file_type)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"No current {spec['label']} file")
    # Friendly filename: label slugified, .xlsx suffix
    label_slug = spec["label"].lower().replace(" ", "_").replace("(", "").replace(")", "")
    friendly = f"{label_slug}.xlsx"
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=friendly,
    )


# ── Backups ─────────────────────────────────────────────────────────────
@router.get("/{file_type}/backups", dependencies=[Depends(require_auth)])
def list_backups(file_type: str) -> dict:
    """Backups on disk for this file type, newest first."""
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")
    canonical = config.FILE_TYPES[file_type]["filename"]

    backups = []
    for p in sorted(config.BACKUPS_DIR.glob("*"), reverse=True):
        # File naming: <ISO timestamp>__<canonical filename>
        if not p.name.endswith(canonical):
            continue
        stat = p.stat()
        # ISO timestamp is the prefix up to "__"
        ts_str = p.name.split("__", 1)[0]
        try:
            ts_iso = datetime.strptime(ts_str, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            ts_iso = None
        backups.append({
            "filename": p.name,
            "timestamp": ts_iso,
            "sizeKB": round(stat.st_size / 1024),
        })
    return {"fileType": file_type, "backups": backups}


class RestoreRequest(BaseModel):
    filename: str


@router.post("/{file_type}/restore", dependencies=[Depends(require_auth)])
def restore(file_type: str, body: RestoreRequest) -> dict:
    """Restore a specific backup to data/current/ and re-run the pipeline.

    A fresh backup of the current file is taken first — the restore is
    itself reversible from the backups tab.
    """
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")

    src = config.BACKUPS_DIR / body.filename
    if not src.exists() or not src.is_file():
        raise HTTPException(status_code=404, detail="Backup not found")
    canonical = config.FILE_TYPES[file_type]["filename"]
    if not body.filename.endswith(canonical):
        raise HTTPException(status_code=400, detail="Backup name doesn't match this file type")

    backup_path = file_manager.backup_current(file_type)
    dest = file_manager.current_path(file_type)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)

    log_event("restore", f"Backup restored: {file_type}", f"Restored from {body.filename}", {"file_type": file_type, "backup": body.filename})

    job = pipeline_runner.start(file_type)
    return {"status": "restored", "restored": body.filename, "jobId": job.id}


# ── Delete ──────────────────────────────────────────────────────────────
@router.delete("/{file_type}", dependencies=[Depends(require_auth)])
def delete_current(file_type: str) -> dict:
    """Remove data/current/<file>. A backup is taken first so it can be
    restored. The pipeline is NOT re-run automatically — deleting the GL
    would fail; the user restores or re-uploads instead."""
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")

    path = file_manager.current_path(file_type)
    if not path.exists():
        return {"status": "already_absent", "fileType": file_type}

    file_manager.backup_current(file_type)
    path.unlink()

    log_event("delete", f"File deleted: {file_type}", "Backed up before deletion", {"file_type": file_type})

    return {"status": "deleted", "fileType": file_type}
