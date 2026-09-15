"""Data-source connector package.

Provides pluggable connectors for SQL databases, REST APIs, ERP systems,
ODBC/JDBC sources, and file monitors.  All connectors share a common
``BaseConnector`` interface and support credential encryption, auto-cleaning,
and financial integrity validation.

Usage::

    from backend.connectors import get_connector_class, registry

    # List configured connectors
    connectors = registry.list_connectors()

    # Instantiate a connector
    cls = get_connector_class("sql")
    conn = cls("sql_001", {"db_type": "mysql", "host": "localhost", ...})

    # Test and fetch
    result = conn.test_connection()
    df = conn.fetch_data()
"""
from __future__ import annotations

from typing import Any

from .base import BaseConnector
from .sql import SQLConnector
from .rest_api import RestApiConnector
from .odbc import ODBCConnector
from .file_monitor import FileMonitorConnector
from .erp import (
    Sage300Connector,
    SAPB1Connector,
    NetSuiteConnector,
    Dynamics365Connector,
    QuickBooksConnector,
    XeroConnector,
    OdooConnector,
    Sage50Connector,
    EpicorConnector,
    InforConnector,
    ERP_CONNECTOR_MAP,
    ERP_GALLERY,
)

# All built-in connector classes keyed by type string
_CONNECTOR_MAP: dict[str, type[BaseConnector]] = {
    "sql": SQLConnector,
    "rest_api": RestApiConnector,
    "odbc": ODBCConnector,
    "file_monitor": FileMonitorConnector,
    **ERP_CONNECTOR_MAP,
}


def get_connector_class(connector_type: str) -> type[BaseConnector] | None:
    """Look up a connector class by type string."""
    return _CONNECTOR_MAP.get(connector_type)


def list_connector_types() -> list[dict]:
    """Return metadata for all available connector types (for the GUI wizard)."""
    types = []
    for type_str, cls in _CONNECTOR_MAP.items():
        types.append({
            "type": type_str,
            "name": cls.__name__.replace("Connector", ""),
            "config_schema": cls.CONFIG_SCHEMA,
        })
    return types


__all__ = [
    "BaseConnector",
    "SQLConnector",
    "RestApiConnector",
    "ODBCConnector",
    "FileMonitorConnector",
    "Sage300Connector",
    "SAPB1Connector",
    "NetSuiteConnector",
    "Dynamics365Connector",
    "QuickBooksConnector",
    "XeroConnector",
    "OdooConnector",
    "Sage50Connector",
    "EpicorConnector",
    "InforConnector",
    "get_connector_class",
    "list_connector_types",
    "ERP_CONNECTOR_MAP",
    "ERP_GALLERY",
]
