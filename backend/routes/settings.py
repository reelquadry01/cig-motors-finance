"""GET/PUT /api/settings — company profile (name, logo, colors, currency).

Persistence strategy (4 tiers, checked in order):
  1. SETTINGS_JSON env var — survives Render restarts/deploys
  2. GitHub repo (data/settings.json) — survives everything if GITHUB_TOKEN is set
  3. Local file (data/settings.json) — survives within a session
  4. Hardcoded defaults

On save, we write to tiers 1+2+3 (all available).
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.activity_log import log_event
from ..services import github_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).parent.parent.parent / "data" / "settings.json"

DEFAULTS: dict[str, Any] = {
    "company_name": "CIG Motors Co. Ltd.",
    "company_short_name": "CIG Motors",
    "industry": "Automotive",
    "currency_code": "NGN",
    "currency_symbol": "\u20a6",
    "currency_name": "Nigerian Naira",
    "primary_color": "#c8102e",
    "secondary_color": "#1f3a5f",
    "logo_url": "",
    "tagline": "Monthly management report",
}


def _load() -> dict[str, Any]:
    # Tier 1: env var (survives Render restarts)
    env_val = os.environ.get("SETTINGS_JSON", "").strip()
    if env_val:
        try:
            return {**DEFAULTS, **json.loads(env_val)}
        except Exception:
            logger.warning("SETTINGS_JSON env var is not valid JSON, falling back")

    # Tier 2: GitHub repo (survives everything)
    if github_storage.is_configured():
        try:
            gh = github_storage.read_settings()
            if gh:
                return {**DEFAULTS, **gh}
        except Exception:
            logger.warning("GitHub read failed, falling back")

    # Tier 3: local file (survives within session)
    if SETTINGS_FILE.exists():
        try:
            return {**DEFAULTS, **json.loads(SETTINGS_FILE.read_text("utf-8"))}
        except Exception:
            pass

    # Tier 4: defaults
    return dict(DEFAULTS)


def _save(data: dict[str, Any]) -> None:
    # Write to local file
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), "utf-8")

    # Update in-memory env var so the current process picks it up
    os.environ["SETTINGS_JSON"] = json.dumps(data, ensure_ascii=False)

    # Write to GitHub for persistence across restarts
    if github_storage.is_configured():
        try:
            github_storage.write_settings(data)
        except Exception:
            logger.warning("GitHub write failed — settings saved locally only")


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_short_name: Optional[str] = None
    industry: Optional[str] = None
    currency_code: Optional[str] = None
    currency_symbol: Optional[str] = None
    currency_name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    tagline: Optional[str] = None


@router.get("")
def get_settings() -> dict[str, Any]:
    """Return current company settings (public — no auth needed)."""
    result = _load()
    result["_github_configured"] = github_storage.is_configured()
    return result


@router.put("")
def update_settings(body: SettingsUpdate) -> dict[str, Any]:
    """Update company settings and persist to all available stores."""
    current = _load()
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    current.update(updates)
    _save(current)
    log_event("settings", "Company settings updated", "", {"fields": list(updates.keys())})
    return current
