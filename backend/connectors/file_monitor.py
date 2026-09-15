"""File monitor connector — watches a folder for new or updated files.

Uses the ``watchdog`` library (lazy import) to detect file system events
and trigger data ingestion automatically.
"""
from __future__ import annotations

import fnmatch
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

from .base import BaseConnector

logger = logging.getLogger(__name__)

# In-memory registry of active monitors
_MONITORS: dict[str, "_FileMonitor"] = {}


class FileMonitorConnector(BaseConnector):
    connector_type = "file_monitor"
    CONFIG_SCHEMA = [
        {
            "name": "watch_path",
            "label": "Watch Path",
            "type": "text",
            "placeholder": "C:\\exports\\sage300\\  or  /exports/sage300/",
            "help_text": "Absolute path to the folder to monitor for new files.",
            "required": True,
        },
        {
            "name": "file_pattern",
            "label": "File Pattern",
            "type": "text",
            "placeholder": "*.xlsx  or  GL_*.csv",
            "help_text": "Glob pattern to match files. Only matching files will be processed.",
            "required": True,
        },
        {
            "name": "file_type",
            "label": "File Type",
            "type": "select",
            "placeholder": "Select file type",
            "help_text": "What kind of data this folder contains. Determines how files are processed.",
            "required": True,
            "options": [
                {"value": "gl", "label": "General Ledger"},
                {"value": "mapping", "label": "Statement Mapping"},
                {"value": "budget", "label": "Budget"},
                {"value": "account_summary", "label": "Account Summary"},
                {"value": "prior_period", "label": "Prior Period"},
                {"value": "custom", "label": "Custom / Other"},
            ],
        },
        {
            "name": "processing_mode",
            "label": "Processing Mode",
            "type": "select",
            "placeholder": "Select processing mode",
            "help_text": "Auto-import processes files immediately. Notify-only sends an alert for manual review.",
            "required": True,
            "options": [
                {"value": "auto_import", "label": "Auto-Import (process immediately)"},
                {"value": "notify_only", "label": "Notify Only (alert for manual review)"},
            ],
        },
        {
            "name": "file_type_override",
            "label": "Custom File Type Label",
            "type": "text",
            "placeholder": "sage_export",
            "help_text": "If file_type is 'custom', enter a label for this data source.",
            "required": False,
        },
    ]

    def test_connection(self) -> dict:
        """Validate that the watch path exists and is accessible."""
        watch_path = self.config.get("watch_path", "")
        if not watch_path:
            return {"ok": False, "message": "No watch path configured", "schema": [], "row_count": 0}

        path = Path(watch_path)
        if not path.exists():
            return {
                "ok": False,
                "message": f"Path does not exist: {watch_path}",
                "schema": [],
                "row_count": 0,
            }
        if not path.is_dir():
            return {
                "ok": False,
                "message": f"Path is not a directory: {watch_path}",
                "schema": [],
                "row_count": 0,
            }

        pattern = self.config.get("file_pattern", "*")
        matching = list(path.glob(pattern))
        return {
            "ok": True,
            "message": f"Folder accessible — {len(matching)} matching file(s) found",
            "schema": [],
            "row_count": len(matching),
            "tables": [f.name for f in matching[:20]],
        }

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        """Read all matching files and concatenate them into a DataFrame."""
        import pandas as pd

        watch_path = self.config.get("watch_path", "")
        pattern = self.config.get("file_pattern", "*")
        file_type = self.config.get("file_type", "gl")

        path = Path(watch_path)
        if not path.exists():
            raise ValueError(f"Watch path does not exist: {watch_path}")

        matching = sorted(path.glob(pattern))
        if not matching:
            raise ValueError(f"No files matching '{pattern}' in {watch_path}")

        frames = []
        for f in matching:
            try:
                if f.suffix.lower() == ".csv":
                    df = pd.read_csv(f)
                elif f.suffix.lower() in (".xlsx", ".xls"):
                    df = pd.read_excel(f)
                else:
                    logger.warning("Skipping unsupported file type: %s", f.name)
                    continue
                df["_source_file"] = f.name
                frames.append(df)
            except Exception as exc:
                logger.error("Failed to read %s: %s", f.name, exc)

        if not frames:
            raise ValueError("No files could be read")

        combined = pd.concat(frames, ignore_index=True)
        self._set_sync_result(len(combined))
        return combined

    def get_schema(self) -> list[dict]:
        """Read the first matching file and return its column schema."""
        import pandas as pd

        watch_path = self.config.get("watch_path", "")
        pattern = self.config.get("file_pattern", "*")

        path = Path(watch_path)
        if not path.exists():
            return []

        matching = list(path.glob(pattern))
        if not matching:
            return []

        try:
            f = matching[0]
            if f.suffix.lower() == ".csv":
                df = pd.read_csv(f, nrows=5)
            elif f.suffix.lower() in (".xlsx", ".xls"):
                df = pd.read_excel(f, nrows=5)
            else:
                return []
            return [
                {"name": str(c), "type": "string", "nullable": True}
                for c in df.columns
            ]
        except Exception:
            return []

    def start_monitoring(self, callback: Optional[Callable] = None) -> None:
        """Start the file system watcher."""
        if self.connector_id in _MONITORS:
            _MONITORS[self.connector_id].stop()

        monitor = _FileMonitor(self, callback)
        monitor.start()
        _MONITORS[self.connector_id] = monitor
        logger.info("Started file monitor for %s", self.connector_id)

    def stop_monitoring(self) -> None:
        """Stop the file system watcher."""
        monitor = _MONITORS.pop(self.connector_id, None)
        if monitor:
            monitor.stop()
            logger.info("Stopped file monitor for %s", self.connector_id)


class _FileMonitor:
    """Internal watchdog wrapper that monitors a directory."""

    def __init__(self, connector: FileMonitorConnector, callback: Optional[Callable] = None):
        self.connector = connector
        self.callback = callback
        self._observer = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
        except ImportError:
            logger.error("watchdog is not installed. Install with: pip install watchdog")
            return

        watch_path = self.connector.config.get("watch_path", "")
        pattern = self.connector.config.get("file_pattern", "*")

        handler = _EventHandler(self.connector, pattern, self.callback)
        self._observer = Observer()
        self._observer.schedule(handler, watch_path, recursive=False)
        self._thread = threading.Thread(target=self._observer.start, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if self._observer:
            self._observer.stop()
            if self._thread:
                self._thread.join(timeout=5)
            self._observer = None


class _EventHandler:
    """Watchdog event handler that fires on new/modified files."""

    def __init__(
        self,
        connector: FileMonitorConnector,
        pattern: str,
        callback: Optional[Callable] = None,
    ):
        self.connector = connector
        self.pattern = pattern
        self.callback = callback

    def __call__(self):
        from watchdog.events import FileSystemEventHandler

        class Handler(FileSystemEventHandler):
            def __init__(self, outer):
                self.outer = outer

            def on_created(self, event):
                if event.is_directory:
                    return
                self._handle(event.src_path)

            def on_modified(self, event):
                if event.is_directory:
                    return
                self._handle(event.src_path)

            def _handle(self, filepath: str) -> None:
                fname = Path(filepath).name
                if not fnmatch.fnmatch(fname, self.outer.pattern):
                    return
                logger.info("Detected matching file: %s", fname)
                if self.outer.callback:
                    try:
                        self.outer.callback(self.outer.connector.connector_id, filepath)
                    except Exception as exc:
                        logger.error("Monitor callback failed: %s", exc)

        return Handler(self)
