"""GitHub-backed persistent storage for settings and data files.

Uses the GitHub Contents API to read/write files in the repo.
This ensures settings persist across Render restarts/deploys.

Requires GITHUB_TOKEN env var with repo write access.
"""
from __future__ import annotations

import base64
import json
import logging
import os
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)

REPO = os.environ.get("GITHUB_REPO", "reelquadry01/cig-motors-finance")
BRANCH = os.environ.get("GITHUB_BRANCH", "master")
TOKEN = os.environ.get("GITHUB_TOKEN", "")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }


def _api(path: str) -> str:
    return f"https://api.github.com/repos/{REPO}/contents/{path}"


def is_configured() -> bool:
    """Check if GitHub storage is available."""
    return bool(TOKEN)


def read_file(path: str) -> Optional[dict[str, Any]]:
    """Read a file from GitHub repo. Returns dict with 'content' (str) and 'sha' (str)."""
    if not TOKEN:
        return None
    try:
        r = requests.get(_api(path), headers=_headers(),
                         params={"ref": BRANCH}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return {"content": content, "sha": data["sha"]}
        elif r.status_code == 404:
            return None
        else:
            logger.warning("GitHub read failed for %s: %s %s", path, r.status_code, r.text[:200])
            return None
    except Exception as e:
        logger.warning("GitHub read error for %s: %s", path, e)
        return None


def write_file(path: str, content: str, message: str, sha: Optional[str] = None) -> bool:
    """Write a file to GitHub repo. If sha is provided, updates existing file; otherwise creates new."""
    if not TOKEN:
        return False
    try:
        payload: dict[str, Any] = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": BRANCH,
        }
        if sha:
            payload["sha"] = sha

        r = requests.put(_api(path), headers=_headers(),
                         json=payload, timeout=15)
        if r.status_code in (200, 201):
            return True
        else:
            logger.warning("GitHub write failed for %s: %s %s", path, r.status_code, r.text[:200])
            return False
    except Exception as e:
        logger.warning("GitHub write error for %s: %s", path, e)
        return False


def read_json(path: str) -> Optional[dict[str, Any]]:
    """Read a JSON file from GitHub repo."""
    result = read_file(path)
    if result:
        try:
            return json.loads(result["content"])
        except Exception:
            return None
    return None


def write_json(path: str, data: dict[str, Any], message: str) -> bool:
    """Write a JSON file to GitHub repo. Preserves existing sha if file exists."""
    existing = read_file(path)
    sha = existing["sha"] if existing else None
    content = json.dumps(data, indent=2, ensure_ascii=False)
    return write_file(path, content, message, sha=sha)


def read_settings() -> Optional[dict[str, Any]]:
    """Read settings.json from GitHub repo."""
    return read_json("data/settings.json")


def write_settings(data: dict[str, Any]) -> bool:
    """Write settings.json to GitHub repo."""
    return write_json("data/settings.json", data, "chore: update company settings via admin")
