"""Thread-safe JSON-based activity log for admin actions.

Persists to data/activity_log.json. Max 500 entries (oldest auto-pruned).
All writes are append-only with file-level locking for thread safety.
"""
from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

LOG_PATH = Path("data/activity_log.json")
_lock = threading.Lock()
MAX_ENTRIES = 500


def log_event(kind: str, action: str, detail: str = "", metadata: Optional[dict] = None) -> dict:
    """Log an admin activity event.

    kind: "upload" | "restore" | "backup" | "delete" | "sync" | "connector" | "pipeline" | "auth" | "system"
    action: short description (e.g., "File uploaded", "Backup restored")
    detail: longer description
    metadata: optional dict with extra info (file_type, connector_id, job_id, etc.)
    """
    entry = {
        "id": int(time.time() * 1000),
        "kind": kind,
        "action": action,
        "detail": detail,
        "metadata": metadata or {},
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    with _lock:
        _ensure_dir()
        entries = _load()
        entries.insert(0, entry)
        entries = entries[:MAX_ENTRIES]
        _save(entries)
    return entry


def get_logs(limit: int = 50, kind: Optional[str] = None, offset: int = 0) -> list[dict]:
    """Get recent activity logs, optionally filtered by kind."""
    with _lock:
        entries = _load()
    if kind:
        entries = [e for e in entries if e["kind"] == kind]
    return entries[offset:offset + limit]


def get_total_count(kind: Optional[str] = None) -> int:
    """Return total number of log entries, optionally filtered by kind."""
    with _lock:
        entries = _load()
    if kind:
        entries = [e for e in entries if e["kind"] == kind]
    return len(entries)


def get_log_by_id(entry_id: int) -> Optional[dict]:
    """Get a specific log entry by ID."""
    with _lock:
        entries = _load()
    return next((e for e in entries if e["id"] == entry_id), None)


def clear_logs() -> None:
    """Clear all logs (with backup)."""
    with _lock:
        entries = _load()
        if entries:
            backup_path = LOG_PATH.with_suffix(f".backup.{int(time.time())}.json")
            _save(entries, backup_path)
        _save([])


def _ensure_dir() -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load() -> list[dict]:
    if LOG_PATH.exists():
        try:
            return json.loads(LOG_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return []
    return []


def _save(entries: list[dict], path: Optional[Path] = None) -> None:
    (path or LOG_PATH).write_text(json.dumps(entries, indent=2, default=str), encoding="utf-8")
