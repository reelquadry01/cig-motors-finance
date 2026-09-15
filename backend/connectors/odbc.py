"""ODBC/JDBC connector for legacy data sources.

Uses pyodbc with a lazy import so the app starts even when pyodbc
isn't installed.  Supports building connection strings from individual
components or using a raw connection string.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import pandas as pd

from .base import BaseConnector

logger = logging.getLogger(__name__)


class ODBCConnector(BaseConnector):
    connector_type = "odbc"
    CONFIG_SCHEMA = [
        {
            "name": "connection_string",
            "label": "Connection String",
            "type": "text",
            "placeholder": "DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=mydb;UID=user;PWD=pass",
            "help_text": "Full ODBC connection string. If provided, the individual fields below are ignored.",
            "required": False,
        },
        {
            "name": "driver",
            "label": "ODBC Driver",
            "type": "text",
            "placeholder": "ODBC Driver 17 for SQL Server",
            "help_text": "The ODBC driver name installed on the system. Run `odbcinst -q -d` to list available drivers.",
            "required": False,
        },
        {
            "name": "server",
            "label": "Server",
            "type": "text",
            "placeholder": "localhost\\SQLEXPRESS",
            "help_text": "Server hostname or IP. For named instances use server\\instance format.",
            "required": False,
        },
        {
            "name": "database",
            "label": "Database",
            "type": "text",
            "placeholder": "production_db",
            "help_text": "The database name to connect to.",
            "required": False,
        },
        {
            "name": "uid",
            "label": "Username",
            "type": "text",
            "placeholder": "db_user",
            "help_text": "Database username.",
            "required": False,
        },
        {
            "name": "pwd",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "help_text": "Database password. Stored encrypted.",
            "required": False,
        },
        {
            "name": "table_or_query",
            "label": "Table Name or SQL Query",
            "type": "textarea",
            "placeholder": "dbo.gl_transactions  -- or --  SELECT * FROM gl_transactions",
            "help_text": "Enter a table name or a custom SQL query to pull data.",
            "required": True,
        },
        {
            "name": "column_mapping",
            "label": "Column Mapping (JSON)",
            "type": "json",
            "placeholder": '{"GL_Code": "account_number", "Debit": "dr_amount", "Credit": "cr_amount"}',
            "help_text": "Map source columns to pipeline format. Leave empty to use columns as-is.",
            "required": False,
        },
    ]

    def _build_connection_string(self) -> str:
        """Build ODBC connection string from config components."""
        raw = self.config.get("connection_string", "").strip()
        if raw:
            return raw

        parts = []
        driver = self.config.get("driver", "")
        if driver:
            parts.append(f"DRIVER={{{driver}}}")
        server = self.config.get("server", "")
        if server:
            parts.append(f"SERVER={server}")
        database = self.config.get("database", "")
        if database:
            parts.append(f"DATABASE={database}")
        uid = self.config.get("uid", "")
        if uid:
            parts.append(f"UID={uid}")
        pwd = self.config.get("pwd", "")
        if pwd:
            parts.append(f"PWD={pwd}")

        return ";".join(parts)

    def test_connection(self) -> dict:
        """Validate connectivity by running a simple query."""
        try:
            import pyodbc
        except ImportError:
            return {
                "ok": False,
                "message": "pyodbc is not installed. Install with: pip install pyodbc",
                "schema": [],
                "row_count": 0,
            }

        conn_str = self._build_connection_string()
        if not conn_str:
            return {
                "ok": False,
                "message": "No connection string provided",
                "schema": [],
                "row_count": 0,
            }

        try:
            conn = pyodbc.connect(conn_str, timeout=10)
            cursor = conn.cursor()

            # Test basic connectivity
            cursor.execute("SELECT 1")

            # Get row count for the configured table/query
            row_count = self._get_row_count(cursor)

            # Try to get column info
            table_or_query = self.config.get("table_or_query", "")
            schema = []
            if table_or_query and not table_or_query.strip().upper().startswith("SELECT"):
                try:
                    cursor.execute(f"SELECT TOP 0 * FROM {table_or_query}")
                    schema = [
                        {"name": desc[0], "type": str(desc[1]), "nullable": desc[6]}
                        for desc in cursor.description or []
                    ]
                except Exception:
                    pass

            cursor.close()
            conn.close()

            return {
                "ok": True,
                "message": "ODBC connection successful",
                "schema": schema,
                "row_count": row_count,
                "tables": [],
            }
        except Exception as exc:
            return {
                "ok": False,
                "message": f"ODBC connection failed: {exc}",
                "schema": [],
                "row_count": 0,
            }

    def _get_row_count(self, cursor) -> int:
        table_or_query = self.config.get("table_or_query", "")
        if not table_or_query:
            return 0
        try:
            stripped = table_or_query.strip()
            if stripped.upper().startswith("SELECT"):
                cursor.execute(f"SELECT COUNT(*) FROM ({stripped}) AS _subq")
            else:
                cursor.execute(f"SELECT COUNT(*) FROM {stripped}")
            row = cursor.fetchone()
            return int(row[0]) if row else 0
        except Exception:
            return 0

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        """Fetch data via ODBC."""
        try:
            import pyodbc
        except ImportError:
            raise ImportError("pyodbc is not installed. Install with: pip install pyodbc")

        conn_str = self._build_connection_string()
        table_or_query = self.config.get("table_or_query", "")
        if not table_or_query:
            raise ValueError("No table or query specified")

        stripped = table_or_query.strip()
        if stripped.upper().startswith("SELECT"):
            sql = stripped
        else:
            sql = f"SELECT * FROM {stripped}"

        if params and "last_sync_date" in params:
            date_col = params.get("date_column", "date")
            last_sync = params["last_sync_date"]
            if "WHERE" in sql.upper():
                sql += f" AND {date_col} >= '{last_sync}'"
            else:
                sql += f" WHERE {date_col} >= '{last_sync}'"

        conn = pyodbc.connect(conn_str, timeout=30)
        df = pd.read_sql(sql, conn)
        conn.close()

        col_map = self.config.get("column_mapping")
        if col_map and isinstance(col_map, dict):
            df = df.rename(columns=col_map)

        self._set_sync_result(len(df))
        return df

    def get_schema(self) -> list[dict]:
        """Return schema of the configured table."""
        try:
            import pyodbc
        except ImportError:
            return []

        table_or_query = self.config.get("table_or_query", "")
        if not table_or_query or table_or_query.strip().upper().startswith("SELECT"):
            return []

        try:
            conn = pyodbc.connect(self._build_connection_string(), timeout=10)
            cursor = conn.cursor()
            cursor.execute(f"SELECT TOP 0 * FROM {table_or_query}")
            schema = [
                {"name": desc[0], "type": str(desc[1]), "nullable": desc[6]}
                for desc in cursor.description or []
            ]
            cursor.close()
            conn.close()
            return schema
        except Exception as exc:
            logger.warning("Could not get ODBC schema: %s", exc)
            return []
