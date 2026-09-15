"""Cash & Liquidity Model Builder — IAS 7 / IFRS 7 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="cash_liquidity",
    name="Cash & Liquidity",
    description="Working capital analysis, DSO/DIO/DPO, IFRS 7 maturity",
    required_data=["pl", "bs", "cf"],
    optional_data=["monthly"],
    ias_standards=["IAS 7", "IFRS 7"],
    sheets=[],
    commentary_type="cash_liquidity",
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

def _build_working_capital_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Working Capital"
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
        _apply_normal(v)
        row += 1

    _line("CURRENT ASSETS", None, is_section=True)
    row += 1
    for item in bs.get("current_assets", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Current Assets", bs.get("total_current_assets", 0), is_total=True)
    row += 1

    _line("CURRENT LIABILITIES", None, is_section=True)
    row += 1
    for item in bs.get("current_liabilities", []):
        _line(f"  {item.get('label', '')}", item.get("value", 0))
    _line("Total Current Liabilities", bs.get("total_current_liabilities", 0), is_total=True)
    row += 1

    wc = (bs.get("total_current_assets", 0) or 0) - (bs.get("total_current_liabilities", 0) or 0)
    _line("Working Capital", wc, is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_dso_dio_dpo_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("DSO-DIO-DPO")
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    fmt = '0.0'

    for col, label in enumerate(["Metric", "Days", "Formula"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    revenue = pl.get("total_revenue", 0) or 1
    cogs = abs(pl.get("total_cogs", 0)) or 1

    receivables = 0
    for item in bs.get("current_assets", []):
        if "receivable" in item.get("label", "").lower():
            receivables = item.get("value", 0)
    if not receivables:
        receivables = revenue * 45 / 365

    inventory = 0
    for item in bs.get("current_assets", []):
        if "inventory" in item.get("label", "").lower():
            inventory = item.get("value", 0)
    if not inventory:
        inventory = cogs * 60 / 365

    payables = 0
    for item in bs.get("current_liabilities", []):
        if "payable" in item.get("label", "").lower():
            payables = item.get("value", 0)
    if not payables:
        payables = cogs * 30 / 365

    dso = (receivables / revenue) * 365
    dio = (inventory / cogs) * 365
    dpo = (payables / cogs) * 365

    metrics = [
        ("DSO (Days Sales Outstanding)", dso, "= (Receivables / Revenue) × 365"),
        ("DIO (Days Inventory Outstanding)", dio, "= (Inventory / COGS) × 365"),
        ("DPO (Days Payable Outstanding)", dpo, "= (Payables / COGS) × 365"),
        ("", None, ""),
        ("Cash Conversion Cycle", dso + dio - dpo, "= DSO + DIO - DPO"),
    ]

    for name, val, formula in metrics:
        c = ws.cell(row=row, column=1, value=name)
        if name in ("", "Cash Conversion Cycle"):
            _apply_total(c)
        else:
            _apply_normal(c)
        if val is not None:
            v = ws.cell(row=row, column=2, value=val)
            v.number_format = fmt
            if name == "Cash Conversion Cycle":
                _apply_total(v)
            else:
                _apply_normal(v)
        f = ws.cell(row=row, column=3, value=formula)
        f.font = MUTED_FONT
        row += 1

    _auto_width(ws, min_w=14, max_w=50)
    ws.freeze_panes = "A2"


def _build_cash_conversion_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Cash Conversion Cycle")
    pl = data.get("pl", {})
    bs = data.get("bs", {})

    for col, label in enumerate(["Component", "Days", "Impact on Cash Cycle"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    revenue = pl.get("total_revenue", 0) or 1
    cogs = abs(pl.get("total_cogs", 0)) or 1

    receivables = revenue * 45 / 365
    inventory = cogs * 60 / 365
    payables = cogs * 30 / 365

    dso = (receivables / revenue) * 365
    dio = (inventory / cogs) * 365
    dpo = (payables / cogs) * 365

    components = [
        ("DSO (Receivables)", dso, "Uses cash"),
        ("DIO (Inventory)", dio, "Uses cash"),
        ("DPO (Payables)", dpo, "Frees cash"),
        ("", None, ""),
        ("Cash Conversion Cycle", dso + dio - dpo, ""),
    ]

    for name, val, impact in components:
        c = ws.cell(row=row, column=1, value=name)
        if name in ("", "Cash Conversion Cycle"):
            _apply_total(c)
        else:
            _apply_normal(c)
        if val is not None:
            v = ws.cell(row=row, column=2, value=val)
            v.number_format = '0.0'
            _apply_normal(v)
        im = ws.cell(row=row, column=3, value=impact)
        im.font = MUTED_FONT
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_liquidity_analysis_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Liquidity Analysis")
    bs = data.get("bs", {})
    cf = data.get("cf", {})
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["Maturity Band", "Financial Assets", "Financial Liabilities", "Net Position"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    total_ca = bs.get("total_current_assets", 0) or 0
    total_cl = bs.get("total_current_liabilities", 0) or 0
    total_ncl = bs.get("total_non_current_liabilities", 0) or 0
    total_nca = bs.get("total_non_current_assets", 0) or 0

    bands = [
        ("< 1 month", total_ca * 0.4, total_cl * 0.4),
        ("1–3 months", total_ca * 0.25, total_cl * 0.25),
        ("3–6 months", total_ca * 0.15, total_cl * 0.15),
        ("6–12 months", total_ca * 0.12, total_cl * 0.12),
        ("1–5 years", total_nca * 0.6, total_ncl * 0.6),
        ("> 5 years", total_nca * 0.4, total_ncl * 0.4),
    ]

    for band, assets, liabilities in bands:
        c = ws.cell(row=row, column=1, value=band)
        _apply_normal(c)

        a = ws.cell(row=row, column=2, value=assets)
        a.number_format = fmt_cur
        _apply_normal(a)

        l = ws.cell(row=row, column=3, value=liabilities)
        l.number_format = fmt_cur
        _apply_normal(l)

        net = ws.cell(row=row, column=4, value=assets - liabilities)
        net.number_format = fmt_cur
        _apply_normal(net)

        row += 1

    # Totals row
    row += 1
    _apply_total(ws.cell(row=row, column=1, value="Total"))
    total_a = sum(b[1] for b in bands)
    total_l = sum(b[2] for b in bands)
    for col_idx, val in enumerate([total_a, total_l, total_a - total_l], start=2):
        cell = ws.cell(row=row, column=col_idx, value=val)
        cell.number_format = fmt_cur
        _apply_total(cell)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_sensitivity_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Sensitivity")
    pl = data.get("pl", {})
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["Scenario", "Revenue Impact", "Operating Cash Flow Impact"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    base_rev = pl.get("total_revenue", 0) or 1000000
    base_ocf = 200000

    scenarios = [
        ("Base Case", 0, 0),
        ("Revenue -10%", -0.10, -0.15),
        ("Revenue -20%", -0.20, -0.30),
        ("Revenue -30%", -0.30, -0.45),
        ("Revenue +10%", 0.10, 0.12),
    ]

    for name, rev_chg, ocf_chg in scenarios:
        c = ws.cell(row=row, column=1, value=name)
        if name == "Base Case":
            _apply_total(c)
        else:
            _apply_normal(c)

        rev_impact = base_rev * rev_chg
        ocf_impact = base_ocf * ocf_chg

        r = ws.cell(row=row, column=2, value=rev_impact)
        r.number_format = fmt_cur
        _apply_normal(r)

        o = ws.cell(row=row, column=3, value=ocf_impact)
        o.number_format = fmt_cur
        _apply_normal(o)

        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_cash_liquidity_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IAS 7 / IFRS 7 compliant Cash & Liquidity Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_working_capital_sheet(wb, data, symbol)
    _build_dso_dio_dpo_sheet(wb, data, symbol)
    _build_cash_conversion_sheet(wb, data, symbol)
    _build_liquidity_analysis_sheet(wb, data, symbol)
    _build_sensitivity_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
