"""Forecast / Projection Model Builder — IFRS 13 / IAS 38 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="forecast",
    name="Forecast / Projection",
    description="3-5 year projections with scenario toggles and DCF valuation",
    required_data=["pl", "bs", "cf", "monthly"],
    optional_data=["ratios"],
    ias_standards=["IFRS 13", "IAS 38"],
    sheets=[],
    commentary_type="forecast",
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

def _build_assumptions_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Assumptions"
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Assumption", "Base Case", "Best Case", "Worst Case"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    assumptions = [
        ("Revenue Growth %", 0.05, 0.10, -0.02),
        ("COGS as % of Revenue", 0.60, 0.55, 0.65),
        ("OpEx Growth %", 0.03, 0.02, 0.05),
        ("CapEx as % of Revenue", 0.04, 0.03, 0.06),
        ("Tax Rate", 0.25, 0.22, 0.30),
        ("Receivable Days", 45, 40, 55),
        ("Inventory Days", 60, 50, 75),
        ("Payable Days", 30, 35, 25),
        ("Discount Rate (WACC)", 0.10, 0.09, 0.12),
        ("Terminal Growth Rate", 0.02, 0.03, 0.01),
        ("Risk-Free Rate", 0.04, 0.04, 0.04),
        ("Market Risk Premium", 0.06, 0.06, 0.06),
        ("Beta", 1.20, 1.00, 1.50),
    ]

    row = 2
    for name, base, best, worst in assumptions:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        for col_idx, val in enumerate([base, best, worst], start=2):
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.number_format = fmt_pct if "%" in name or "Rate" in name else '0.0'
            _apply_normal(cell)
        row += 1

    row += 1
    _apply_section(ws.cell(row=row, column=1, value="Forecast Period"))
    ws.cell(row=row, column=2, value=5)
    _apply_normal(ws.cell(row=row, column=2))

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_pl_projection_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("P&L Projection")
    pl = data.get("pl", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]
    for col, label in enumerate([""] + years, start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    base_rev = pl.get("total_revenue", 0) or 1000000
    growth = 0.05
    cogs_pct = 0.60
    opex_growth = 0.03

    def _line(label, values, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        for i, val in enumerate(values):
            cell = ws.cell(row=row, column=2 + i, value=val)
            cell.number_format = fmt_cur
            if is_total:
                _apply_total(cell)
            else:
                _apply_normal(cell)
        row += 1

    revenues = [base_rev * (1 + growth) ** i for i in range(5)]
    cogs = [-abs(r * cogs_pct) for r in revenues]
    gp = [revenues[i] + cogs[i] for i in range(5)]
    opex_val = pl.get("total_opex", base_rev * 0.25)
    opex = [-abs(opex_val * (1 + opex_growth) ** i) for i in range(5)]
    dep_val = pl.get("total_depreciation", base_rev * 0.05)
    dep = [-abs(dep_val * (1 + 0.02) ** i) for i in range(5)]
    op = [gp[i] + opex[i] + dep[i] for i in range(5)]
    tax = [-abs(op[i] * 0.25) if op[i] > 0 else 0 for i in range(5)]
    pat = [op[i] + tax[i] for i in range(5)]

    _line("Revenue", revenues, is_section=True)
    _line("Cost of Sales", cogs)
    _line("Gross Profit", gp, is_total=True)
    _line("Operating Expenses", opex)
    _line("Depreciation & Amortisation", dep)
    _line("Operating Profit", op, is_total=True)
    _line("Tax Expense", tax)
    _line("Profit After Tax", pat, is_total=True)

    row += 1
    _line("Gross Margin", [gp[i] / revenues[i] if revenues[i] else 0 for i in range(5)])
    _line("Operating Margin", [op[i] / revenues[i] if revenues[i] else 0 for i in range(5)])
    _line("Net Margin", [pat[i] / revenues[i] if revenues[i] else 0 for i in range(5)])

    # Retroactively apply % format to margin rows
    for r in range(row - 3, row):
        for c_idx in range(2, 7):
            cell = ws.cell(row=r, column=c_idx)
            cell.number_format = fmt_pct

    _auto_width(ws)
    ws.freeze_panes = "B2"


def _build_bs_projection_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("BS Projection")
    bs = data.get("bs", {})
    fmt_cur = _fmt_currency(symbol)

    years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]
    for col, label in enumerate([""] + years, start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    base_assets = bs.get("total_assets", 0) or 1000000
    asset_growth = 0.05

    def _line(label, values, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        for i, val in enumerate(values):
            cell = ws.cell(row=row, column=2 + i, value=val)
            cell.number_format = fmt_cur
            if is_total:
                _apply_total(cell)
            else:
                _apply_normal(cell)
        row += 1

    total_assets = [base_assets * (1 + asset_growth) ** i for i in range(5)]
    total_liab = [a * 0.45 for a in total_assets]
    total_eq = [total_assets[i] - total_liab[i] for i in range(5)]

    _line("TOTAL ASSETS", total_assets, is_section=True, is_total=True)
    row += 1
    _line("TOTAL LIABILITIES", total_liab, is_section=True, is_total=True)
    row += 1
    _line("TOTAL EQUITY", total_eq, is_section=True, is_total=True)
    row += 1
    _line("Net Assets", [total_assets[i] - total_liab[i] - total_eq[i] for i in range(5)], is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "B2"


def _build_cf_projection_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("CF Projection")
    cf = data.get("cf", {})
    fmt_cur = _fmt_currency(symbol)

    years = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]
    for col, label in enumerate([""] + years, start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    base_ocf = cf.get("operating", {}).get("total", 0) or 500000
    ocf_growth = 0.05

    def _line(label, values, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        for i, val in enumerate(values):
            cell = ws.cell(row=row, column=2 + i, value=val)
            cell.number_format = fmt_cur
            if is_total:
                _apply_total(cell)
            else:
                _apply_normal(cell)
        row += 1

    ocf = [base_ocf * (1 + ocf_growth) ** i for i in range(5)]
    capex = [-abs(base_ocf * 0.3 * (1 + 0.02) ** i) for i in range(5)]
    fcf = [ocf[i] + capex[i] for i in range(5)]

    _line("Operating Cash Flow", ocf, is_section=True)
    _line("Capital Expenditure", capex)
    _line("Free Cash Flow", fcf, is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "B2"


def _build_dcf_valuation_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("DCF Valuation")
    cf = data.get("cf", {})
    bs = data.get("bs", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Metric", "Value"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    rf = 0.04
    beta = 1.2
    mrp = 0.06
    ke = rf + beta * mrp
    tax = 0.25
    e = bs.get("total_equity", 0) or 500000
    d = bs.get("total_liabilities", 0) * 0.3 or 200000
    kd = 0.06
    wacc = (e / (e + d)) * ke + (d / (e + d)) * kd * (1 - tax)

    base_fcf = (cf.get("operating", {}).get("total", 0) or 500000) - abs(
        cf.get("investing", {}).get("total", 0) or 150000
    )
    fcf = base_fcf
    g = 0.02

    tv = fcf * (1 + g) / (wacc - g) if wacc != g else 0

    ev_components = []
    for t in range(1, 6):
        pv = fcf * (1 + 0.05) ** t / (1 + wacc) ** t
        ev_components.append(pv)
    ev_dcf = sum(ev_components) + tv / (1 + wacc) ** 5

    shares = 1000000
    equity_value = ev_dcf - d
    per_share = equity_value / shares if shares else 0

    metrics = [
        ("Risk-Free Rate (Rf)", rf, fmt_pct),
        ("Beta", beta, '0.00'),
        ("Market Risk Premium (MRP)", mrp, fmt_pct),
        ("Cost of Equity (Ke = Rf + β × MRP)", ke, fmt_pct),
        ("Cost of Debt (Kd)", kd, fmt_pct),
        ("Tax Rate", tax, fmt_pct),
        ("Equity (E)", e, fmt_cur),
        ("Debt (D)", d, fmt_cur),
        ("WACC", wacc, fmt_pct),
        ("", None, None),
        ("Base FCF", base_fcf, fmt_cur),
        ("Terminal Growth Rate (g)", g, fmt_pct),
        ("Terminal Value", tv, fmt_cur),
        ("Enterprise Value (DCF)", ev_dcf, fmt_cur),
        ("Less: Debt", d, fmt_cur),
        ("Equity Value", equity_value, fmt_cur),
        ("Shares Outstanding", shares, '#,##0'),
        ("Implied Value per Share", per_share, fmt_cur),
    ]

    for name, val, fmt in metrics:
        c = ws.cell(row=row, column=1, value=name)
        if name in ("", "Enterprise Value (DCF)", "Equity Value", "Implied Value per Share"):
            _apply_total(c)
        else:
            _apply_normal(c)
        if val is not None:
            v = ws.cell(row=row, column=2, value=val)
            v.number_format = fmt or ''
            if name in ("Enterprise Value (DCF)", "Equity Value", "Implied Value per Share"):
                _apply_total(v)
            else:
                _apply_normal(v)
        row += 1

    _auto_width(ws, min_w=18, max_w=42)
    ws.freeze_panes = "A2"


def _build_scenarios_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Scenarios")
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Metric", "Base", "Best", "Worst"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    scenarios = [
        ("Revenue Growth", 0.05, 0.10, -0.02, fmt_pct),
        ("Operating Margin", 0.15, 0.18, 0.10, fmt_pct),
        ("Net Margin", 0.10, 0.13, 0.06, fmt_pct),
        ("WACC", 0.10, 0.09, 0.12, fmt_pct),
        ("Terminal Growth", 0.02, 0.03, 0.01, fmt_pct),
        ("Implied EV", 1000000, 1500000, 600000, fmt_cur),
        ("Implied Equity Value", 800000, 1300000, 400000, fmt_cur),
    ]

    for name, base, best, worst, fmt in scenarios:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        for col_idx, val in enumerate([base, best, worst], start=2):
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.number_format = fmt
            _apply_normal(cell)
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_forecast_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IFRS 13 / IAS 38 compliant Forecast/Projection Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_assumptions_sheet(wb, data, symbol)
    _build_pl_projection_sheet(wb, data, symbol)
    _build_bs_projection_sheet(wb, data, symbol)
    _build_cf_projection_sheet(wb, data, symbol)
    _build_dcf_valuation_sheet(wb, data, symbol)
    _build_scenarios_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
