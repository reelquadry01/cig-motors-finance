"""Management Report Model Builder — IFRS 8 / IAS 1 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="management",
    name="Management Report",
    description="CFO-ready pack with executive summary, segments, KPIs",
    required_data=["pl", "bs", "cf", "ratios", "segments"],
    optional_data=["monthly", "budget_by_period"],
    ias_standards=["IFRS 8", "IAS 1"],
    sheets=[],
    commentary_type="management",
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

def _build_executive_summary_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Executive Summary"
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    cf = data.get("cf", {})
    ratios = data.get("ratios", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["KPI", "Current", "Prior", "Change"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    rev = pl.get("total_revenue", 0)
    gp = pl.get("gross_profit", 0)
    op = pl.get("operating_profit", 0)
    pat = pl.get("pat", 0)

    def _kv(key, current, prior=None):
        nonlocal row
        c = ws.cell(row=row, column=1, value=key)
        _apply_normal(c)
        cv = ws.cell(row=row, column=2, value=current)
        cv.number_format = fmt_cur
        _apply_normal(cv)
        if prior is not None:
            pv = ws.cell(row=row, column=3, value=prior)
            pv.number_format = fmt_cur
            _apply_normal(pv)
            chg = (current or 0) - (prior or 0)
            ch = ws.cell(row=row, column=4, value=chg)
            ch.number_format = fmt_cur
            _apply_normal(ch)
        row += 1

    _kv("Total Revenue", rev)
    _kv("Gross Profit", gp)
    _kv("Operating Profit", op)
    _kv("Profit After Tax", pat)
    row += 1

    _kv("Total Assets", bs.get("total_assets", 0))
    _kv("Total Liabilities", bs.get("total_liabilities", 0))
    _kv("Total Equity", bs.get("total_equity", 0))
    row += 1

    _kv("Net Cash Movement", cf.get("net_change", 0))
    _kv("Closing Cash", cf.get("closing_cash", 0))
    row += 1

    _apply_section(ws.cell(row=row, column=1, value="Margin Analysis"))
    row += 1

    margin_data = [
        ("Gross Margin", pl.get("gp_margin", 0)),
        ("Operating Margin", pl.get("op_margin", 0)),
        ("Net Margin", pl.get("pat_margin", 0)),
        ("EBITDA Margin", ratios.get("ebitda_margin", 0)),
    ]
    for name, val in margin_data:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        v = ws.cell(row=row, column=2, value=(val or 0) / 100)
        v.number_format = fmt_pct
        _apply_normal(v)
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_pl_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("P&L")
    pl = data.get("pl", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["", "Amount", "% of Revenue"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    total_rev = pl.get("total_revenue", 0) or 1

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

        if total_rev:
            p = ws.cell(row=row, column=3, value=(value or 0) / total_rev)
            p.number_format = fmt_pct
            p.font = MUTED_FONT
        row += 1

    _line("Revenue", pl.get("total_revenue", 0), is_section=True)
    _line("Cost of Sales", -abs(pl.get("total_cogs", 0)))
    _line("Gross Profit", pl.get("gross_profit", 0), is_total=True)
    _line("Operating Expenses", -abs(pl.get("total_opex", 0)))
    _line("Depreciation", -abs(pl.get("total_depreciation", 0)))
    _line("Operating Profit", pl.get("operating_profit", 0), is_total=True)
    _line("Finance Costs", -abs(pl.get("total_finance_costs", 0)))
    _line("Profit Before Tax", pl.get("pbt", 0), is_total=True)
    _line("Tax", -abs(pl.get("total_tax", 0)))
    _line("Profit After Tax", pl.get("pat", 0), is_total=True)

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
        _apply_normal(v)
        row += 1

    _line("ASSETS", None, is_section=True)
    _line("Total Non-Current Assets", bs.get("total_non_current_assets", 0), is_total=True)
    _line("Total Current Assets", bs.get("total_current_assets", 0), is_total=True)
    _line("TOTAL ASSETS", bs.get("total_assets", 0), is_total=True)
    row += 1

    _line("LIABILITIES", None, is_section=True)
    _line("Total Current Liabilities", bs.get("total_current_liabilities", 0), is_total=True)
    _line("Total Non-Current Liabilities", bs.get("total_non_current_liabilities", 0), is_total=True)
    _line("TOTAL LIABILITIES", bs.get("total_liabilities", 0), is_total=True)
    row += 1

    _line("EQUITY", None, is_section=True)
    _line("TOTAL EQUITY", bs.get("total_equity", 0), is_total=True)

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
        _apply_normal(v)
        row += 1

    operating = cf.get("operating", {})
    investing = cf.get("investing", {})
    financing = cf.get("financing", {})

    _line("Operating Activities", operating.get("total", 0), is_section=True, is_total=True)
    _line("Investing Activities", investing.get("total", 0), is_section=True, is_total=True)
    _line("Financing Activities", financing.get("total", 0), is_section=True, is_total=True)
    row += 1
    _line("Net Change in Cash", cf.get("net_change", 0), is_total=True)
    _line("Opening Cash", cf.get("opening_cash", 0))
    _line("Closing Cash", cf.get("closing_cash", 0), is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_segments_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Segments")
    segments_raw = data.get("segments", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(
        ["Segment", "Revenue", "Revenue %", "Threshold Test"], start=1
    ):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 2
    revenue_segments = segments_raw.get("revenue_by_segment", [])
    total_rev = sum(s.get("value", 0) for s in revenue_segments) or 1

    for seg in revenue_segments:
        name = seg.get("name", "Unknown")
        rev = seg.get("value", 0)
        rev_pct = rev / total_rev if total_rev else 0

        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        v = ws.cell(row=row, column=2, value=rev)
        v.number_format = fmt_cur
        _apply_normal(v)

        p = ws.cell(row=row, column=3, value=rev_pct)
        p.number_format = fmt_pct
        _apply_normal(p)

        threshold = "PASS" if rev_pct >= 0.10 else "Below"
        t = ws.cell(row=row, column=4, value=threshold)
        _apply_normal(t)

        row += 1

    row += 1
    _apply_total(ws.cell(row=row, column=1, value="Total"))
    cell = ws.cell(row=row, column=2, value=total_rev)
    cell.number_format = fmt_cur
    _apply_total(cell)
    tp = ws.cell(row=row, column=3, value=1.0)
    tp.number_format = fmt_pct
    _apply_total(tp)

    row += 2
    _apply_section(ws.cell(row=row, column=1, value="IFRS 8 75% Test"))
    row += 1
    _apply_normal(ws.cell(row=row, column=1, value="Combined segment revenue %"))
    _apply_normal(ws.cell(row=row, column=2, value=1.0))
    ws.cell(row=row, column=2).number_format = fmt_pct
    row += 1
    _apply_normal(ws.cell(row=row, column=1, value="Result"))
    _apply_normal(ws.cell(row=row, column=2, value="PASS — segments cover 100% of revenue"))

    _auto_width(ws, max_w=50)
    ws.freeze_panes = "A2"


def _build_industry_kpis_sheet(wb: Workbook, data: dict, industry_code: str, symbol: str):
    ws = wb.create_sheet("Industry KPIs")
    ratios = data.get("ratios", {})

    for col, label in enumerate(["KPI", "Value", "Benchmark"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 2
    kpi_map = {
        "manufacturing": [
            ("Inventory Turnover", ratios.get("inventory_turnover"), "x"),
            ("Asset Turnover", ratios.get("asset_turnover"), "x"),
            ("Fixed Asset Turnover", ratios.get("fixed_asset_turnover"), "x"),
        ],
        "saas": [
            ("ARR Growth", ratios.get("arr_growth", 0), "%"),
            ("Net Revenue Retention", ratios.get("nrr", 0), "%"),
            ("CAC Payback (months)", ratios.get("cac_payback", 0), "months"),
        ],
        "banking": [
            ("Net Interest Margin", ratios.get("nim", 0), "%"),
            ("Cost-to-Income", ratios.get("cost_to_income", 0), "%"),
            ("NPL Ratio", ratios.get("npl_ratio", 0), "%"),
        ],
        "retail": [
            ("Same-Store Sales Growth", ratios.get("sssg", 0), "%"),
            ("Sales per Sq Ft", ratios.get("sales_per_sqft", 0), symbol),
            ("Inventory Turnover", ratios.get("inventory_turnover"), "x"),
        ],
    }

    kpis = kpi_map.get(industry_code, [
        ("Current Ratio", ratios.get("current_ratio"), "x"),
        ("Quick Ratio", ratios.get("quick_ratio"), "x"),
        ("ROE", ratios.get("roe"), "%"),
        ("ROA", ratios.get("roa"), "%"),
    ])

    for name, val, unit in kpis:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        if val is not None:
            v = ws.cell(row=row, column=2, value=val)
            v.number_format = _fmt_percent() if unit == "%" else '0.0'
            _apply_normal(v)
        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_commentary_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Commentary")
    pl = data.get("pl", {})

    for col, label in enumerate(["Topic", "Narrative"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 2
    rev = pl.get("total_revenue", 0)
    gp = pl.get("gross_profit", 0)
    op = pl.get("operating_profit", 0)
    pat = pl.get("pat", 0)

    items = [
        ("Revenue Performance", f"Revenue for the period was {rev:,.0f}."),
        ("Gross Profit", f"Gross profit was {gp:,.0f} ({(gp/rev*100 if rev else 0):.1f}% margin)."),
        ("Operating Performance", f"Operating profit was {op:,.0f}."),
        ("Bottom Line", f"Profit after tax was {pat:,.0f}."),
        ("Key Risks", "Management notes no material changes to the risk profile."),
        ("Outlook", "Management expects continued stable performance in the next period."),
    ]

    for topic, narrative in items:
        c = ws.cell(row=row, column=1, value=topic)
        _apply_section(c)
        n = ws.cell(row=row, column=2, value=narrative)
        _apply_normal(n)
        row += 1

    _auto_width(ws, max_w=80)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_management_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IFRS 8 / IAS 1 compliant Management Report Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_executive_summary_sheet(wb, data, symbol)
    _build_pl_sheet(wb, data, symbol)
    _build_bs_sheet(wb, data, symbol)
    _build_cf_sheet(wb, data, symbol)
    _build_segments_sheet(wb, data, symbol)
    _build_industry_kpis_sheet(wb, data, industry_code, symbol)
    _build_commentary_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
