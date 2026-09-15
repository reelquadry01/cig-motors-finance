"""Pipeline configuration — company identity, thresholds, and defaults.

All company-specific values live here. The rest of the pipeline reads
from this module so nothing is hardcoded in business logic.

If data/settings.json exists (set via admin UI), the pipeline reads
company name, currency, etc. from there as a fallback.
"""

import json
from pathlib import Path

# ── Load settings from admin UI if available ──
_settings_path = Path(__file__).resolve().parent.parent / "data" / "settings.json"
_defaults = {}
if _settings_path.exists():
    try:
        _defaults = json.loads(_settings_path.read_text(encoding="utf-8"))
    except Exception:
        _defaults = {}

# ── Company identity ──
COMPANY_NAME = _defaults.get("company_name", "CIG Motors")
CURRENCY = _defaults.get("currency_code", "NGN")
CURRENCY_SYMBOL = _defaults.get("currency_symbol", "\u20a6")
UNIT = "millions"

# ── File defaults ──
DEFAULT_GL_SHEET = "GL_Clean"
DEFAULT_MAPPING_SHEET = "Statement Mapping"
DEFAULT_BUDGET_SHEET = "Budget"
DEFAULT_ACCOUNT_SUMMARY_SHEET = "Account_Summary"

# ── P&L sign convention ──
# Credit-positive sections: income/revenue accounts where Credit > Debit = positive
CREDIT_POSITIVE_SECTIONS = {"Revenue", "Other Income", "Other Gains/Losses"}
# Debit-positive sections: cost/expense accounts where Debit > Credit = positive
# (anything not in CREDIT_POSITIVE_SECTIONS)

# ── Balance sheet classification ──
# Current asset keywords (matched against FS_Heading lowercased)
CURRENT_ASSET_KEYWORDS = [
    "current", "cash", "receivable", "inventor", "prepayment",
    "due from", "inventories", "expected credit loss",
]
# Current liability keywords
CURRENT_LIABILITY_KEYWORDS = [
    "current", "payable", "short", "accrued", "current tax",
]

# ── P&L structure ──
# Maps Statement_Section to P&L line; order defines the layout.
# Sections not listed here are ignored for P&L.
PL_SECTION_ORDER = [
    "Revenue",
    "COGS",
    "Cost of Sales",
    "Operating Expenses",
    "Other Income",
    "Other Gains/Losses",
    "Finance Costs",
    "Depreciation",
    "Tax",
]

# ── P&L formula (section groups) ──
PL_COGS_SECTIONS = ["COGS", "Cost of Sales"]
PL_OPEX_SECTIONS = ["Operating Expenses"]
PL_DEPR_SECTIONS = ["Depreciation"]
PL_OTHER_INCOME_SECTIONS = ["Other Income", "Other Gains/Losses"]
PL_FINANCE_SECTIONS = ["Finance Costs"]
PL_TAX_SECTIONS = ["Tax"]

# ── Balance sheet sections ──
BS_ASSET_SECTIONS = ["Assets"]
BS_LIABILITY_SECTIONS = ["Liabilities"]
BS_EQUITY_SECTIONS = ["Equity"]
# "Other" items are reclassified to Assets by default
BS_OTHER_RECLASS = "Assets"

# ── Cash flow categories ──
CF_CATEGORIES = ["Operating", "Investing", "Financing"]

# ── Monthly summary section groups ──
MONTHLY_REVENUE_SECTIONS = ["Revenue"]
MONTHLY_COGS_SECTIONS = ["COGS", "Cost of Sales"]
MONTHLY_OPEX_SECTIONS = ["Operating Expenses"]

# ── Commentary thresholds ──
THRESHOLD_GP_MARGIN_LOW = 15.0   # % — flag if gross margin below this
THRESHOLD_CR_LOW = 1.0           # x  — flag if current ratio below this
THRESHOLD_DE_HIGH = 200.0        # %  — flag if D/E above this

# ── Formatting helpers ──
def fmt_amount(value, unit="auto"):
    """Format a raw currency value for display.

    unit: 'auto', 'full', 'millions', 'billions'
    """
    if unit == "millions":
        return f"{CURRENCY_SYMBOL} {value/1e6:,.0f}M"
    if unit == "billions":
        return f"{CURRENCY_SYMBOL} {value/1e9:.2f}B"
    # auto: pick millions or billions
    abs_val = abs(value)
    if abs_val >= 1e9:
        return f"{CURRENCY_SYMBOL} {value/1e9:.2f}B"
    if abs_val >= 1e6:
        return f"{CURRENCY_SYMBOL} {value/1e6:,.0f}M"
    if abs_val >= 1e3:
        return f"{CURRENCY_SYMBOL} {value/1e3:,.0f}K"
    return f"{CURRENCY_SYMBOL} {value:,.2f}"
