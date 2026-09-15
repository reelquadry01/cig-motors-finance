"""SQL database connector — MySQL, PostgreSQL, SQL Server, MariaDB, Oracle.

Uses SQLAlchemy for connection management with lazy imports so missing
database drivers don't crash the app at startup.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import pandas as pd

from .base import BaseConnector

logger = logging.getLogger(__name__)

_PORT_DEFAULTS = {
    "mysql": 3306,
    "postgresql": 5432,
    "sqlserver": 1433,
    "mariadb": 3306,
    "oracle": 1521,
}

_DIALECTS = {
    "mysql": "mysql+pymysql",
    "postgresql": "postgresql+psycopg2",
    "sqlserver": "mssql+pyodbc",
    "mariadb": "mariadb+pymysql",
    "oracle": "oracle+cx_oracle",
}


class SQLConnector(BaseConnector):
    connector_type = "sql"
    CONFIG_SCHEMA = [
        {
            "name": "db_type",
            "label": "Database Type",
            "type": "select",
            "placeholder": "Select database type",
            "help_text": "Choose the type of database you want to connect to.",
            "required": True,
            "options": [
                {"value": "mysql", "label": "MySQL"},
                {"value": "postgresql", "label": "PostgreSQL"},
                {"value": "sqlserver", "label": "SQL Server"},
                {"value": "mariadb", "label": "MariaDB"},
                {"value": "oracle", "label": "Oracle"},
            ],
        },
        {
            "name": "host",
            "label": "Host",
            "type": "text",
            "placeholder": "localhost",
            "help_text": "The hostname or IP address of the database server.",
            "required": True,
        },
        {
            "name": "port",
            "label": "Port",
            "type": "number",
            "placeholder": "Auto-filled based on database type",
            "help_text": "Port number. Auto-fills when you select a database type.",
            "required": False,
        },
        {
            "name": "database",
            "label": "Database Name",
            "type": "text",
            "placeholder": "production_db",
            "help_text": "The name of the database to connect to. For Oracle, this is the Service Name.",
            "required": True,
        },
        {
            "name": "username",
            "label": "Username",
            "type": "text",
            "placeholder": "readonly_user",
            "help_text": "Database username. Use a read-only account for safety.",
            "required": True,
        },
        {
            "name": "password",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "help_text": "Database password. Stored encrypted — never saved in plain text.",
            "required": True,
        },
        {
            "name": "table_or_query",
            "label": "Table Name or SQL Query",
            "type": "textarea",
            "placeholder": "gl_transactions  -- or --  SELECT * FROM gl WHERE date >= '2026-01-01'",
            "help_text": "Enter a table name to pull all rows, or a custom SQL query for selective data.",
            "required": True,
        },
        {
            "name": "column_mapping",
            "label": "Column Mapping (JSON)",
            "type": "json",
            "placeholder": '{"GL_Code": "account_number", "Debit": "dr_amount", "Credit": "cr_amount"}',
            "help_text": "Map your source columns to the pipeline format: GL_Code, GL_Account, Doc_Date, Debit, Credit, Reference, Narration. Leave empty to auto-detect.",
            "required": False,
        },
    ]

    def _build_connection_string(self) -> str:
        """Build SQLAlchemy connection URL from config."""
        db_type = self.config.get("db_type", "mysql")
        host = self.config.get("host", "localhost")
        port = self.config.get("port") or _PORT_DEFAULTS.get(db_type, 3306)
        database = self.config.get("database", "")
        username = self.config.get("username", "")
        password = self.config.get("password", "")

        dialect = _DIALECTS.get(db_type, "mysql+pymysql")

        if db_type == "sqlserver":
            return f"{dialect}://{username}:{password}@{host}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server"
        if db_type == "oracle":
            return f"{dialect}://{username}:{password}@{host}:{port}/{database}"
        return f"{dialect}://{username}:{password}@{host}:{port}/{database}"

    def test_connection(self) -> dict:
        """Validate connectivity: run SELECT 1, then list tables."""
        try:
            from sqlalchemy import create_engine, text

            engine = create_engine(self._build_connection_string(), pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            # List tables
            db_type = self.config.get("db_type", "mysql")
            tables = []
            with engine.connect() as conn:
                if db_type in ("mysql", "mariadb"):
                    rows = conn.execute(text("SHOW TABLES")).fetchall()
                    tables = [r[0] for r in rows]
                elif db_type == "postgresql":
                    rows = conn.execute(
                        text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")
                    ).fetchall()
                    tables = [r[0] for r in rows]
                elif db_type == "sqlserver":
                    rows = conn.execute(
                        text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
                    ).fetchall()
                    tables = [r[0] for r in rows]
                elif db_type == "oracle":
                    rows = conn.execute(
                        text("SELECT table_name FROM user_tables ORDER BY table_name")
                    ).fetchall()
                    tables = [r[0] for r in rows]

            # Try to get row count for the specified table/query
            row_count = self._get_row_count(engine)

            engine.dispose()
            return {
                "ok": True,
                "message": f"Connected to {self.config.get('database')} — {len(tables)} table(s) found",
                "schema": [],
                "row_count": row_count,
                "tables": tables,
            }
        except ImportError as exc:
            return {
                "ok": False,
                "message": f"Missing database driver: {exc}. Install with: pip install pymysql psycopg2-binary pyodbc",
                "schema": [],
                "row_count": 0,
                "tables": [],
            }
        except Exception as exc:
            return {
                "ok": False,
                "message": f"Connection failed: {exc}",
                "schema": [],
                "row_count": 0,
                "tables": [],
            }

    def _get_row_count(self, engine) -> int:
        """Get row count for the configured table or query."""
        from sqlalchemy import text

        table_or_query = self.config.get("table_or_query", "")
        if not table_or_query:
            return 0
        try:
            with engine.connect() as conn:
                # Check if it's a raw SQL query or a table name
                stripped = table_or_query.strip()
                if stripped.upper().startswith("SELECT"):
                    count_sql = text(f"SELECT COUNT(*) FROM ({stripped}) AS _subq")
                else:
                    count_sql = text(f"SELECT COUNT(*) FROM {stripped}")
                result = conn.execute(count_sql).scalar()
                return int(result or 0)
        except Exception:
            return 0

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        """Fetch data from the configured table or query."""
        from sqlalchemy import create_engine, text

        engine = create_engine(self._build_connection_string(), pool_pre_ping=True)
        table_or_query = self.config.get("table_or_query", "")

        if not table_or_query:
            engine.dispose()
            raise ValueError("No table or query specified")

        stripped = table_or_query.strip()
        if stripped.upper().startswith("SELECT"):
            sql = stripped
        else:
            sql = f"SELECT * FROM {stripped}"

        # Apply date filter if params include last_sync
        if params and "last_sync_date" in params:
            date_col = params.get("date_column", "date")
            last_sync = params["last_sync_date"]
            if "WHERE" in sql.upper():
                sql += f" AND {date_col} >= '{last_sync}'"
            else:
                sql += f" WHERE {date_col} >= '{last_sync}'"

        df = pd.read_sql(text(sql), engine)
        engine.dispose()

        # Apply column mapping if specified
        col_map = self.config.get("column_mapping")
        if col_map and isinstance(col_map, dict):
            df = df.rename(columns=col_map)

        self._set_sync_result(len(df))
        return df

    def get_schema(self) -> list[dict]:
        """Return the schema of the configured table."""
        try:
            from sqlalchemy import create_engine, text, inspect

            engine = create_engine(self._build_connection_string(), pool_pre_ping=True)
            insp = inspect(engine)

            table_or_query = self.config.get("table_or_query", "")
            if not table_or_query or table_or_query.strip().upper().startswith("SELECT"):
                engine.dispose()
                return []

            # Get columns from the table
            columns = insp.get_columns(table_or_query.strip())
            schema = [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                }
                for col in columns
            ]
            engine.dispose()
            return schema
        except Exception as exc:
            logger.warning("Could not get schema: %s", exc)
            return []
