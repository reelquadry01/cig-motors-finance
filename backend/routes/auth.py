"""POST /api/auth — trades an admin key for a Bearer token."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from .. import auth as auth_svc
from .. import config
from ..services.activity_log import log_event


router = APIRouter(prefix="/api", tags=["auth"])


class AuthRequest(BaseModel):
    key: str


class AuthResponse(BaseModel):
    token: str
    expires_in_minutes: int


@router.post("/auth", response_model=AuthResponse)
def authenticate(body: AuthRequest, request: Request) -> AuthResponse:
    if not auth_svc.check_admin_key(body.key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
    client_ip = request.client.host if request.client else "unknown"
    log_event("auth", "Admin signed in", "", {"ip": client_ip})
    return AuthResponse(token=auth_svc.sign_token(), expires_in_minutes=config.TOKEN_TTL_MINUTES)
