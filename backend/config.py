"""Backend configuration — env-driven paths and thresholds.

Everything the backend needs to know lives in one place: keys, filesystem
layout, upload limits. Read from environment variables so the same code
runs locally and on Railway/Render without editing.
"""
from __future__ import annotations
from pathlib import Path
import os


# ── Filesystem layout ──
ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
CURRENT_DIR = DATA_DIR / "current"
BACKUPS_DIR = DATA_DIR / "backups"
DIST_DIR = ROOT_DIR / "dashboard" / "dist"
DASHBOARD_JSON = ROOT_DIR / "dashboard" / "public" / "data" / "dashboard_data.json"

for d in (DATA_DIR, UPLOADS_DIR, CURRENT_DIR, BACKUPS_DIR):
    d.mkdir(parents=True, exist_ok=True)


# ── Authentication ──
# The admin key is validated against ADMIN_KEY at auth time. In development
# a default is provided so nobody is locked out — override in production.
ADMIN_KEY: str = os.getenv("ADMIN_KEY", "cig-finance-2026")
JWT_SECRET: str = os.getenv("JWT_SECRET", ADMIN_KEY + "::sign")
TOKEN_TTL_HOURS: int = int(os.getenv("TOKEN_TTL_HOURS", "24"))


# ── Upload limits ──
MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "50"))
PIPELINE_TIMEOUT_S: int = int(os.getenv("PIPELINE_TIMEOUT_S", "60"))


# ── Recognised file types per the spec ──
# Each entry:
#   filename    — where the merged file lives in data/current/
#   diff_key    — how the differ identifies "same row" for the smart diff
#   headers     — expected columns (for template download + validation)
#   sample      — one greyed-out sample row shown in the template
FILE_TYPES: dict[str, dict] = {
    "gl": {
        "label": "General ledger",
        "filename": "gl_clean.xlsx",
        "sheet": "GL_Clean",
        "diff_key": ["Transaction_ID"],  # falls back to composite if missing
        "diff_key_fallback": ["GL_Code", "Doc_Date", "Reference", "Debit", "Credit"],
        # Post-clean shape used by the differ. Raw uploads pass through
        # backend.services.gl_ingest first, which produces this shape.
        "headers": [
            "Transaction_ID", "GL_Code", "GL_Account", "Doc_Date",
            "Source", "Reference", "Narration", "Debit", "Credit",
        ],
        "sample": [
            "TX-000001", "40000", "Revenue - Vehicle Sales", "2026-09-01",
            "Sales", "INV-2026-0912", "Vehicle sale to customer XYZ", 0, 4_500_000,
        ],
        # Raw Sage-style shape the template exposes to users, because that
        # is what the source system spits out. Interleaved header rows are
        # not shown in the sample — the file preview note explains the
        # hierarchy in words.
        "template_sheet": "gl",
        "template_headers": [
            "Account Number/Year/ Prd.", "Source", "Doc. Date",
            "Description", "Reference", "Debits", "Credits",
        ],
        "template_sample": [
            "10000", "Cash in Hand - Naira-1", "Opening Balance:", 500000, 0, "", "",
        ],
        "template_note": (
            "Export your monthly GL from Sage (or your source system) exactly as it comes "
            "out — the hierarchical shape with account headers, year rows and transaction "
            "rows. The pipeline detects the raw shape and cleans it automatically."
        ),
        "triggers_pipeline": True,
    },
    "mapping": {
        "label": "Statement mapping",
        "filename": "statement_mapping.xlsx",
        "sheet": "Statement Mapping",
        "diff_key": ["GL_Code"],
        "headers": [
            "GL_Code", "Account_Description", "Statement_Section", "FS_Heading",
            "Note_Heading", "CF_Category", "Segment", "Borrowing_Type", "Normal_Balance",
        ],
        "sample": [
            "40000", "Revenue - Vehicle Sales", "Revenue", "Revenue",
            "Motor vehicles", "Operating", "Motor Vehicles Sales", "", "Credit",
        ],
        "triggers_pipeline": True,
    },
    "budget": {
        "label": "Budget",
        "filename": "budget.xlsx",
        "sheet": "Budget",
        "diff_key": ["GL_Code", "Period"],
        "headers": ["GL_Code", "Period", "Budget_Amount"],
        "sample": ["40000", "2026-09", 5_000_000],
        "triggers_pipeline": True,
    },
    "account_summary": {
        "label": "Account summary (opening balances)",
        "filename": "account_summary.xlsx",
        "sheet": "Account_Summary",
        "diff_key": ["GL_Account"],
        "headers": [
            "GL_Account", "Account_Name", "Opening_Balance_Dr", "Opening_Balance_Cr", "Period",
        ],
        "sample": ["40000", "Revenue - Vehicle Sales", 0, 0, "2026-01"],
        "triggers_pipeline": True,
    },
    "prior_period": {
        "label": "Prior period",
        "filename": "prior_period.xlsx",
        "sheet": "Prior_Period",
        "diff_key": ["GL_Account", "Period"],
        "headers": ["GL_Account", "Account_Name", "Period", "Debit", "Credit"],
        "sample": ["40000", "Revenue - Vehicle Sales", "2025-09", 0, 4_200_000],
        "triggers_pipeline": True,
    },
}


def file_type_or_400(t: str) -> dict:
    """Look up a file-type descriptor or raise a 400-friendly error."""
    if t not in FILE_TYPES:
        allowed = ", ".join(FILE_TYPES.keys())
        raise ValueError(f"Unknown file type '{t}'. Allowed: {allowed}")
    return FILE_TYPES[t]
