"""Abstract base class for all data-source connectors.

Every connector (SQL, REST API, ERP, ODBC, File Monitor) inherits from
BaseConnector and implements its own ``test_connection``, ``fetch_data``,
and ``get_schema`` methods.  The base class provides default
implementations for ``clean_data``, ``get_status``, and the common
``CONFIG_SCHEMA`` / ``connector_type`` contract.
"""
from __future__ import annotations

import abc
import logging
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd

logger = logging.getLogger(__name__)


class BaseConnector(abc.ABC):
    """Abstract base all connectors must subclass."""

    # Subclasses MUST override these two
    connector_type: str = ""
    CONFIG_SCHEMA: list[dict[str, Any]] = []

    def __init__(self, connector_id: str, config: dict[str, Any]) -> None:
        self.connector_id = connector_id
        self.config = config
        self._last_sync: Optional[str] = None
        self._next_sync: Optional[str] = None
        self._row_count: int = 0
        self._error: Optional[str] = None

    # ── Required abstract methods ─────────────────────────────────────

    @abc.abstractmethod
    def test_connection(self) -> dict:
        """Validate connectivity to the source.

        Returns::

            {
                "ok": True/False,
                "message": "Connection successful" | "Error: ...",
                "schema": [...],          # list of {name, type, nullable}
                "row_count": 12345,       # total rows visible
                "tables": [...],          # optional: list of tables/endpoints
            }
        """
        ...

    @abc.abstractmethod
    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        """Pull raw data from the source and return a DataFrame.

        *params* is source-specific (e.g. date range, table name, SQL query).
        """
        ...

    @abc.abstractmethod
    def get_schema(self) -> list[dict]:
        """Return the schema (column names + types) of the source data."""
        ...

    # ── Default implementations ───────────────────────────────────────

    def clean_data(
        self,
        df: pd.DataFrame,
        rules: Optional[dict] = None,
    ) -> tuple[pd.DataFrame, list[dict]]:
        """Apply auto-clean rules.  Returns (cleaned_df, change_log).

        Subclasses may override to add source-specific cleaning.
        """
        from .cleaner import run_all_cleaners

        mapping_df = self._load_mapping_df()
        cleaned, log = run_all_cleaners(df, mapping_df, rules or {})
        return cleaned, log

    def get_status(self) -> dict:
        """Current connector status for the admin UI."""
        return {
            "connector_id": self.connector_id,
            "connector_type": self.connector_type,
            "last_sync": self._last_sync,
            "next_sync": self._next_sync,
            "row_count": self._row_count,
            "error": self._error,
        }

    # ── Helpers ───────────────────────────────────────────────────────

    def _load_mapping_df(self) -> Optional[pd.DataFrame]:
        """Try to load the current statement_mapping as a DataFrame."""
        try:
            from .. import config

            mapping_path = config.CURRENT_DIR / "statement_mapping.xlsx"
            if mapping_path.exists():
                return pd.read_excel(mapping_path)
        except Exception:
            pass
        return None

    def _set_sync_result(self, row_count: int, error: Optional[str] = None) -> None:
        self._row_count = row_count
        self._last_sync = datetime.now(timezone.utc).isoformat()
        self._error = error

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id={self.connector_id!r}>"
