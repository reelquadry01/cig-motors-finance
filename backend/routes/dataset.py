"""Whole-dataset actions — clear everything, load the bundled sample.

Both actions are destructive against `data/current/`, so they take
backups first. Restore-from-backups is one click away from the file's
own menu.
"""
from __future__ import annotations
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_auth
from ..services import file_manager, pipeline_runner
from ..services.activity_log import log_event
from .. import config


router = APIRouter(prefix="/api/data", tags=["data"])


# Bundled sample files at the repo root. These are the same files a
# developer working locally would see; the "Load sample" button just
# copies them into data/current/ so the admin console gets an instant
# working dataset without asking the user to upload anything.
_ROOT = Path(__file__).resolve().parents[2]
_SAMPLE_MAP: dict[str, str] = {
    "gl": "Sample GL_complete_dirty.xlsx",
    "mapping": "Statement_Mapping.xlsx",
    # Templates for the remaining types — kept so the pipeline can boot
    # without erroring on missing optional inputs.
    "budget": "Budget_Template.xlsx",
    "prior_period": "Prior_Period_Template.xlsx",
    # account_summary lives inside the GL workbook itself, so no separate
    # bundled file — the pipeline reads it from `Sample GL_complete_dirty.xlsx`.
}


@router.post("/clear-all", dependencies=[Depends(require_auth)])
def clear_all() -> dict:
    """Delete every file in data/current/, backing each up first.

    Doesn't touch data/uploads or data/backups. Doesn't re-run the
    pipeline — nothing to run against.
    """
    removed = []
    for file_type in config.FILE_TYPES.keys():
        p = file_manager.current_path(file_type)
        if p.exists():
            file_manager.backup_current(file_type)
            p.unlink()
            removed.append(file_type)

    log_event(
        "delete",
        f"Cleared all current data",
        f"{len(removed)} files removed: {', '.join(removed) or 'none'}",
        {"removed": removed},
    )
    return {"status": "cleared", "removed": removed}


@router.post("/load-sample", dependencies=[Depends(require_auth)])
def load_sample() -> dict:
    """Copy the bundled sample files into data/current, run the pipeline.

    Useful for a first-time demo, or after Clear all when you want a
    working dataset back with one click.
    """
    copied = []
    missing = []

    # If there's anything in data/current, back it up before overwriting.
    for file_type in _SAMPLE_MAP:
        p = file_manager.current_path(file_type)
        if p.exists():
            file_manager.backup_current(file_type)

    for file_type, filename in _SAMPLE_MAP.items():
        src = _ROOT / filename
        if not src.exists():
            missing.append(filename)
            continue
        dest = file_manager.current_path(file_type)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        copied.append(file_type)

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing bundled sample files at repo root: {', '.join(missing)}",
        )

    log_event(
        "system",
        f"Loaded sample dataset",
        f"{len(copied)} files copied",
        {"copied": copied},
    )

    job = pipeline_runner.start("sample-load")
    return {"status": "loaded", "copied": copied, "jobId": job.id}
