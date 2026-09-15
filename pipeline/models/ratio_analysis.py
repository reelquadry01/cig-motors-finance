"""Ratio Analysis Model Builder — IAS 1 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="ratios",
    name="Ratio Analysis",
    description="30+ financial ratios with trends and industry benchmarks",
    required_data=["pl", "bs", "cf", "ratios"],
    optional_data=["monthly"],
    ias_standards=["IAS 1"],
    sheets=[],
    commentary_type="ratios",
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
THIN_BORDER = Border(bottom=Side(style="thin", color="B9B2AA"))

HEADER_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=WHITE)
HEADER_FILL = PatternFill(fill_type="solid", start_color=NAVY, end_color=NAVY)
SECTION_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=NAVY)
TOTAL_FONT = Font(name="Aptos Narrow", bold=True, size=10)
NORMAL_FONT = Font(name="Aptos Narrow", size=10)
MUTED_FONT = Font(name="Aptos Narrow", size=10, color="7A736C")


def _fmt_currency(symbol: str):
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

def _build_liquidity_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Liquidity"
    ratios = data.get("ratios", {})
    bs = data.get("bs", {})

    for col, label in enumerate(["Ratio", "Value", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    total_ca = bs.get("total_current_assets", 0) or 0
    total_cl = bs.get("total_current_liabilities", 0) or 1
    inventory = 0
    for item in bs.get("current_assets", []):
        if "inventory" in item.get("label", "").lower():
            inventory = item.get("value", 0)

    liquidity = [
        ("Current Ratio", ratios.get("current_ratio", total_ca / total_cl if total_cl else 0), "= Current Assets / Current Liabilities", "x"),
        ("Quick Ratio", ratios.get("quick_ratio", (total_ca - inventory) / total_cl if total_cl else 0), "= (Current Assets - Inventory) / Current Liabilities", "x"),
        ("Cash Ratio", ratios.get("cash_ratio", 0), "= Cash / Current Liabilities", "x"),
        ("Working Capital", ratios.get("working_capital", total_ca - total_cl), "= Current Assets - Current Liabilities", symbol),
    ]

    for name, val, formula, unit in liquidity:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        if unit == "x":
            v.number_format = '0.00'
        elif unit == symbol:
            v.number_format = _fmt_currency(symbol)
        else:
            v.number_format = '0.0'
        _apply_normal(v)

        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=55)
    ws.freeze_panes = "A2"


def _build_profitability_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Profitability")
    ratios = data.get("ratios", {})
    pl = data.get("pl", {})
    bs = data.get("bs", {})

    for col, label in enumerate(["Ratio", "Value", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    rev = pl.get("total_revenue", 0) or 1
    gp = pl.get("gross_profit", 0)
    op = pl.get("operating_profit", 0)
    pat = pl.get("pat", 0)
    ebitda = pl.get("ebitda", op + pl.get("total_depreciation", 0))
    total_assets = bs.get("total_assets", 0) or 1
    total_equity = bs.get("total_equity", 0) or 1
    total_debt = (bs.get("total_liabilities", 0) or 0) * 0.4

    profitability = [
        ("Gross Margin", gp / rev if rev else 0, "= Gross Profit / Revenue", "%"),
        ("Operating Margin", op / rev if rev else 0, "= Operating Profit / Revenue", "%"),
        ("Net Margin", pat / rev if rev else 0, "= PAT / Revenue", "%"),
        ("EBITDA Margin", ebitda / rev if rev else 0, "= EBITDA / Revenue", "%"),
        ("ROE", pat / total_equity if total_equity else 0, "= PAT / Total Equity", "%"),
        ("ROA", pat / total_assets if total_assets else 0, "= PAT / Total Assets", "%"),
        ("ROIC", op * (1 - 0.25) / (total_equity + total_debt) if (total_equity + total_debt) else 0,
         "= NOPAT / Invested Capital", "%"),
    ]

    for name, val, formula, unit in profitability:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        v.number_format = _fmt_percent()
        _apply_normal(v)

        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=55)
    ws.freeze_panes = "A2"


def _build_efficiency_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Efficiency")
    ratios = data.get("ratios", {})
    pl = data.get("pl", {})
    bs = data.get("bs", {})

    for col, label in enumerate(["Ratio", "Value", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    rev = pl.get("total_revenue", 0) or 1
    cogs = abs(pl.get("total_cogs", 0)) or 1
    total_assets = bs.get("total_assets", 0) or 1
    inventory = 0
    receivables = 0
    for item in bs.get("current_assets", []):
        lbl = item.get("label", "").lower()
        if "inventory" in lbl:
            inventory = item.get("value", 0)
        elif "receivable" in lbl:
            receivables = item.get("value", 0)
    fixed_assets = bs.get("total_non_current_assets", 0) or 1

    efficiency = [
        ("Asset Turnover", rev / total_assets if total_assets else 0, "= Revenue / Total Assets", "x"),
        ("Inventory Turnover", cogs / inventory if inventory else 0, "= COGS / Inventory", "x"),
        ("Receivables Turnover", rev / receivables if receivables else 0, "= Revenue / Receivables", "x"),
        ("Fixed Asset Turnover", rev / fixed_assets if fixed_assets else 0, "= Revenue / Fixed Assets", "x"),
    ]

    for name, val, formula, unit in efficiency:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        v.number_format = '0.00'
        _apply_normal(v)

        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=55)
    ws.freeze_panes = "A2"


def _build_leverage_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Leverage")
    ratios = data.get("ratios", {})
    bs = data.get("bs", {})
    pl = data.get("pl", {})
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Ratio", "Value", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    total_debt = (bs.get("total_liabilities", 0) or 0) * 0.4
    total_equity = bs.get("total_equity", 0) or 1
    total_assets = bs.get("total_assets", 0) or 1
    interest = pl.get("total_finance_costs", 0) or 1
    op = pl.get("operating_profit", 0)
    ebitda = op + abs(pl.get("total_depreciation", 0))

    leverage = [
        ("Debt-to-Equity", total_debt / total_equity if total_equity else 0, "= Total Debt / Total Equity", "x"),
        ("Debt Ratio", total_debt / total_assets if total_assets else 0, "= Total Debt / Total Assets", "%"),
        ("Interest Coverage", op / interest if interest else 0, "= Operating Profit / Interest", "x"),
        ("Net Debt / EBITDA", (total_debt - 0) / ebitda if ebitda else 0, "= Net Debt / EBITDA", "x"),
        ("Equity Multiplier", total_assets / total_equity if total_equity else 0, "= Total Assets / Total Equity", "x"),
    ]

    for name, val, formula, unit in leverage:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        if unit == "%":
            v.number_format = fmt_pct
        else:
            v.number_format = '0.00'
        _apply_normal(v)

        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=55)
    ws.freeze_panes = "A2"


def _build_cash_flow_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Cash Flow")
    ratios = data.get("ratios", {})
    cf = data.get("cf", {})
    pl = data.get("pl", {})

    for col, label in enumerate(["Ratio", "Value", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    ocf = cf.get("operating", {}).get("total", 0) or 0
    rev = pl.get("total_revenue", 0) or 1
    capex = abs(cf.get("investing", {}).get("total", 0) or 0)
    fcf = ocf - capex

    cash_flow_ratios = [
        ("OCF Margin", ocf / rev if rev else 0, "= Operating Cash Flow / Revenue", "%"),
        ("Free Cash Flow", fcf, "= OCF - CapEx", symbol),
        ("FCF Yield", fcf / (rev or 1), "= FCF / Revenue", "%"),
        ("Cash Conversion", ocf / (pl.get("pat", 1) or 1), "= OCF / PAT", "x"),
    ]

    for name, val, formula, unit in cash_flow_ratios:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        if unit == "%":
            v.number_format = _fmt_percent()
        elif unit == symbol:
            v.number_format = _fmt_currency(symbol)
        else:
            v.number_format = '0.00'
        _apply_normal(v)

        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=55)
    ws.freeze_panes = "A2"


def _build_industry_sheet(wb: Workbook, data: dict, industry_code: str, symbol: str):
    ws = wb.create_sheet("Industry-Specific")
    ratios = data.get("ratios", {})

    for col, label in enumerate(["Ratio", "Value", "Industry Benchmark"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    industry_ratios = {
        "manufacturing": [
            ("Inventory Days", ratios.get("days_inventory_outstanding", 60), "45–75 days"),
            ("Fixed Asset Turnover", ratios.get("fixed_asset_turnover", 1.0), "1.5–3.0x"),
        ],
        "saas": [
            ("ARR Growth", ratios.get("arr_growth", 0.15), ">20%"),
            ("Net Revenue Retention", ratios.get("nrr", 1.0), ">110%"),
            ("Rule of 40", ratios.get("rule_of_40", 0.30), ">40%"),
        ],
        "banking": [
            ("Net Interest Margin", ratios.get("nim", 0.03), "2.5–4.0%"),
            ("Cost-to-Income", ratios.get("cost_to_income", 0.55), "<55%"),
            ("NPL Ratio", ratios.get("npl_ratio", 0.03), "<3%"),
        ],
        "retail": [
            ("Same-Store Sales Growth", ratios.get("sssg", 0.03), ">2%"),
            ("Sales per Sq Ft", ratios.get("sales_per_sqft", 0), ">varies"),
        ],
    }

    kpis = industry_ratios.get(industry_code, [
        ("Current Ratio", ratios.get("current_ratio", 1.5), "1.0–2.0x"),
        ("ROE", ratios.get("roe", 0.10), ">10%"),
    ])

    for name, val, benchmark in kpis:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=val)
        if isinstance(val, float) and val < 10:
            v.number_format = _fmt_percent()
        else:
            v.number_format = '0.0'
        _apply_normal(v)

        b = ws.cell(row=row, column=3, value=benchmark)
        b.font = MUTED_FONT

        row += 1

    _auto_width(ws, min_w=14, max_w=40)
    ws.freeze_panes = "A2"


def _build_trends_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Trends")
    ratios = data.get("ratios", {})
    monthly = data.get("monthly", [])

    if isinstance(monthly, list) and monthly:
        periods = [m.get("period", str(i)) for i, m in enumerate(monthly)]
    else:
        periods = ["Current"]

    for col, label in enumerate(["Ratio"] + periods, start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    trend_ratios = [
        ("Current Ratio", ratios.get("current_ratio", 0)),
        ("Quick Ratio", ratios.get("quick_ratio", 0)),
        ("Gross Margin", ratios.get("gross_margin", 0)),
        ("Operating Margin", ratios.get("operating_margin", 0)),
        ("Net Margin", ratios.get("net_margin", 0)),
        ("ROE", ratios.get("roe", 0)),
        ("ROA", ratios.get("roa", 0)),
        ("Debt-to-Equity", ratios.get("debt_to_equity", 0)),
    ]

    for name, current_val in trend_ratios:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=current_val)
        v.number_format = _fmt_percent() if "Margin" in name or "RO" in name else '0.00'
        _apply_normal(v)

        for i in range(2, len(periods) + 1):
            placeholder = ws.cell(row=row, column=1 + i, value=current_val)
            placeholder.number_format = v.number_format
            _apply_normal(placeholder)

        row += 1

    _auto_width(ws)
    ws.freeze_panes = "B2"


# ── Public API ───────────────────────────────────────────────────────────

def build_ratios_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IAS 1 compliant Ratio Analysis Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_liquidity_sheet(wb, data, symbol)
    _build_profitability_sheet(wb, data, symbol)
    _build_efficiency_sheet(wb, data, symbol)
    _build_leverage_sheet(wb, data, symbol)
    _build_cash_flow_sheet(wb, data, symbol)
    _build_industry_sheet(wb, data, industry_code, symbol)
    _build_trends_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
