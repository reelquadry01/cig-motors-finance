"""POST /api/auth — trades an admin key for a Bearer token."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from .. import auth as auth_svc
from .. import config


router = APIRouter(prefix="/api", tags=["auth"])


class AuthRequest(BaseModel):
    key: str


class AuthResponse(BaseModel):
    token: str
    expires_in_hours: int


@router.post("/auth", response_model=AuthResponse)
def authenticate(body: AuthRequest) -> AuthResponse:
    if not auth_svc.check_admin_key(body.key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
    return AuthResponse(token=auth_svc.sign_token(), expires_in_hours=config.TOKEN_TTL_HOURS)
