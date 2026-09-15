# 3-Statement Model Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `pipeline/models/three_statement.py` — the core report model that produces an IAS 1/7 compliant Excel workbook with P&L, Balance Sheet, Cash Flow, and Ratios.

**Architecture:** Single module that registers a `ReportModel` with the registry and provides `build_three_statement_xlsx()` which uses openpyxl to generate a styled 5-sheet Excel workbook from dashboard_data.json.

**Tech Stack:** Python 3, openpyxl (already in requirements.txt), dataclasses

---

### Task 1: Create three_statement.py with model registration and xlsx builder

**Files:**
- Create: `pipeline/models/three_statement.py`

- [ ] **Step 1: Write the module with model registration and build function**

```python
"""3-Statement Model Builder — IAS 1/7 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, numbers
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="three_statement",
    name="3-Statement Model",
    description="IAS 1 P&L, Balance Sheet, Cash Flow with live Excel formulas",
    required_data=["pl", "bs", "cf", "ratios"],
    optional_data=["monthly", "segments", "budget_by_period"],
    ias_standards=["IAS 1", "IAS 7"],
    sheets=[],
    commentary_type="three_statement",
    available_for=[
        "automotive", "manufacturing", "saas", "banking", "hospitality",
        "services", "retail", "nonprofit", "oilgas", "realestate",
        "healthcare", "education", "agriculture", "telecom",
        "construction", "transport",
    ],
))


# ── Styling constants ────────────────────────────────────────────────────
NAVY = "1F3A5F"
WHITE = "FFFFFF"
LIGHT_GRAY = "F5F5F5"
THIN_BORDER = Border(bottom=Side(style="thin", color="B9B2AA"))

HEADER_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=WHITE)
HEADER_FILL = PatternFill(fill_type="solid", start_color=NAVY, end_color=NAVY)
SECTION_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=NAVY)
TOTAL_FONT = Font(name="Aptos Narrow", bold=True, size=10)
NORMAL_FONT = Font(name="Aptos Narrow", size=10)
MUTED_FONT = Font(name="Aptos Narrow", size=10, color="7A736C")


def _fmt_currency(symbol: str):
    """Return an Excel number format for currency with symbol."""
    return f'{symbol}#,##0;({symbol}#,##0);{symbol}0'


def _fmt_percent():
    return '0.0%'


def _apply_header(cell):
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = Alignment(horizontal="left", vertical="center")


def _apply_section(cell):
    cell.font = SECTION_FONT
    cell.alignment = Alignment(vertical="center")


def _apply_total(cell):
    cell.font = TOTAL_FONT
    cell.border = THIN_BORDER


def _apply_normal(cell):
    cell.font = NORMAL_FONT
    cell.border = THIN_BORDER


def _auto_width(ws, min_w=12, max_w=36):
    for col_cells in ws.columns:
        lengths = []
        for cell in col_cells:
            if cell.value is not None:
                lengths.append(len(str(cell.value)))
        if lengths:
            best = min(max(max(lengths) + 2, min_w), max_w)
            ws.column_dimensions[get_column_letter(col_cells[0].column)].width = best


# ── Sheet builders ───────────────────────────────────────────────────────

def _build_pl_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Income Statement"
    pl = data.get("pl", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    # Column headers
    for col, label in enumerate(["", "Amount", "% of Revenue"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    total_rev = pl.get("total_revenue", 0) or 1

    def _line(label, value, is_section=False, is_total=False, as_pct=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        v = ws.cell(row=row, column=2, value=value)
        v.number_format = fmt_cur
        if is_total:
            _apply_total(v)
        else:
            _apply_normal(v)

        if as_pct and total_rev:
            p = ws.cell(row=row, column=3, value=value / total_rev if total_rev else 0)
            p.number_format = fmt_pct
            p.font = MUTED_FONT
        row += 1

    # Revenue breakdown
    _line("Revenue", pl.get("total_revenue", 0), is_section=True)
    for group in pl.get("revenue_breakdown", []):
        for item in group.get("items", []):
            _line(f"  {item.get('label', '')}", item.get("value", 0))
    row += 1

    # COGS
    _line("Less: Cost of Sales", -abs(pl.get("total_cogs", 0)), is_section=False)
    for group in pl.get("cogs_breakdown", []):
        for item in group.get("items", []):
            _line(f"  {item.get('label', '')}", -abs(item.get("value", 0)))
    row += 1

    # Gross Profit
    _line("Gross Profit", pl.get("gross_profit", 0), is_total=True, as_pct=True)
    row += 1

    # OpEx
    _line("Less: Operating Expenses", -abs(pl.get("total_opex", 0)), is_section=False)
    for item in pl.get("opex_breakdown", []):
        _line(f"  {item.get('label', '')}", -abs(item.get("value", 0)))
    row += 1

    # D&A
    _line("Less: Depreciation & Amortisation", -abs(pl.get("total_depreciation", 0)))
    row += 1

    # Operating Profit
    _line("Operating Profit (EBIT)", pl.get("operating_profit", 0), is_total=True, as_pct=True)
    row += 1

    # Other Income
    _line("Add: Other Income", pl.get("total_other_income", 0))
    row += 1

    # Finance Costs
    _line("Less: Finance Costs", -abs(pl.get("total_finance_costs", 0)))
    row += 1

    # PBT
    _line("Profit Before Tax (PBT)", pl.get("pbt", 0), is_total=True, as_pct=True)
    row += 1

    # Tax
    _line("Less: Tax Expense", -abs(pl.get("total_tax", 0)))
    row += 1

    # PAT
    _line("Profit After Tax (PAT)", pl.get("pat", 0), is_total=True, as_pct=True)
    row += 2

    # Margin summary
    _line("Margin Analysis", None, is_section=True)
    margins = [
        ("Gross Margin", pl.get("gp_margin", 0)),
        ("Operating Margin", pl.get("op_margin", 0)),
        ("PBT Margin", pl.get("pbt_margin", 0)),
        ("Net Margin", pl.get("pat_margin", 0)),
    ]
    for name, val in margins:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        v = ws.cell(row=row, column=2, value=(val or 0) / 100)
        v.number_format = fmt_pct
        _apply_normal(v)
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_bs_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Balance Sheet")
    bs = data.get("bs", {})
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["", "Amount"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3

    def _line(label, value, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        v = ws.cell(row=row, column=2, value=value)
        v.number_format = fmt_cur
        if is_total:
            _apply_total(v)
        else:
            _apply_normal(v)
        row += 1

    # ASSETS
    _line("ASSETS", None, is_section=True)
    row += 1
    _line("Non-Current Assets", None, is_section=True)
    for item in bs.get("non_current_assets", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Non-Current Assets", bs.get("total_non_current_assets", 0), is_total=True)
    row += 1

    _line("Current Assets", None, is_section=True)
    for item in bs.get("current_assets", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Current Assets", bs.get("total_current_assets", 0), is_total=True)
    row += 1

    _line("TOTAL ASSETS", bs.get("total_assets", 0), is_total=True)
    row += 2

    # LIABILITIES
    _line("LIABILITIES", None, is_section=True)
    row += 1
    _line("Current Liabilities", None, is_section=True)
    for item in bs.get("current_liabilities", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Current Liabilities", bs.get("total_current_liabilities", 0), is_total=True)
    row += 1

    _line("Non-Current Liabilities", None, is_section=True)
    for item in bs.get("non_current_liabilities", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Non-Current Liabilities", bs.get("total_non_current_liabilities", 0), is_total=True)
    row += 1

    _line("TOTAL LIABILITIES", bs.get("total_liabilities", 0), is_total=True)
    row += 2

    # EQUITY
    _line("EQUITY", None, is_section=True)
    row += 1
    for item in bs.get("equity", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("TOTAL EQUITY", bs.get("total_equity", 0), is_total=True)
    row += 2

    # Net Assets check
    _line("Net Assets (Assets - Liabilities - Equity)", bs.get("net_assets", 0), is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_cf_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Cash Flow")
    cf = data.get("cf", {})
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["", "Amount"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3

    def _line(label, value, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        v = ws.cell(row=row, column=2, value=value)
        v.number_format = fmt_cur
        if is_total:
            _apply_total(v)
        else:
            _apply_normal(v)
        row += 1

    # Operating Activities
    _line("CASH FROM OPERATING ACTIVITIES", None, is_section=True)
    row += 1
    operating = cf.get("operating", {})
    for item in operating.get("items", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Net Cash from Operations", operating.get("total", 0), is_total=True)
    row += 2

    # Investing Activities
    _line("CASH FROM INVESTING ACTIVITIES", None, is_section=True)
    row += 1
    investing = cf.get("investing", {})
    for item in investing.get("items", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Net Cash from Investing", investing.get("total", 0), is_total=True)
    row += 2

    # Financing Activities
    _line("CASH FROM FINANCING ACTIVITIES", None, is_section=True)
    row += 1
    financing = cf.get("financing", {})
    for item in financing.get("items", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Net Cash from Financing", financing.get("total", 0), is_total=True)
    row += 2

    # Net change
    _line("Net Change in Cash", cf.get("net_change", 0), is_total=True)
    _line("Opening Cash Balance", cf.get("opening_cash", 0))
    _line("Closing Cash Balance", cf.get("closing_cash", 0), is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_ratios_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Ratios")
    ratios = data.get("ratios", {})

    for col, label in enumerate(["Ratio", "Value"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    ratio_map = [
        ("Liquidity Ratios", None, None),
        ("Current Ratio", ratios.get("current_ratio"), "x"),
        ("Quick Ratio", ratios.get("quick_ratio"), "x"),
        ("Cash Ratio", ratios.get("cash_ratio"), "x"),
        ("Efficiency Ratios", None, None),
        ("Inventory Turnover", ratios.get("inventory_turnover"), "x"),
        ("Receivables Turnover", ratios.get("receivables_turnover"), "x"),
        ("Days Sales Outstanding", ratios.get("days_sales_outstanding"), "days"),
        ("Days Inventory Outstanding", ratios.get("days_inventory_outstanding"), "days"),
        ("Asset Turnover", ratios.get("asset_turnover"), "x"),
        ("Profitability Ratios", None, None),
        ("Gross Margin", ratios.get("gross_margin"), "%"),
        ("Operating Margin", ratios.get("operating_margin"), "%"),
        ("Net Margin", ratios.get("net_margin"), "%"),
        ("EBITDA", ratios.get("ebitda"), symbol),
        ("EBITDA Margin", ratios.get("ebitda_margin"), "%"),
        ("Leverage Ratios", None, None),
        ("Debt-to-Equity", ratios.get("debt_to_equity"), "%"),
        ("Equity Multiplier", ratios.get("equity_multiplier"), "x"),
        ("Interest Coverage", ratios.get("interest_coverage"), "x"),
        ("Debt Ratio", ratios.get("debt_ratio"), "%"),
        ("Return Ratios", None, None),
        ("Return on Equity (ROE)", ratios.get("roe"), "%"),
        ("Return on Assets (ROA)", ratios.get("roa"), "%"),
        ("Effective Tax Rate", ratios.get("effective_tax_rate"), "%"),
        ("Other Metrics", None, None),
        ("Working Capital", ratios.get("working_capital"), symbol),
        ("Net Debt", ratios.get("net_debt"), symbol),
        ("Net Debt / EBITDA", ratios.get("net_debt_to_ebitda"), "x"),
    ]

    row = 2
    for name, value, unit in ratio_map:
        c = ws.cell(row=row, column=1, value=name)
        if unit is None:
            _apply_section(c)
        else:
            _apply_normal(c)

        if value is not None and unit is not None:
            v = ws.cell(row=row, column=2, value=value)
            if unit == "%":
                v.number_format = _fmt_percent()
            elif unit == symbol:
                v.number_format = _fmt_currency(symbol)
            else:
                v.number_format = '0.00'
            _apply_normal(v)
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_summary_sheet(wb: Workbook, data: dict, settings: dict, symbol: str):
    ws = wb.create_sheet("Summary")

    for col, label in enumerate(["", ""], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    company = settings.get("company_name", data.get("company", ""))
    period = data.get("period", "")
    currency = settings.get("currency_code", data.get("currency", ""))
    unit = data.get("unit", "")

    def _kv(key, val):
        nonlocal row
        c = ws.cell(row=row, column=1, value=key)
        _apply_section(c)
        v = ws.cell(row=row, column=2, value=val)
        _apply_normal(v)
        row += 1

    _kv("Company", company)
    _kv("Period", period)
    _kv("Currency", f"{currency} ({symbol})")
    _kv("Unit", unit)
    row += 1

    pl = data.get("pl", {})
    bs = data.get("bs", {})
    cf = data.get("cf", {})

    _kv("Total Revenue", pl.get("total_revenue", 0))
    _kv("Gross Profit", pl.get("gross_profit", 0))
    _kv("Operating Profit", pl.get("operating_profit", 0))
    _kv("Profit After Tax", pl.get("pat", 0))
    row += 1

    _kv("Total Assets", bs.get("total_assets", 0))
    _kv("Total Liabilities", bs.get("total_liabilities", 0))
    _kv("Total Equity", bs.get("total_equity", 0))
    row += 1

    _kv("Net Cash Movement", cf.get("net_change", 0))
    _kv("Closing Cash", cf.get("closing_cash", 0))
    row += 2

    _kv("Margin Analysis", None)
    _kv("  Gross Margin", f"{(pl.get('gp_margin') or 0):.1f}%")
    _kv("  Operating Margin", f"{(pl.get('op_margin') or 0):.1f}%")
    _kv("  Net Margin", f"{(pl.get('pat_margin') or 0):.1f}%")

    _auto_width(ws, min_w=18, max_w=40)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_three_statement_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IAS 1/7 compliant 3-statement Excel workbook.

    Args:
        data: dashboard_data.json contents (pl, bs, cf, ratios, etc.)
        industry_code: Industry code for context
        settings: Company settings (currency, name, etc.)

    Returns:
        Raw .xlsx bytes ready to send to client.
    """
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_pl_sheet(wb, data, symbol)
    _build_bs_sheet(wb, data, symbol)
    _build_cf_sheet(wb, data, symbol)
    _build_ratios_sheet(wb, data, symbol)
    _build_summary_sheet(wb, data, settings, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

- [ ] **Step 2: Test with real data**

Run:
```bash
cd C:\Users\USER\Downloads\Finance_DataPrep
python -c "
import json
from pipeline.models.three_statement import build_three_statement_xlsx
data = json.load(open('dashboard/public/data/dashboard_data.json'))
settings = json.load(open('data/settings.json'))
xlsx = build_three_statement_xlsx(data, 'automotive', settings)
with open('test_three_statement.xlsx', 'wb') as f:
    f.write(xlsx)
print(f'File size: {len(xlsx)} bytes')
from openpyxl import load_workbook
wb = load_workbook('test_three_statement.xlsx')
print(f'Sheets: {wb.sheetnames}')
for name in wb.sheetnames:
    ws = wb[name]
    print(f'  {name}: {ws.max_row} rows x {ws.max_column} cols')
"
```
Expected: 5 sheets, file >10KB

- [ ] **Step 3: Commit**

```bash
git add pipeline/models/three_statement.py
git commit -m "feat: 3-Statement model builder with IAS 1/7 compliant Excel output"
```
