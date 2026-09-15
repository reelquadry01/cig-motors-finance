"""Activity log API routes — list, filter, and clear admin activity history."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from typing import Optional

from ..auth import require_auth
from ..services.activity_log import get_logs, get_total_count, clear_logs

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("", dependencies=[Depends(require_auth)])
def list_activity(
    limit: int = Query(50, ge=1, le=200),
    kind: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
) -> dict:
    entries = get_logs(limit, kind, offset)
    return {"entries": entries, "total": get_total_count(kind)}


@router.delete("", dependencies=[Depends(require_auth)])
def clear_activity() -> dict:
    clear_logs()
    return {"ok": True}
