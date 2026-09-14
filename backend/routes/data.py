"""Data-status + template downloads."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from ..auth import require_auth
from ..services import file_manager, templates
from .. import config


router = APIRouter(prefix="/api", tags=["data"])


@router.get("/data-status", dependencies=[Depends(require_auth)])
def data_status() -> dict:
    """Snapshot for the admin UI: one entry per managed file type."""
    return {"files": file_manager.data_status()}


@router.get("/download-template/{file_type}")
def download_template(file_type: str) -> Response:
    """Templates are public — the point of them is to get people started."""
    if file_type not in config.FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown file type '{file_type}'")
    buf = templates.build_template(file_type)
    filename = f"CIG_{file_type}_template.xlsx"
    return Response(
        content=buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
