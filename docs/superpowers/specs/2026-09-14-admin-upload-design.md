# Admin Upload Page & Backend — Design Spec

**Date:** 2026-09-14
**Status:** Approved
**Scope:** FastAPI backend, admin upload page, smart merge, pipeline re-run, skeleton loading

---

## 1. Problem Statement

The CIG Motors finance dashboard is a static React SPA. Data flows one way: Excel → Python pipeline → JSON → React. There is no way to update data without manually running the pipeline from the command line. The user needs an admin page at `/admin` to upload new GL data, statement mappings, budgets, and other files — with smart diffing, merge prompts, and automatic pipeline re-runs.

## 2. Architecture

### Decision: FastAPI Backend (Option A)

Single Python server serves both the React build and API endpoints. Chosen because:
- Pipeline is already Python (pandas, openpyxl) — runs in-process
- FastAPI handles file uploads natively (UploadFile)
- Single deployment on Railway or Render
- Built-in OpenAPI docs at `/docs`

### System Diagram

```
┌─────────────────────────────────────────────┐
│              FastAPI Server                  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Static   │  │ API      │  │ Pipeline  │ │
│  │ React    │  │ Routes   │  │ Runner    │ │
│  │ (dist/)  │  │ /api/*   │  │ (Python)  │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│       │              │              │       │
│       ▼              ▼              ▼       │
│  ┌──────────────────────────────────────┐  │
│  │         Data Directory               │  │
│  │  data/                               │  │
│  │  ├── uploads/    ← raw files saved   │  │
│  │  ├── current/    ← active dataset    │  │
│  │  └── dashboard_data.json  ← output   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Data Flow

1. User uploads raw GL (or mapping/budget) via `/admin`
2. File saved to `data/uploads/`
3. Backend compares with existing data, returns diff
4. User confirms (append/replace/cancel)
5. Pipeline runs: clean → map → build → write JSON
6. Dashboard auto-refreshes from new JSON

## 3. Authentication

**Single shared key** — no user accounts.

- User enters a pre-shared admin key on the `/admin` page
- Backend validates against `ADMIN_KEY` env var
- On success, returns a Bearer token (JWT or simple signed token)
- Token stored in `localStorage`, sent as `Authorization: Bearer <token>` header
- Token expires after 24 hours
- All `/api/*` routes require valid token except `/api/auth`

### API Endpoints

```
POST /api/auth
  Body: { "key": "shared-secret" }
  Response: { "token": "...", "expires": "24h" }

GET  /api/data-status
  Response: {
    "gl": { "rows": 1444, "accounts": 341, "lastUpdated": "2026-09-14" },
    "mapping": { "codes": 369, "lastUpdated": "2026-09-14" },
    "budget": { "periods": 13, "lastUpdated": null },
    "accountSummary": { "accounts": 341, "lastUpdated": "2026-09-14" },
    "priorPeriod": { "periods": 12, "lastUpdated": null }
  }

POST /api/upload
  Body: multipart/form-data
    file: <Excel file>
    type: "gl" | "mapping" | "budget" | "account_summary" | "prior_period"
  Response: {
    "status": "diff_ready",
    "uploadId": "uuid",
    "diff": {
      "existing": { "rows": 1444 },
      "uploaded": { "rows": 128 },
      "new": 120, "modified": 5, "duplicates": 3,
      "preview": [ { "row": 45, "change": "new" }, ... ]
    }
  }

POST /api/confirm-upload
  Body: { "uploadId": "...", "action": "append" | "replace" | "cancel" }
  Response: {
    "status": "pipeline_running",
    "jobId": "abc123"
  }

GET  /api/pipeline-status/:jobId
  Response: {
    "status": "running" | "completed" | "failed",
    "steps": [
      { "name": "Cleaning GL", "status": "done", "duration": "0.8s" },
      { "name": "Building P&L", "status": "running" }
    ],
    "error": null
  }

GET  /api/download-template/:type
  Response: Excel file (template with correct headers)
  Types: gl | mapping | budget | account_summary | prior_period

GET  /data/dashboard_data.json
  Response: Updated dashboard data (React reads this)
```

## 4. Admin Page UI (`/admin`)

### Layout

```
┌────────────────────────────────────────────────────┐
│  🔐 Password Gate (single shared key)              │
│  [Enter admin key] [Authenticate]                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ 📄 GL Data   │  │ 📊 Mapping   │  ...          │
│  │              │  │              │               │
│  │ Current:     │  │ Current:     │               │
│  │ 1,444 rows   │  │ 369 codes    │               │
│  │ Updated:     │  │ Updated:     │               │
│  │ 2026-09-14   │  │ 2026-09-14   │               │
│  │              │  │              │               │
│  │ [Download    │  │ [Download    │               │
│  │  Template]   │  │  Template]   │               │
│  │              │  │              │               │
│  │ ┌──────────┐ │  │ ┌──────────┐ │               │
│  │ │ Drop file │ │  │ │ Drop file │ │               │
│  │ │ or click  │ │  │ │ or click  │ │               │
│  │ └──────────┘ │  │ └──────────┘ │               │
│  └──────────────┘  └──────────────┘               │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ 💰 Budget    │  │ 📋 Account   │               │
│  │              │  │ Summary      │               │
│  │  ...         │  │  ...         │               │
│  └──────────────┘  └──────────────┘               │
│                                                    │
│  ┌─────────────────────────────────────┐          │
│  │ Activity Log                        │          │
│  │ ✓ GL uploaded - 8 new rows added    │          │
│  │ ✓ Pipeline completed (2.3s)         │          │
│  │ ⚠ Mapping upload failed: invalid... │          │
│  └─────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘
```

### Upload Cards

Each data card shows:
- Current file info (row count, last updated)
- Download template button (generates empty Excel with correct headers)
- Drag-and-drop zone (also click-to-browse)
- On upload: shows diff prompt before confirming

**Cards available:**
1. **GL Data** — Raw Sage 300 export (`.xlsx`). Triggers full pipeline re-run.
2. **Statement Mapping** — GL code → FS section mapping. Triggers rebuild.
3. **Budget** — Budget figures by period. Triggers budget recalc.
4. **Account Summary** — Opening balances. Triggers OB recalc.
5. **Prior Period** — Historical comparatives.

## 5. Upload Flow (Smart Diff + Prompt)

### Step 1: File Received
```
┌────────────────────────────────────────┐
│ 📄 Processing "GL_September_2026.xlsx" │
│ ████████████████░░░░ Validating...     │
└────────────────────────────────────────┘
```

### Step 2: Diff Computed
```
┌────────────────────────────────────────────────┐
│ 📊 Upload Summary — GL Transactions            │
│                                                │
│  Existing: 1,444 rows (Jan–Aug 2026)           │
│  Uploaded: 128 rows (Sep 2026)                 │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ ✅ 120 new transactions (not in existing)│  │
│  │ ✏️  5 modified (changed amount/date)      │  │
│  │ ❌ 3 duplicates (will be skipped)         │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  What would you like to do?                     │
│                                                │
│  [Append New]  [Replace All]  [Cancel]         │
│                                                │
│  ℹ️ Append adds new rows, keeps existing.       │
│  ℹ️ Replace overwrites everything with upload.  │
└────────────────────────────────────────────────┘
```

### Step 3: Pipeline Runs
```
┌────────────────────────────────────────┐
│ 🔄 Running pipeline...                 │
│ ✓ Cleaning GL (0.8s)                   │
│ ✓ Mapping statements (0.2s)            │
│ ✓ Building P&L (0.1s)                  │
│ ✓ Building B/S (0.1s)                  │
│ ✓ Building C/F (0.1s)                  │
│ ✓ Calculating ratios (0.1s)            │
│ ✓ Generating commentary (0.2s)         │
│ ✓ Writing dashboard_data.json          │
│                                        │
│ ✅ Complete! Dashboard updated.         │
│    [View Dashboard →]                  │
└────────────────────────────────────────┘
```

### Step 4: Error
```
┌────────────────────────────────────────┐
│ ❌ Upload Failed                       │
│                                        │
│ Reason: Invalid GL code "99999" found  │
│ in row 45. No matching entry in        │
│ Statement_Mapping.                     │
│                                        │
│ [Download error report]  [Try Again]   │
└────────────────────────────────────────┘
```

### Diff Logic by File Type

| File | How we diff |
|------|-------------|
| GL | Compare by `Transaction_ID` or `(GL_Code, Doc_Date, Reference)` combo |
| Mapping | Compare by `GL_Code` — new codes added, existing codes flagged for overwrite |
| Budget | Compare by `(GL_Code, Period)` — cell-level diff |
| Account Summary | Compare by `GL_Account` — new accounts, changed balances |
| Prior Period | Compare by `(GL_Account, Period)` — cell-level diff |

## 6. Template Downloads

Each upload card has a "Download Template" button that generates an empty Excel file with:
- Correct column headers matching what the pipeline expects
- Sample row (greyed out, commented) showing format
- Data validation notes in a second sheet

**Templates:**

| File | Columns |
|------|---------|
| GL | `Transaction_ID, GL_Code, GL_Account, Doc_Date, Source, Reference, Narration, Debit, Credit` |
| Mapping | `GL_Code, Statement_Section, FS_Heading, Note_Heading, CF_Category, Segment, Borrowing_Type, Normal_Balance` |
| Budget | `GL_Code, Period, Budget_Amount` (one row per account per period) |
| Account Summary | `GL_Account, Account_Name, Opening_Balance_Dr, Opening_Balance_Cr, Period` |
| Prior Period | `GL_Account, Account_Name, Period, Debit, Credit` |

## 7. Dashboard Loading Animation

### Skeleton Shimmer

When the dashboard loads (or refreshes after pipeline run), skeleton placeholders match each section's shape:

- **KPI cards:** 4 shimmer blocks matching card dimensions
- **Charts:** Wireframe rectangles matching chart aspect ratios
- **Tables:** Rows of shimmer lines matching column layout
- **Transitions:** Skeleton fades out as real data fades in

**Implementation:**
- CSS `@keyframes shimmer` — gradient slides across grey placeholder blocks
- Each component has a `Skeleton` variant (e.g., `<DashboardSkeleton>`, `<PLSkeleton>`)
- Skeleton shapes match the real layout
- Target <500ms load time so users barely notice

**Already partially built:** The CSS has `shimmer` keyframes and `.skeleton` classes in `index.css`. Wire them to each view.

## 8. Pipeline Modifications

### Current State
`pipeline/main.py` reads hardcoded file paths:
```python
gl = read_gl_clean("Sample GL_clean.xlsx")
mapping = read_statement_mapping("Statement_Mapping.xlsx")
```

### Required Change
Accept CLI arguments for dynamic file paths:
```python
python -m pipeline.main \
  --gl data/current/gl_clean.xlsx \
  --mapping data/current/statement_mapping.xlsx \
  --budget data/current/budget.xlsx \
  --account-summary data/current/account_summary.xlsx \
  --output dashboard/public/data/dashboard_data.json
```

### File Management
- `data/uploads/` — raw uploaded files (timestamped)
- `data/current/` — the active dataset (cleaned, pipeline-ready)
- After confirmed upload + merge, the merged file replaces `data/current/`
- Pipeline always reads from `data/current/` and writes to `dashboard/public/data/`

## 9. Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid file format | Return 400 with specific error message |
| Missing required columns | Return 400 listing missing columns |
| Unmapped GL codes | Return 400 with list of unmapped codes |
| Pipeline failure | Return 500 with step-by-step error log |
| Auth expired | Return 401, redirect to login |
| File too large | Return 413, suggest splitting |
| Duplicate upload (same file hash) | Warn user, allow re-upload if confirmed |

## 10. File Structure (New)

```
Finance_DataPrep/
├── backend/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Backend config (env vars, paths)
│   ├── auth.py                 # Key validation, token generation
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py             # POST /api/auth
│   │   ├── upload.py           # POST /api/upload, POST /api/confirm-upload
│   │   ├── data.py             # GET /api/data-status, GET /api/download-template/:type
│   │   └── pipeline.py         # GET /api/pipeline-status/:jobId
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_manager.py     # Save/merge/replace files in data/
│   │   ├── differ.py           # Compute diffs per file type
│   │   └── pipeline_runner.py  # Run pipeline as subprocess, track status
│   └── templates/              # Generated Excel templates (or generate on-the-fly)
│
├── dashboard/src/
│   ├── components/
│   │   ├── AdminPage.jsx       # Main admin page
│   │   ├── UploadCard.jsx      # Reusable upload card with drag-drop
│   │   ├── DiffPrompt.jsx      # Diff results + action picker
│   │   ├── ActivityLog.jsx     # Upload history
│   │   └── Skeletons.jsx       # All skeleton variants
│   ├── lib/
│   │   └── api.js              # API client (fetch wrapper with auth)
│   └── App.jsx                 # Modified: add /admin route, skeleton states
│
├── data/
│   ├── uploads/                # Timestamped raw uploads
│   ├── current/                # Active dataset (pipeline reads from here)
│   └── dashboard_data.json     # Pipeline output
```

## 11. Deployment

### Railway / Render

- **Build:** `pip install -r requirements.txt && cd dashboard && npm install && npm run build`
- **Start:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Env vars:** `ADMIN_KEY`, `PORT`
- **Persistent disk:** Mount `data/` directory for file storage

### Requirements

```
fastapi
uvicorn[standard]
python-multipart    # file uploads
openpyxl            # Excel handling
pandas              # data processing
pyjwt               # token generation (or use simple HMAC)
```

## 12. Security Considerations

- Admin key stored as env var, never in code
- Token expires after 24 hours
- Uploaded files validated before processing (check headers, types)
- No arbitrary file writes — only allowed paths under `data/`
- Pipeline runs in subprocess with timeout (30s max)
- File size limit: 50MB per upload
- CORS: only allow same-origin (no cross-domain API access)
