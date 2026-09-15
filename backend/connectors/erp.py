"""Pre-configured ERP connectors.

Each ERP system gets a dedicated connector class with pre-mapped fields,
auth setup, and documentation links.  All extend BaseConnector with
ERP-specific CONFIG_SCHEMA and helper methods.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import pandas as pd

from .base import BaseConnector

logger = logging.getLogger(__name__)


def _erp_field(
    name: str,
    label: str,
    field_type: str = "text",
    placeholder: str = "",
    help_text: str = "",
    required: bool = True,
    options: Optional[list] = None,
) -> dict:
    return {
        "name": name,
        "label": label,
        "type": field_type,
        "placeholder": placeholder,
        "help_text": help_text,
        "required": required,
        **(({"options": options}) if options else {}),
    }


# ─────────────────────────────────────────────────────────────────────
# Sage 300
# ─────────────────────────────────────────────────────────────────────

class Sage300Connector(BaseConnector):
    connector_type = "sage300"
    CONFIG_SCHEMA = [
        _erp_field("company_db", "Company Database", "text", "SAGEM sample",
                   "The Sage 300 company database name. Found in Database Setup."),
        _erp_field("client_id", "Client ID", "text", "sage300-api-client",
                   "OAuth2 client ID from Sage 300 API Administration."),
        _erp_field("client_secret", "Client Secret", "password", "",
                   "OAuth2 client secret. Stored encrypted.", True),
        _erp_field("base_url", "Base URL", "text", "https://sage300.example.com/SageTimeSheet/api/v1/",
                   "Sage 300 API base URL. Typically: https://<server>/Sage<Module>/api/v1/"),
        _erp_field("fiscal_year", "Fiscal Year", "text", "2026",
                   "Current fiscal year for data retrieval."),
        _erp_field("modules", "Modules to Sync", "textarea",
                   "GL,AP,AR",
                   "Comma-separated list of Sage 300 modules to pull data from."),
    ]

    def test_connection(self) -> dict:
        base_url = self.config.get("base_url", "").rstrip("/")
        if not base_url:
            return {"ok": False, "message": "No base URL configured", "schema": [], "row_count": 0}
        try:
            import requests
            resp = requests.get(f"{base_url}/help", timeout=10)
            if resp.status_code < 400:
                return {
                    "ok": True,
                    "message": "Sage 300 API accessible",
                    "schema": [],
                    "row_count": 0,
                    "tables": ["GL Accounts", "GL Transactions", "AP Invoices", "AR Invoices"],
                }
            return {"ok": False, "message": f"Sage 300 API returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        from .rest_api import RestApiConnector
        rest = RestApiConnector(self.connector_id, {
            "base_url": self.config.get("base_url", ""),
            "auth_type": "oauth2",
            "api_key": self.config.get("client_secret", ""),
            "endpoints": {
                "gl_transactions": "/GL/Transactions",
                "gl_accounts": "/GL/Accounts",
            },
            "pagination_type": "offset",
            "page_size": 100,
            "response_path": "$.data",
        })
        df = rest.fetch_data(params)
        self._set_sync_result(len(df))
        return df

    def get_schema(self) -> list[dict]:
        return [
            {"name": "JournalCode", "type": "string"},
            {"name": "JournalEntry", "type": "string"},
            {"name": "LineNumber", "type": "integer"},
            {"name": "Account", "type": "string"},
            {"name": "DebitAmount", "type": "decimal"},
            {"name": "CreditAmount", "type": "decimal"},
            {"name": "Description", "type": "string"},
            {"name": "TransactionDate", "type": "date"},
            {"name": "SourceCode", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# SAP Business One
# ─────────────────────────────────────────────────────────────────────

class SAPB1Connector(BaseConnector):
    connector_type = "sapb1"
    CONFIG_SCHEMA = [
        _erp_field("server", "Server", "text", "sboserver.example.com",
                   "SAP B1 DI API server hostname."),
        _erp_field("company_db", "Company Database", "text", "SBODEMOUS",
                   "SAP B1 company database name."),
        _erp_field("username", "Username", "text", "manager",
                   "SAP B1 username with API access."),
        _erp_field("password", "Password", "password", "",
                   "SAP B1 password. Stored encrypted.", True),
        _erp_field("license_server", "License Server", "text", "sboserver.example.com:30000",
                   "SAP B1 License Manager server address.", False),
    ]

    def test_connection(self) -> dict:
        server = self.config.get("server", "")
        if not server:
            return {"ok": False, "message": "No server configured", "schema": [], "row_count": 0}
        try:
            import requests
            base = f"https://{server}:50000/b1s/v1/"
            resp = requests.get(f"{base}Ping", timeout=10, verify=False)
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "SAP B1 DI API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["OJDT (Journals)", "OACT (Accounts)", "OBPL (Business Partners)"],
                }
            return {"ok": False, "message": f"SAP B1 returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            server = self.config.get("server", "")
            base = f"https://{server}:50000/b1s/v1/"

            # Login
            session = requests.Session()
            session.verify = False
            login_resp = session.post(f"{base}Login", json={
                "CompanyDB": self.config.get("company_db", ""),
                "UserName": self.config.get("username", ""),
                "Password": self.config.get("password", ""),
            }, timeout=15)
            login_resp.raise_for_status()

            # Fetch journal entries
            resp = session.get(f"{base}JournalEntries?$select=TransNum,TransDate,Ref1,Ref2,Comments,TransType", timeout=30)
            resp.raise_for_status()
            data = resp.json().get("value", [])
            df = pd.DataFrame(data)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"SAP B1 fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "TransNum", "type": "integer"},
            {"name": "TransDate", "type": "date"},
            {"name": "Ref1", "type": "string"},
            {"name": "Ref2", "type": "string"},
            {"name": "Comments", "type": "string"},
            {"name": "TransType", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Oracle NetSuite
# ─────────────────────────────────────────────────────────────────────

class NetSuiteConnector(BaseConnector):
    connector_type = "netsuite"
    CONFIG_SCHEMA = [
        _erp_field("account_id", "Account ID", "text", "1234567",
                   "NetSuite Account ID (numeric, found in Setup > Company > Company Information)."),
        _erp_field("consumer_key", "Consumer Key", "text", "",
                   "OAuth2 Consumer Key from the Integration Record."),
        _erp_field("consumer_secret", "Consumer Secret", "password", "",
                   "OAuth2 Consumer Secret. Stored encrypted.", True),
        _erp_field("token_id", "Token ID", "text", "",
                   "OAuth2 Token ID from the Access Token record."),
        _erp_field("token_secret", "Token Secret", "password", "",
                   "OAuth2 Token Secret. Stored encrypted.", True),
        _erp_field("realm", "Realm", "text", "1234567_SB1",
                   "Realm is usually account_id + _SBx for sandbox or _PRD for production.", False),
    ]

    def test_connection(self) -> dict:
        account_id = self.config.get("account_id", "")
        if not account_id:
            return {"ok": False, "message": "No account ID configured", "schema": [], "row_count": 0}
        try:
            import requests
            from requests_oauthlib import OAuth1
            auth = OAuth1(
                self.config.get("consumer_key", ""),
                client_secret=self.config.get("consumer_secret", ""),
                resource_owner_key=self.config.get("token_id", ""),
                resource_owner_secret=self.config.get("token_secret", ""),
            )
            realm = self.config.get("realm", account_id)
            url = f"https://{realm}.suitetalk.api.netsuite.com/services/rest/record/v1/transaction"
            resp = requests.get(url, auth=auth, headers={"Accept": "application/json"}, timeout=15)
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "NetSuite REST API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["Journal Entry", "Invoice", "Bill", "Payment"],
                }
            return {"ok": False, "message": f"NetSuite returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            from requests_oauthlib import OAuth1
            auth = OAuth1(
                self.config.get("consumer_key", ""),
                client_secret=self.config.get("consumer_secret", ""),
                resource_owner_key=self.config.get("token_id", ""),
                resource_owner_secret=self.config.get("token_secret", ""),
            )
            realm = self.config.get("realm", self.config.get("account_id", ""))
            base = f"https://{realm}.suitetalk.api.netsuite.com/services/rest/record/v1"
            resp = requests.get(
                f"{base}/journalentry?expand=sublist",
                auth=auth,
                headers={"Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            df = pd.DataFrame(items)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"NetSuite fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "id", "type": "string"},
            {"name": "tranDate", "type": "date"},
            {"name": "tranId", "type": "string"},
            {"name": "postingPeriod", "type": "string"},
            {"name": "memo", "type": "string"},
            {"name": "subsidiary", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Microsoft Dynamics 365
# ─────────────────────────────────────────────────────────────────────

class Dynamics365Connector(BaseConnector):
    connector_type = "dynamics365"
    CONFIG_SCHEMA = [
        _erp_field("tenant_id", "Tenant ID", "text", "",
                   "Azure AD Tenant ID from the App Registration."),
        _erp_field("client_id", "Client ID", "text", "",
                   "Application (client) ID from Azure App Registration."),
        _erp_field("client_secret", "Client Secret", "password", "",
                   "Client secret from Azure App Registration. Stored encrypted.", True),
        _erp_field("env_url", "Environment URL", "text", "https://org.crm.dynamics.com",
                   "Dataverse environment URL. Found in Settings > Development."),
        _erp_field("resource", "Resource", "text", "https://org.api.crm.dynamics.com",
                   "API resource URL. Usually: https://<org>.api.crm.dynamics.com", False),
    ]

    def test_connection(self) -> dict:
        tenant_id = self.config.get("tenant_id", "")
        if not tenant_id:
            return {"ok": False, "message": "No tenant ID configured", "schema": [], "row_count": 0}
        try:
            import requests
            token = self._get_token()
            env_url = self.config.get("env_url", "").rstrip("/")
            resp = requests.get(
                f"{env_url}/api/data/v9.2/WhoAmI",
                headers={"Authorization": f"Bearer {token}", "OData-MaxVersion": "4.0"},
                timeout=15,
            )
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "Dynamics 365 accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["journalentries", "accounts", "invoices"],
                }
            return {"ok": False, "message": f"Dynamics returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def _get_token(self) -> str:
        import requests
        resp = requests.post(
            f"https://login.microsoftonline.com/{self.config['tenant_id']}/oauth2/v2.0/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.config["client_id"],
                "client_secret": self.config["client_secret"],
                "resource": self.config.get("resource", "https://org.api.crm.dynamics.com"),
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            token = self._get_token()
            env_url = self.config.get("env_url", "").rstrip("/")
            resp = requests.get(
                f"{env_url}/api/data/v9.2/gljournalentries?$top=5000",
                headers={"Authorization": f"Bearer {token}", "OData-MaxVersion": "4.0", "Prefer": "odata.maxpagesize=5000"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("value", [])
            df = pd.DataFrame(data)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Dynamics 365 fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "gljournalentryid", "type": "string"},
            {"name": "createdon", "type": "date"},
            {"name": "journalnumber", "type": "string"},
            {"name": "description", "type": "string"},
            {"name": "statuscode", "type": "integer"},
        ]


# ─────────────────────────────────────────────────────────────────────
# QuickBooks
# ─────────────────────────────────────────────────────────────────────

class QuickBooksConnector(BaseConnector):
    connector_type = "quickbooks"
    CONFIG_SCHEMA = [
        _erp_field("client_id", "Client ID", "text", "",
                   "OAuth2 Client ID from Intuit Developer Portal."),
        _erp_field("client_secret", "Client Secret", "password", "",
                   "OAuth2 Client Secret. Stored encrypted.", True),
        _erp_field("company_id", "Company ID", "text", "",
                   "QuickBooks Company ID (realmID). Found in the URL when logged into QB."),
        _erp_field("access_token", "Access Token", "password", "",
                   "OAuth2 Access Token. Will need refresh. Stored encrypted.", True),
        _erp_field("refresh_token", "Refresh Token", "password", "",
                   "OAuth2 Refresh Token for token renewal. Stored encrypted.", True),
        _erp_field("environment", "Environment", "select", "",
                   "Production or sandbox.", True,
                   [{"value": "production", "label": "Production"},
                    {"value": "sandbox", "label": "Sandbox"}]),
    ]

    def test_connection(self) -> dict:
        company_id = self.config.get("company_id", "")
        if not company_id:
            return {"ok": False, "message": "No company ID configured", "schema": [], "row_count": 0}
        try:
            import requests
            env = self.config.get("environment", "production")
            base = "https://quickbooks.api.intuit.com" if env == "production" else "https://sandbox-quickbooks.api.intuit.com"
            token = self.config.get("access_token", "")
            resp = requests.get(
                f"{base}/v3/company/{company_id}/query?query=SELECT * FROM CompanyInfo MAXRESULTS 1",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                timeout=15,
            )
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "QuickBooks API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["JournalEntry", "Account", "Transaction", "Bill", "Invoice"],
                }
            return {"ok": False, "message": f"QuickBooks returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            env = self.config.get("environment", "production")
            base = "https://quickbooks.api.intuit.com" if env == "production" else "https://sandbox-quickbooks.api.intuit.com"
            company_id = self.config.get("company_id", "")
            token = self.config.get("access_token", "")
            resp = requests.get(
                f"{base}/v3/company/{company_id}/query?query=SELECT * FROM JournalEntry STARTPOSITION 1 MAXRESULTS 1000",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("QueryResponse", {})
            records = data.get("JournalEntry", [])
            df = pd.DataFrame(records)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"QuickBooks fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "Id", "type": "string"},
            {"name": "TxnDate", "type": "date"},
            {"name": "DocNumber", "type": "string"},
            {"name": "PrivateNote", "type": "string"},
            {"name": "TotalAmt", "type": "decimal"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Xero
# ─────────────────────────────────────────────────────────────────────

class XeroConnector(BaseConnector):
    connector_type = "xero"
    CONFIG_SCHEMA = [
        _erp_field("client_id", "Client ID", "text", "",
                   "Xero OAuth2 Client ID from the Xero Developer Portal."),
        _erp_field("client_secret", "Client Secret", "password", "",
                   "Xero OAuth2 Client Secret. Stored encrypted.", True),
        _erp_field("tenant_id", "Tenant ID", "text", "",
                   "Xero tenant ID obtained after OAuth2 connection."),
        _erp_field("access_token", "Access Token", "password", "",
                   "OAuth2 Access Token. Stored encrypted.", True),
    ]

    def test_connection(self) -> dict:
        tenant_id = self.config.get("tenant_id", "")
        if not tenant_id:
            return {"ok": False, "message": "No tenant ID configured", "schema": [], "row_count": 0}
        try:
            import requests
            token = self.config.get("access_token", "")
            resp = requests.get(
                "https://api.xero.com/api.xro/2.0/organisation",
                headers={"Authorization": f"Bearer {token}", "Xero-Tenant-Id": tenant_id},
                timeout=15,
            )
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "Xero API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["JournalEntries", "Accounts", "BankTransactions"],
                }
            return {"ok": False, "message": f"Xero returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            token = self.config.get("access_token", "")
            tenant_id = self.config.get("tenant_id", "")
            headers = {"Authorization": f"Bearer {token}", "Xero-Tenant-Id": tenant_id}
            resp = requests.get(
                "https://api.xero.com/api.xro/2.0/JournalEntries?where=DateUTC>=DateTime(2026,1,1)",
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("JournalEntries", [])
            df = pd.DataFrame(data)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Xero fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "JournalID", "type": "string"},
            {"name": "JournalDate", "type": "date"},
            {"name": "JournalNumber", "type": "string"},
            {"name": "Reference", "type": "string"},
            {"name": "SourceID", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Odoo
# ─────────────────────────────────────────────────────────────────────

class OdooConnector(BaseConnector):
    connector_type = "odoo"
    CONFIG_SCHEMA = [
        _erp_field("url", "Odoo URL", "text", "https://odoo.example.com",
                   "The base URL of your Odoo instance."),
        _erp_field("database", "Database", "text", "mycompany",
                   "Odoo database name. Visible in the URL or login screen."),
        _erp_field("username", "Username / Email", "text", "admin@example.com",
                   "Odoo login email or username."),
        _erp_field("password", "Password / API Key", "password", "",
                   "Odoo password or an API key. Stored encrypted.", True),
    ]

    def test_connection(self) -> dict:
        url = self.config.get("url", "").rstrip("/")
        if not url:
            return {"ok": False, "message": "No URL configured", "schema": [], "row_count": 0}
        try:
            import xmlrpc.client
            uid = self._authenticate()
            if uid:
                return {
                    "ok": True, "message": "Odoo accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["account.move", "account.account", "account.move.line"],
                }
            return {"ok": False, "message": "Authentication failed", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def _authenticate(self) -> Optional[int]:
        import xmlrpc.client
        url = self.config.get("url", "").rstrip("/")
        db = self.config.get("database", "")
        username = self.config.get("username", "")
        password = self.config.get("password", "")
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        uid = common.authenticate(db, username, password, {})
        return uid if uid else None

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import xmlrpc.client
            url = self.config.get("url", "").rstrip("/")
            db = self.config.get("database", "")
            password = self.config.get("password", "")
            uid = self._authenticate()
            if not uid:
                raise RuntimeError("Authentication failed")

            models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")
            records = models.execute_kw(
                db, uid, password,
                "account.move", "search_read",
                [[("move_type", "=", "journal entry")]],
                {"fields": ["name", "date", "ref", "state", "journal_id"],
                 "limit": 5000},
            )
            df = pd.DataFrame(records)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Odoo fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "string"},
            {"name": "date", "type": "date"},
            {"name": "ref", "type": "string"},
            {"name": "state", "type": "string"},
            {"name": "journal_id", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Sage 50
# ─────────────────────────────────────────────────────────────────────

class Sage50Connector(BaseConnector):
    connector_type = "sage50"
    CONFIG_SCHEMA = [
        _erp_field("company_path", "Company File Path", "text", "C:\\Sage50\\Companies\\MYCOMP\\",
                   "Full path to the Sage 50 company folder."),
        _erp_field("driver", "ODBC Driver", "text", "Sage 50 Connection Manager",
                   "ODBC driver name for Sage 50. Usually 'Sage 50 Connection Manager'."),
        _erp_field("fiscal_year", "Fiscal Year", "text", "2026",
                   "Current fiscal year."),
    ]

    def test_connection(self) -> dict:
        company_path = self.config.get("company_path", "")
        if not company_path:
            return {"ok": False, "message": "No company path configured", "schema": [], "row_count": 0}
        try:
            import pyodbc
            driver = self.config.get("driver", "Sage 50 Connection Manager")
            conn_str = f"DRIVER={{{driver}}};DIR={company_path}"
            conn = pyodbc.connect(conn_str, timeout=10)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            return {
                "ok": True, "message": "Sage 50 ODBC accessible",
                "schema": [], "row_count": 0,
                "tables": ["GLJournal", "GLAccount", "GLPeriod"],
            }
        except ImportError:
            return {"ok": False, "message": "pyodbc not installed", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import pyodbc
            import pandas as pd
            driver = self.config.get("driver", "Sage 50 Connection Manager")
            company_path = self.config.get("company_path", "")
            conn_str = f"DRIVER={{{driver}}};DIR={company_path}"
            conn = pyodbc.connect(conn_str, timeout=30)
            df = pd.read_sql("SELECT * FROM GLJournal", conn)
            conn.close()
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Sage 50 fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "JournalNo", "type": "integer"},
            {"name": "JournalDate", "type": "date"},
            {"name": "AccountCode", "type": "string"},
            {"name": "DebitAmount", "type": "decimal"},
            {"name": "CreditAmount", "type": "decimal"},
            {"name": "Reference", "type": "string"},
            {"name": "Description", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Epicor
# ─────────────────────────────────────────────────────────────────────

class EpicorConnector(BaseConnector):
    connector_type = "epicor"
    CONFIG_SCHEMA = [
        _erp_field("server", "Server", "text", "epicor.example.com",
                   "Epicor REST API server hostname."),
        _erp_field("company_id", "Company ID", "text", "MYCOMP",
                   "Epicor Company ID."),
        _erp_field("api_key", "API Key", "password", "",
                   "Epicor API key. Stored encrypted.", True),
        _erp_field("base_url", "Base URL", "text", "",
                   "Override base URL. Leave blank to auto-build from server.", False),
    ]

    def _get_base_url(self) -> str:
        base = self.config.get("base_url", "").rstrip("/")
        if base:
            return base
        server = self.config.get("server", "")
        company = self.config.get("company_id", "")
        return f"https://{server}/api/v1/{company}"

    def test_connection(self) -> dict:
        try:
            import requests
            base = self._get_base_url()
            api_key = self.config.get("api_key", "")
            resp = requests.get(
                f"{base}/Erp.Bo.SvcContract",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10,
            )
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "Epicor REST API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["GLJrnHed", "GLJrnDtl", "COAAct"],
                }
            return {"ok": False, "message": f"Epicor returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            base = self._get_base_url()
            api_key = self.config.get("api_key", "")
            resp = requests.get(
                f"{base}/Erp.BO.GLJrnHedSvc/GLJrnHeds?$top=5000",
                headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("value", [])
            df = pd.DataFrame(data)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Epicor fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "Company", "type": "string"},
            {"name": "JournalNum", "type": "integer"},
            {"name": "JournalDate", "type": "date"},
            {"name": "FiscalYear", "type": "integer"},
            {"name": "FiscalPeriod", "type": "integer"},
            {"name": "Description", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Infor
# ─────────────────────────────────────────────────────────────────────

class InforConnector(BaseConnector):
    connector_type = "infor"
    CONFIG_SCHEMA = [
        _erp_field("tenant", "Tenant", "text", "myorg",
                   "Infor ION tenant name."),
        _erp_field("client_id", "Client ID", "text", "",
                   "Infor ION API Client ID."),
        _erp_field("client_secret", "Client Secret", "password", "",
                   "Infor ION API Client Secret. Stored encrypted.", True),
        _erp_field("base_url", "Base URL", "text", "https://inforapi.myorg.com",
                   "Infor ION API base URL."),
        _erp_field("environment", "Environment", "select", "",
                   "Infor environment.", True,
                   [{"value": "production", "label": "Production"},
                    {"value": "sandbox", "label": "Sandbox / Test"}]),
    ]

    def _get_token(self) -> str:
        import requests
        base = self.config.get("base_url", "").rstrip("/")
        resp = requests.post(
            f"{base}/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.config.get("client_id", ""),
                "client_secret": self.config.get("client_secret", ""),
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    def test_connection(self) -> dict:
        try:
            token = self._get_token()
            base = self.config.get("base_url", "").rstrip("/")
            resp = requests.get(
                f"{base}/api/token/info",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if resp.status_code < 400:
                return {
                    "ok": True, "message": "Infor ION API accessible",
                    "schema": [], "row_count": 0,
                    "tables": ["GL Journal", "GL Account", "AP Invoice"],
                }
            return {"ok": False, "message": f"Infor returned {resp.status_code}", "schema": [], "row_count": 0}
        except Exception as exc:
            return {"ok": False, "message": f"Connection failed: {exc}", "schema": [], "row_count": 0}

    def fetch_data(self, params: Optional[dict] = None) -> pd.DataFrame:
        try:
            import requests
            token = self._get_token()
            base = self.config.get("base_url", "").rstrip("/")
            tenant = self.config.get("tenant", "")
            resp = requests.get(
                f"{base}/api/{tenant}/FinancialCore/GlJournals?$top=5000",
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json().get("items", resp.json().get("value", []))
            df = pd.DataFrame(data)
            self._set_sync_result(len(df))
            return df
        except Exception as exc:
            raise RuntimeError(f"Infor fetch failed: {exc}")

    def get_schema(self) -> list[dict]:
        return [
            {"name": "journalId", "type": "string"},
            {"name": "journalDate", "type": "date"},
            {"name": "description", "type": "string"},
            {"name": "fiscalYear", "type": "integer"},
            {"name": "period", "type": "integer"},
            {"name": "status", "type": "string"},
        ]


# ─────────────────────────────────────────────────────────────────────
# Registry of all ERP connector classes
# ─────────────────────────────────────────────────────────────────────

ERP_CONNECTOR_MAP: dict[str, type[BaseConnector]] = {
    "sage300": Sage300Connector,
    "sapb1": SAPB1Connector,
    "netsuite": NetSuiteConnector,
    "dynamics365": Dynamics365Connector,
    "quickbooks": QuickBooksConnector,
    "xero": XeroConnector,
    "odoo": OdooConnector,
    "sage50": Sage50Connector,
    "epicor": EpicorConnector,
    "infor": InforConnector,
}

# ERP display metadata for the gallery
ERP_GALLERY: list[dict] = [
    {"type": "sage300", "name": "Sage 300", "badge": "S", "color": "#4CAF50",
     "help_url": "https://documentation.sage.com/sage300/"},
    {"type": "sapb1", "name": "SAP Business One", "badge": "SAP", "color": "#F0AB00",
     "help_url": "https://help.sap.com/viewer/p/SAP_BUSINESS_ONE"},
    {"type": "netsuite", "name": "Oracle NetSuite", "badge": "N", "color": "#FF0000",
     "help_url": "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/"},
    {"type": "dynamics365", "name": "Microsoft Dynamics 365", "badge": "D", "color": "#002050",
     "help_url": "https://learn.microsoft.com/en-us/dynamics365/"},
    {"type": "quickbooks", "name": "QuickBooks", "badge": "QB", "color": "#2CA01C",
     "help_url": "https://developer.intuit.com/app/developer/documentation"},
    {"type": "xero", "name": "Xero", "badge": "X", "color": "#13B5EA",
     "help_url": "https://developer.xero.com/documentation/api/accounting/overview"},
    {"type": "odoo", "name": "Odoo", "badge": "O", "color": "#875A7B",
     "help_url": "https://www.odoo.com/documentation/17.0/"},
    {"type": "sage50", "name": "Sage 50", "badge": "S5", "color": "#4CAF50",
     "help_url": "https://www.sage.co.uk/sage-50/accounts"},
    {"type": "epicor", "name": "Epicor", "badge": "E", "color": "#FF6600",
     "help_url": "https://epicorhelp.velocitycloud.com/"},
    {"type": "infor", "name": "Infor", "badge": "I", "color": "#005B82",
     "help_url": "https://docs.infor.com/"},
]
