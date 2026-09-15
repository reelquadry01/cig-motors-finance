"""Upload flow: /api/upload → /api/confirm-upload → /api/pipeline-status."""
from __future__ import annotations
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from ..auth import require_auth
from ..services import file_manager, differ, pipeline_runner
from ..services.activity_log import log_event
from .. import config


router = APIRouter(prefix="/api", tags=["upload"])


# ── In-memory registry of pending uploads (uploadId → (file_type, path)) ──
# Cleared on process restart, which is fine — a stale uploadId simply 404s.
PENDING: dict[str, tuple[str, Path]] = {}


@router.post("/upload", dependencies=[Depends(require_auth)])
async def upload(file: UploadFile = File(...), type: str = Form(...)) -> dict:
    """Accept a file, save it to data/uploads, diff it, hand back a preview."""
    if type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{type}'")
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="File must be an Excel .xlsx")

    body = await file.read()
    if len(body) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {config.MAX_UPLOAD_MB}MB limit")

    upload_id = file_manager.new_upload_id()
    path = file_manager.upload_path(upload_id, file.filename or "upload.xlsx")
    path.write_bytes(body)

    # GL specifically may come as a raw Sage-style hierarchical export. If it
    # does, run it through gl_cleaner before anything else touches it — the
    # rest of the pipeline (differ, confirm, pipeline) only sees the clean
    # version.
    ingest_meta = {}
    if type == "gl":
        try:
            from ..services.gl_ingest import prepare_gl_for_diff
            path, ingest_meta = prepare_gl_for_diff(path)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not clean the raw GL: {exc}")

    try:
        diff_result = differ.diff(type, path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read the file: {exc}")

    if "error" in diff_result:
        raise HTTPException(status_code=400, detail=diff_result["error"])

    PENDING[upload_id] = (type, path)
    log_event("upload", f"File uploaded: {type}", f"{file.filename} ({len(body)} bytes)", {"file_type": type, "upload_id": upload_id})
    return {
        "status": "diff_ready",
        "uploadId": upload_id,
        "fileType": type,
        "diff": diff_result,
        "ingest": ingest_meta,
    }


class ConfirmRequest(BaseModel):
    uploadId: str
    action: str    # "append" | "replace" | "cancel"


@router.post("/confirm-upload", dependencies=[Depends(require_auth)])
def confirm_upload(body: ConfirmRequest) -> dict:
    if body.uploadId not in PENDING:
        raise HTTPException(status_code=404, detail="Unknown uploadId (expired or already processed)")
    file_type, uploaded_path = PENDING[body.uploadId]

    if body.action == "cancel":
        PENDING.pop(body.uploadId, None)
        try: uploaded_path.unlink()
        except FileNotFoundError: pass
        return {"status": "cancelled"}

    if body.action not in ("append", "replace"):
        raise HTTPException(status_code=400, detail="action must be append | replace | cancel")

    merged = differ.apply_merge(file_type, uploaded_path, body.action)
    file_manager.promote(body.uploadId, file_type, merged)
    PENDING.pop(body.uploadId, None)

    log_event("upload", f"File merged: {file_type}", f"Action: {body.action}", {"file_type": file_type, "action": body.action})

    # Kick off pipeline in a worker thread
    job = pipeline_runner.start(file_type)
    return {"status": "pipeline_running", "jobId": job.id}


@router.get("/pipeline-status/{job_id}", dependencies=[Depends(require_auth)])
def pipeline_status(job_id: str) -> dict:
    job = pipeline_runner.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown job id")
    return job.to_dict()


@router.post("/pipeline/rerun", dependencies=[Depends(require_auth)])
def pipeline_rerun() -> dict:
    """Kick the pipeline off against whatever's already in data/current.

    Useful when the mapping was edited in place, or when a previous run
    failed and you want to try again without re-uploading. The job is
    labelled 'manual' so it's obvious in the activity log.
    """
    log_event("pipeline", "Pipeline re-run triggered", "Manual re-run from admin", {"trigger": "manual"})
    job = pipeline_runner.start("manual")
    return {"status": "pipeline_running", "jobId": job.id}
