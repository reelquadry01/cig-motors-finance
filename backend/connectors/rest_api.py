"""Generic REST API connector.

Supports any JSON or CSV endpoint with configurable auth, pagination,
and response path extraction.  Useful for ERP systems not covered by
dedicated connectors.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional
from urllib.parse import urljoin, urlencode

import pandas as pd
import requests

from .base import BaseConnector

logger = logging.getLogger(__name__)


class RestApiConnector(BaseConnector):
    connector_type = "rest_api"
    CONFIG_SCHEMA = [
        {
            "name": "base_url",
            "label": "Base URL",
            "type": "text",
            "placeholder": "https://api.example.com/v1",
            "help_text": "The root URL of the API. Endpoint paths will be appended to this.",
            "required": True,
        },
        {
            "name": "auth_type",
            "label": "Authentication Type",
            "type": "select",
            "placeholder": "Select auth type",
            "help_text": "How the API authenticates requests. Check the API documentation.",
            "required": True,
            "options": [
                {"value": "none", "label": "No Authentication"},
                {"value": "bearer", "label": "Bearer Token"},
                {"value": "api_key", "label": "API Key"},
                {"value": "basic", "label": "Basic Auth (Username/Password)"},
                {"value": "oauth2", "label": "OAuth2"},
            ],
        },
        {
            "name": "api_key",
            "label": "API Key / Token",
            "type": "password",
            "placeholder": "••••••••",
            "help_text": "Bearer token or API key value. Stored encrypted.",
            "required": False,
        },
        {
            "name": "username",
            "label": "Username (Basic Auth)",
            "type": "text",
            "placeholder": "api_user",
            "help_text": "Username for Basic Authentication.",
            "required": False,
        },
        {
            "name": "api_password",
            "label": "Password (Basic Auth)",
            "type": "password",
            "placeholder": "••••••••",
            "help_text": "Password for Basic Authentication. Stored encrypted.",
            "required": False,
        },
        {
            "name": "endpoints",
            "label": "Endpoints (JSON)",
            "type": "json",
            "placeholder": '{"transactions": "/gl/transactions", "accounts": "/gl/accounts"}',
            "help_text": "JSON object mapping logical names to API endpoint paths.",
            "required": True,
        },
        {
            "name": "pagination_type",
            "label": "Pagination Type",
            "type": "select",
            "placeholder": "Select pagination type",
            "help_text": "How the API paginates through large result sets.",
            "required": False,
            "options": [
                {"value": "none", "label": "No Pagination"},
                {"value": "offset", "label": "Offset-based (?offset=0&limit=100)"},
                {"value": "cursor", "label": "Cursor-based (?cursor=abc&limit=100)"},
                {"value": "link_header", "label": "Link Header (RFC 5988)"},
            ],
        },
        {
            "name": "page_size",
            "label": "Page Size",
            "type": "number",
            "placeholder": "100",
            "help_text": "Number of records per page for paginated requests.",
            "required": False,
        },
        {
            "name": "response_path",
            "label": "Response Data Path",
            "type": "text",
            "placeholder": "$.data.transactions",
            "help_text": "JSON path to the array of records in the response. Use dot notation: $.data.results",
            "required": False,
        },
        {
            "name": "headers",
            "label": "Custom Headers (JSON)",
            "type": "json",
            "placeholder": '{"X-Custom-Header": "value"}',
            "help_text": "Additional HTTP headers to send with each request.",
            "required": False,
        },
    ]

    def _build_headers(self) -> dict:
        """Build request headers based on auth config."""
        headers = {"Accept": "application/json"}
        headers.update(self.config.get("headers", {}))

        auth_type = self.config.get("auth_type", "none")
        api_key = self.config.get("api_key", "")

        if auth_type == "bearer" and api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        elif auth_type == "api_key" and api_key:
            headers["X-API-Key"] = api_key

        return headers

    def _get_auth(self) -> Optional[tuple]:
        """Build requests auth tuple for Basic Auth."""
        if self.config.get("auth_type") == "basic":
            username = self.config.get("username", "")
            password = self.config.get("api_password", "")
            if username and password:
                return (username, password)
        return None

    def test_connection(self) -> dict:
        """Hit the base URL or health endpoint to validate connectivity."""
        base_url = self.config.get("base_url", "").rstrip("/")
        if not base_url:
            return {"ok": False, "message": "No base URL configured", "schema": [], "row_count": 0}

        try:
            url = f"{base_url}/health"
            resp = requests.get(
                url,
                headers=self._build_headers(),
                auth=self._get_auth(),
                timeout=10,
            )
            if resp.status_code == 404:
                # Try root endpoint
                url = base_url
                resp = requests.get(
                    url,
                    headers=self._build_headers(),
                    auth=self._get_auth(),
                    timeout=10,
                )

            if resp.status_code < 400:
                try:
                    body = resp.json()
                    sample_keys = list(body.keys())[:20] if isinstance(body, dict) else []
                except Exception:
                    sample_keys = []

                # Try fetching first endpoint to get row count
                row_count = self._test_endpoint_count()

                return {
                    "ok": True,
                    "message": f"API responded with status {resp.status_code}",
                    "schema": [{"name": k, "type": "string"} for k in sample_keys],
                    "row_count": row_count,
                    "tables": list(self.config.get("endpoints", {}).keys()),
                }
            return {
                "ok": False,
                "message": f"API returned status {resp.status_code}: {resp.text[:200]}",
                "schema": [],
                "row_count": 0,
            }
        except requests.ConnectionError:
            return {"ok": False, "message": f"Could not connect to {base_url}", "schema": [], "row_count": 0}
        except requests.Timeout:
            return {"ok": False, "message": f"Connection timed out to {base_url}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Error: {exc}", "schema": [], "row_count": 0}

    def _test_endpoint_count(self) -> int:
        """Try to fetch first endpoint and count records."""
        try:
            endpoints = self.config.get("endpoints", {})
            if not endpoints:
                return 0
            first_key = next(iter(endpoints))
            first_path = endpoints[first_key]
            data = self._fetch_endpoint(first_path, max_pages=1)
            return len(data) if isinstance(data, list) else 0
        except Exception:
            return 0

    def _fetch_endpoint(
        self,
        path: str,
        max_pages: int = 100,
    ) -> list[dict]:
        """Fetch all pages from an endpoint path."""
        base_url = self.config.get("base_url", "").rstrip("/")
        url = f"{base_url}{path}" if path.startswith("/") else f"{base_url}/{path}"
        headers = self._build_headers()
        auth = self._get_auth()
        page_size = int(self.config.get("page_size") or 100)
        pagination_type = self.config.get("pagination_type", "none")

        all_records: list[dict] = []
        page = 0

        while page < max_pages:
            params = {}
            if pagination_type == "offset":
                params["offset"] = page * page_size
                params["limit"] = page_size
            elif pagination_type == "cursor" and page > 0:
                params["cursor"] = next_cursor
                params["limit"] = page_size

            resp = requests.get(url, headers=headers, auth=auth, params=params, timeout=30)
            resp.raise_for_status()

            # Extract records from response
            data = resp.json()
            records = self._extract_records(data)
            if not records:
                break
            all_records.extend(records)

            # Pagination: cursor
            if pagination_type == "cursor":
                next_cursor = data.get("next_cursor") or data.get("cursor")
                if not next_cursor:
                    break

            # Pagination: link header
            if pagination_type == "link_header":
                link_header = resp.headers.get("Link", "")
                next_url = self._parse_link_header(link_header)
                if not next_url:
                    break
                url = next_url

            # Pagination: offset (stop when page is smaller than page_size)
            if pagination_type == "offset" and len(records) < page_size:
                break

            # No pagination — stop after first page
            if pagination_type == "none":
                break

            page += 1

        return all_records

    def _extract_records(self, data: Any) -> list[dict]:
        """Navigate response_path to extract the array of records."""
        response_path = self.config.get("response_path", "")
        if not response_path:
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                # Try common keys
                for key in ("data", "results", "items", "records", "rows"):
                    if key in data and isinstance(data[key], list):
                        return data[key]
            return []

        # Navigate dot-notation path
        current = data
        for part in response_path.split("."):
            part = part.strip()
            if not part:
                continue
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                idx = int(part)
                current = current[idx] if idx < len(current) else None
            else:
                return []
            if current is None:
                return []

        return current if isinstance(current, list) else []

    @staticmethod
    def _parse_link_header(header: str) -> Optional[str]:
        """Parse RFC 5988 Link header for next URL."""
        if not header:
            return None
        for part in header.split(","):
            if 'rel="next"' in part:
                url = part.split(";")[0].strip().strip("<>")
                return url
        return None

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        """Fetch data from the first configured endpoint."""
        endpoints = self.config.get("endpoints", {})
        if not endpoints:
            raise ValueError("No endpoints configured")

        # Use specified endpoint or first one
        endpoint_name = (params or {}).get("endpoint", next(iter(endpoints)))
        path = endpoints.get(endpoint_name, endpoints.get(next(iter(endpoints))))

        records = self._fetch_endpoint(path)
        df = pd.DataFrame(records)
        self._set_sync_result(len(df))
        return df

    def get_schema(self) -> list[dict]:
        """Return schema by fetching first record."""
        endpoints = self.config.get("endpoints", {})
        if not endpoints:
            return []

        try:
            path = next(iter(endpoints.values()))
            records = self._fetch_endpoint(path, max_pages=1)
            if records and isinstance(records[0], dict):
                return [
                    {"name": k, "type": type(v).__name__, "nullable": True}
                    for k, v in records[0].items()
                ]
        except Exception as exc:
            logger.warning("Could not get schema: %s", exc)
        return []
