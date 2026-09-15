# Data Source Connectors — Design Spec

**Date:** 2026-09-15
**Status:** Approved
**Scope:** Pluggable connector system with GUI wizards for APIs, databases, ERP, file monitors

---

## 1. Overview

Extend the admin page to support live data source connections (APIs, databases, ERP systems, file monitors) through a step-by-step GUI wizard. Users connect sources, preview/clean data, validate financial integrity, and sync — all without coding.

### Goals
- 5 connector types: SQL, REST API, Sage 300, ODBC/JDBC, File Monitor
- Step-by-step wizard with hints for each field
- Auto-clean with preview (duplicates, missing codes, date normalization, sign verification)
- Financial integrity checks (double-entry, P&L balance, B/S balance, etc.)
- Credentials encrypted in `.env` via Fernet
- Both manual and scheduled sync
- Sample data detection + clear on first real sync
- Reorganize existing upload functionality into "File Imports" tab

---

## 2. Architecture

### Admin Page Tabs

| Tab | Purpose |
|-----|---------|
| **Data Sources** | Connector gallery + status cards. Add/edit/test/sync connectors. |
| **File Imports** | Existing upload cards (GL, Mapping, Budget, etc.) — cleaned up. |
| **Pipeline** | Job status, activity log, manual re-run. |

### Backend Module Structure

```
backend/
  connectors/
    __init__.py
    base.py            # Abstract base class
    sql.py             # MySQL, PostgreSQL, SQL Server
    rest_api.py        # Generic REST API
    sage300.py         # Sage 300 pre-configured
    odbc.py            # ODBC/JDBC
    file_monitor.py    # Folder watcher
    registry.py        # CRUD for connectors.json
    credentials.py     # Fernet encrypt/decrypt
    cleaner.py         # Auto-clean rules
    validator.py       # Financial integrity checks
  routes/
    connectors.py      # Connector CRUD API
    sync.py            # Sync trigger + status
```

---

## 3. Connector Types

### 1. SQL Database

**Supported:** MySQL, PostgreSQL, SQL Server, MariaDB, Oracle

**Config fields:**
- Database type (dropdown: MySQL / PostgreSQL / SQL Server / MariaDB / Oracle)
- Host, Port (auto-filled: MySQL=3306, PG=5432, MSSQL=1433, MariaDB=3306, Oracle=1521)
- Database name / Service name (Oracle)
- Username, Password (encrypted)
- Table name or custom SQL query
- Column mapping (auto-detected from table schema)
- SSL/TLS option

**Test:** `SELECT 1` + `SHOW TABLES` / `pg_tables`. Returns table list + row counts.

**Sync:** `SELECT * FROM gl_transactions WHERE date >= last_sync_date`

### 3.2 REST API

**Supported:** Any JSON/CSV endpoint (Sage 300, QuickBooks, Xero, custom)

**Config fields:**
- API name, Base URL
- Auth type: None / Bearer Token / API Key / Basic Auth / OAuth2
- Credentials (encrypted)
- Endpoint paths (GL accounts, transactions)
- Pagination: offset / cursor / link header
- Response mapping: JSON path to data array (e.g., `$.data.transactions`)

**Test:** `GET /` or health endpoint. Returns status + sample response.

**Sync:** Paginated fetch, respects `Last-Modified` / `If-Modified-Since`.

### 3.3 ERP Connectors (Pre-configured)

Each ERP gets a dedicated connector with pre-mapped fields and auto-configuration.

| ERP | Auth Method | Key Fields | Icon |
|-----|-------------|------------|------|
| **Sage 300** | OAuth2 / API Key | Company DB, Client ID + Secret, Fiscal Year | `S` badge (green) |
| **SAP Business One** | DI API / Company DB | Server, CompanyDB, Username, Password, License Server | `SAP` badge (gold) |
| **Oracle NetSuite** | OAuth2 + Token | Account ID, Consumer Key, Token Secret, Realm | `N` badge (red) |
| **Microsoft Dynamics 365** | OAuth2 / Azure AD | Tenant ID, Client ID, Client Secret, Environment URL | `D` badge (blue) |
| **QuickBooks** | OAuth2 | Client ID, Client Secret, Redirect URI, Company ID | `QB` badge (green) |
| **Xero** | OAuth2 | Client ID, Client Secret, Tenant ID | `X` badge (cyan) |
| **Odoo** | API Key / User+Pass | URL, Database, Username, Password, API Key | `O` badge (purple) |
| **Sage 50** | ODBC / File Export | Company path, ODBC driver, Fiscal Year | `S50` badge (green) |
| **Epicor** | REST API | Server, Company ID, API Key, License Key | `E` badge (orange) |
| **Infor** | OAuth2 / SSO | Tenant, Client ID, Secret, Environment | `I` badge (teal) |

Each ERP connector:
- Pre-configures base URL, auth type, pagination
- Auto-maps GL structure to pipeline format
- Has ERP-specific validation rules
- Shows relevant help text and documentation links

**Generic REST API** covers any ERP not listed above (user configures manually).

### 3.4 ODBC/JDBC

**Supported:** Any ODBC source (legacy Sage 300 on-premise, Access, etc.)

**Config fields:**
- Connection string (or build via GUI: driver, server, database, uid, pwd)
- Table/query
- Column mapping

**Requires:** `pyodbc` Python package (optional dependency).

### 3.5 File Monitor

**Watches a folder** for new/updated files:
- Watch path (e.g., `/exports/sage300/`)
- File pattern (e.g., `*.xlsx`, `GL_*.csv`)
- File type (GL, Mapping, Budget)
- Processing mode: auto-import / notify-only

**Uses:** `watchdog` library for file system events.

---

## 4. Wizard Flow

### Step 1: Configure
- Type-specific form fields
- Each field has a `?` tooltip explaining what to enter and where to find it
- "Test Connection" button validates before proceeding
- Returns schema info (table list, column names, sample data)

### Step 2: Preview & Clean
- Shows row count from source
- Auto-clean results with change log:
  - Duplicates removed
  - Missing GL codes mapped
  - Date format standardized
  - Sign verification
  - Unmapped accounts flagged
- Checkboxes to toggle clean rules
- Preview table (first 10 rows)

### Step 3: Activate
- Import mode: Replace (backs up old) / Append
- Sync schedule: Manual / Daily / Weekly / Custom cron
- Email notifications: on success / on failure
- "Clear Sample Data" option (first sync only)

---

## 5. Auto-Clean Rules

| Rule | Detection | Action |
|------|-----------|--------|
| Duplicate removal | Same Transaction_ID | Remove, log count |
| Missing GL codes | GL code not in mapping | Fuzzy match, suggest mapping |
| Date normalization | Regex detect format | Convert to DD/MM/YYYY |
| Sign verification | Compare against Normal_Balance | Flag mismatches |
| Unmapped accounts | Left join with mapping | Flag for review |
| Empty rows | Debit=0 AND Credit=0 | Remove |

Each rule produces: `{ rule, rows_affected, before, after, preview }`

---

## 6. Financial Integrity Checks

Run after clean, before pipeline. Advisory — don't block dashboard generation.

| Check | Severity | Tolerance |
|-------|----------|-----------|
| Double-entry balance (Dr = Cr) | 🔴 Critical | ₦0 |
| P&L balance (Rev - Exp = NI) | 🔴 Critical | 0.01% |
| B/S balance (A = L + E) | 🔴 Critical | 0.01% |
| Account type validity | 🟡 Warning | — |
| Period completeness | 🟡 Warning | — |
| Cash flow coherence | 🟡 Warning | 0.01% |
| Tax reasonability | 🟡 Warning | 0-50% of PBT |
| Negative balances | 🟡 Warning | — |
| Unmapped accounts | ℹ️ Info | — |
| Duplicate postings | 🟡 Warning | — |

---

## 7. Sample Data Management

### Detection
Auto-detect sample data by checking:
- `data_sources` field contains "sample" or "generated"
- GL codes match `generate_sample_gl.py` patterns
- Company name = "CIG Motors" with no real transactions

### First Sync Prompt
When first sync triggers from any connector:
- Option to Replace sample data (recommended) / Append
- Checkboxes: clear budget, prior periods, segment mappings
- Sample data backed up to `data/backups/pre-live-backup/`
- `connectors.json` gets `first_sync_done: true` per connector

### Banner
If sample data detected, Data Sources tab shows:
```
⚠️ Dashboard is showing sample data. Connect a real source to replace it.
```

---

## 8. Credential Storage

Credentials encrypted in `.env` using Fernet:
```
CRED_ENCRYPTION_KEY=<base64 key>
SQL_HOST_001=<encrypted>
SQL_PASS_001=<encrypted>
SAGE300_SECRET_001=<encrypted>
```

`connectors.json` stores `credentials_ref` keys pointing to `.env` entries.

---

## 9. Sync Flow

```
User clicks "Sync" or cron fires
  → Connector.fetch_data() pulls raw data
  → Connector.clean_data() applies auto-clean rules
  → Validator.run_checks() runs financial integrity checks
  → Diff computed against current data
  → User reviews (manual) or auto-applies (scheduled)
  → Data written to data/current/
  → Pipeline re-runs
  → Dashboard JSON updated
  → Sync summary displayed (data counts + check results)
```

---

## 10. API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/connectors` | List all connectors |
| POST | `/api/connectors` | Create connector |
| GET | `/api/connectors/:id` | Get connector details |
| PUT | `/api/connectors/:id` | Update connector |
| DELETE | `/api/connectors/:id` | Remove connector |
| POST | `/api/connectors/:id/test` | Test connection |
| POST | `/api/connectors/:id/sync` | Trigger manual sync |
| GET | `/api/connectors/:id/sync/status` | Sync status + history |
| POST | `/api/connectors/:id/schedule` | Set sync schedule |
| GET | `/api/connectors/:id/validate` | Run financial checks |
| GET | `/api/connectors/:id/preview` | Preview source data |
| POST | `/api/connectors/clear-sample` | Clear sample data |

---

## 11. Frontend Components

| Component | Purpose |
|-----------|---------|
| `DataSourcesTab.jsx` | Connector gallery + status cards |
| `ConnectorCard.jsx` | Individual connector display (icon, name, status, last sync) |
| `ConnectorWizard.jsx` | 3-step wizard shell |
| `ConnectorStep1.jsx` | Config form (type-specific fields) |
| `ConnectorStep2.jsx` | Preview + clean rules |
| `ConnectorStep3.jsx` | Activate + schedule |
| `ErpGallery.jsx` | Grid of ERP logos for quick selection |
| `FileImportsTab.jsx` | Reorganized upload cards |
| `PipelineTab.jsx` | Job status + activity log |
| `SyncSummary.jsx` | Post-sync results + checks |

### Connector Gallery Layout

The Data Sources tab shows a gallery of connector types:

```
┌─ Data Sources ──────────────────────────────────────┐
│                                                       │
│  ── Database Connections ──                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ MySQL│ │Postgr│ │ MSSQL│ │MariaDB│ │Oracle│     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                       │
│  ── ERP Systems ──                                    │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │Sage  │ │ SAP  │ │NetS. │ │Dynam.│ │QB    │     │
│  │ 300  │ │  B1  │ │      │ │ 365  │ │      │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │Xero  │ │ Odoo │ │Sage50│ │Epicor│ │ Infor│     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                       │
│  ── Other Sources ──                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                         │
│  │ REST │ │ODBC/ │ │ File │                         │
│  │ API  │ │ JDBC │ │Watch │                         │
│  └──────┘ └──────┘ └──────┘                         │
│                                                       │
│  ── Active Connections ──                             │
│  (shows configured connectors with status)            │
└───────────────────────────────────────────────────────┘
```

### ERP Icon Design

Each ERP gets a colored badge icon (2-letter abbreviation):
- Sage 300: `S` — green (#4CAF50)
- SAP B1: `SAP` — gold (#F0AB00)
- NetSuite: `N` — red (#FF0000)
- Dynamics 365: `D` — blue (#002050)
- QuickBooks: `QB` — green (#2CA01C)
- Xero: `X` — cyan (#13B5EA)
- Odoo: `O` — purple (#875A7B)
- Sage 50: `S5` — green (#4CAF50)
- Epicor: `E` — orange (#FF6600)
- Infor: `I` — teal (#005B82)

---

## 12. New Dependencies

**Python:**
```
cryptography>=42.0    # Fernet encryption
watchdog>=4.0         # File monitoring
pyodbc>=5.0           # ODBC (optional)
```

**Frontend:** None new — uses existing Tailwind + lucide-react.
