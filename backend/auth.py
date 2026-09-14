"""Bearer-token auth against a shared admin key.

Tokens are HMAC-signed payloads carrying only an issued-at timestamp — no
per-user identity, since there is only one privileged actor. Kept simple on
purpose: no external identity service, no database.
"""
from __future__ import annotations
import base64, hashlib, hmac, json, time
from typing import Optional

from fastapi import HTTPException, Request, status

from . import config


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign_token(now_ms: Optional[int] = None) -> str:
    """Issue a token good for TOKEN_TTL_HOURS from now."""
    iat = now_ms if now_ms is not None else int(time.time() * 1000)
    payload = _b64(json.dumps({"iat": iat}).encode())
    sig = _b64(hmac.new(config.JWT_SECRET.encode(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify_token(token: str) -> bool:
    """Return True iff the token was issued by us and hasn't expired."""
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        expected = _b64(hmac.new(config.JWT_SECRET.encode(), payload_b64.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, sig_b64):
            return False
        payload = json.loads(_unb64(payload_b64))
        age_h = (time.time() - payload["iat"] / 1000) / 3600
        return 0 <= age_h < config.TOKEN_TTL_HOURS
    except Exception:
        return False


def require_auth(request: Request) -> None:
    """FastAPI dependency: 401 unless the request carries a valid Bearer token.

    Kept as a callable dependency rather than middleware so the admin static
    page can be served unauthenticated (the /admin route is client-side; the
    UI itself asks for the key and only then hits protected /api/* routes).
    """
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    if not verify_token(header.split(None, 1)[1].strip()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def check_admin_key(key: str) -> bool:
    """Constant-time comparison against the configured admin key."""
    return hmac.compare_digest(key or "", config.ADMIN_KEY)
