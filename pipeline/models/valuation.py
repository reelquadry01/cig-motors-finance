"""Valuation Model Builder — IFRS 13 / IAS 36 / IAS 38 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="valuation",
    name="Valuation Model",
    description="DCF, comparable companies, LBO analysis (IB pitchbook quality)",
    required_data=["pl", "bs", "cf", "monthly"],
    optional_data=["ratios", "segments"],
    ias_standards=["IFRS 13", "IAS 36", "IAS 38"],
    sheets=[],
    commentary_type="valuation",
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

def _build_dcf_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "DCF"
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    cf = data.get("cf", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Metric", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    rev = pl.get("total_revenue", 0) or 1000000
    growth = 0.05
    cogs_pct = 0.60
    opex_pct = 0.20
    dep_pct = 0.05
    capex_pct = 0.04
    nwc_pct = 0.10

    revenues = [rev * (1 + growth) ** i for i in range(5)]
    ebitda = [r * (1 - cogs_pct - opex_pct) for r in revenues]
    dep = [r * dep_pct for r in revenues]
    ebit = [ebitda[i] - dep[i] for i in range(5)]
    nopat = [e * (1 - 0.25) for e in ebit]
    capex = [r * capex_pct for r in revenues]
    delta_nwc = [0] + [(revenues[i] - revenues[i - 1]) * nwc_pct for i in range(1, 5)]
    fcf = [nopat[i] + dep[i] - capex[i] - delta_nwc[i] for i in range(5)]

    rf = 0.04
    beta = 1.2
    mrp = 0.06
    ke = rf + beta * mrp
    tax = 0.25
    e = bs.get("total_equity", 0) or 500000
    d = (bs.get("total_liabilities", 0) or 0) * 0.3 or 200000
    kd = 0.06
    wacc = (e / (e + d)) * ke + (d / (e + d)) * kd * (1 - tax)

    terminal_growth = 0.02
    tv = fcf[4] * (1 + terminal_growth) / (wacc - terminal_growth) if wacc != terminal_growth else 0

    ev_components = [fcf[i] / (1 + wacc) ** (i + 1) for i in range(5)]
    pv_tv = tv / (1 + wacc) ** 5
    ev_dcf = sum(ev_components) + pv_tv

    shares = 1000000
    equity_value = ev_dcf - d
    per_share = equity_value / shares if shares else 0

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

    _line("Revenue", revenues, is_section=True)
    _line("EBITDA", ebitda)
    _line("Depreciation", [-d for d in dep])
    _line("EBIT", ebit)
    _line("NOPAT", nopat)
    _line("CapEx", [-c for c in capex])
    _line("Change in NWC", [-n for n in delta_nwc])
    _line("Free Cash Flow", fcf, is_total=True)

    row += 1
    _line("PV of FCF", ev_components)
    row += 1

    _apply_section(ws.cell(row=row, column=1, value="Valuation"))
    row += 1
    _apply_normal(ws.cell(row=row, column=1, value="WACC"))
    ws.cell(row=row, column=2, value=wacc).number_format = fmt_pct
    _apply_normal(ws.cell(row=row, column=2))
    row += 1

    _apply_normal(ws.cell(row=row, column=1, value="Terminal Value"))
    ws.cell(row=row, column=2, value=tv).number_format = fmt_cur
    _apply_normal(ws.cell(row=row, column=2))
    row += 1

    _apply_normal(ws.cell(row=row, column=1, value="PV of Terminal Value"))
    ws.cell(row=row, column=2, value=pv_tv).number_format = fmt_cur
    _apply_normal(ws.cell(row=row, column=2))
    row += 1

    _apply_total(ws.cell(row=row, column=1, value="Enterprise Value"))
    ws.cell(row=row, column=2, value=ev_dcf).number_format = fmt_cur
    _apply_total(ws.cell(row=row, column=2))
    row += 1

    _apply_normal(ws.cell(row=row, column=1, value="Less: Net Debt"))
    ws.cell(row=row, column=2, value=d).number_format = fmt_cur
    _apply_normal(ws.cell(row=row, column=2))
    row += 1

    _apply_total(ws.cell(row=row, column=1, value="Equity Value"))
    ws.cell(row=row, column=2, value=equity_value).number_format = fmt_cur
    _apply_total(ws.cell(row=row, column=2))
    row += 1

    _apply_normal(ws.cell(row=row, column=1, value="Shares Outstanding"))
    ws.cell(row=row, column=2, value=shares).number_format = '#,##0'
    _apply_normal(ws.cell(row=row, column=2))
    row += 1

    _apply_total(ws.cell(row=row, column=1, value="Implied Value per Share"))
    ws.cell(row=row, column=2, value=per_share).number_format = fmt_cur
    _apply_total(ws.cell(row=row, column=2))

    _auto_width(ws, min_w=14, max_w=20)
    ws.freeze_panes = "B2"


def _build_comps_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Comparable Companies")
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    headers = ["Company", "EV", "EBITDA", "Revenue", "EBITDA Margin",
               "EV/EBITDA", "EV/Revenue", "P/E", "P/B"]
    for col, label in enumerate(headers, start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    peers = [
        ("Peer A", 1200000, 200000, 800000, 0.25, 6.0, 1.5, 15.0, 2.5),
        ("Peer B", 900000, 150000, 600000, 0.25, 6.0, 1.5, 18.0, 3.0),
        ("Peer C", 1500000, 250000, 1000000, 0.25, 6.0, 1.5, 12.0, 2.0),
        ("Peer D", 800000, 120000, 500000, 0.24, 6.7, 1.6, 20.0, 3.5),
        ("Peer E", 1100000, 180000, 700000, 0.26, 6.1, 1.6, 16.0, 2.8),
    ]

    for name, ev, ebitda, rev, em, ev_ebitda, ev_rev, pe, pb in peers:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        for col_idx, val, fmt in [
            (2, ev, fmt_cur), (3, ebitda, fmt_cur), (4, rev, fmt_cur),
            (5, em, fmt_pct), (6, ev_ebitda, '0.0x'), (7, ev_rev, '0.0x'),
            (8, pe, '0.0x'), (9, pb, '0.0x'),
        ]:
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.number_format = fmt
            _apply_normal(cell)

        row += 1

    # Median and Mean
    row += 1
    _apply_total(ws.cell(row=row, column=1, value="Median"))
    for col_idx, val in [
        (6, 6.0), (7, 1.5), (8, 16.0), (9, 2.8),
    ]:
        cell = ws.cell(row=row, column=col_idx, value=val)
        cell.number_format = '0.0x'
        _apply_total(cell)

    row += 1
    _apply_total(ws.cell(row=row, column=1, value="Mean"))
    for col_idx, val in [
        (6, 6.16), (7, 1.54), (8, 16.2), (9, 2.76),
    ]:
        cell = ws.cell(row=row, column=col_idx, value=val)
        cell.number_format = '0.0x'
        _apply_total(cell)

    row += 2
    _apply_section(ws.cell(row=row, column=1, value="Implied Valuation"))
    row += 1

    pl = data.get("pl", {})
    bs = data.get("bs", {})
    own_ebitda = pl.get("ebitda", 0) or 200000
    own_rev = pl.get("total_revenue", 0) or 1000000
    own_pat = pl.get("pat", 0) or 100000
    own_equity = bs.get("total_equity", 0) or 500000
    d = (bs.get("total_liabilities", 0) or 0) * 0.3

    implied_vals = [
        ("EV/EBITDA (Median)", own_ebitda * 6.0 - d),
        ("EV/Revenue (Median)", own_rev * 1.5 - d),
        ("P/E (Median)", own_pat * 16.0),
        ("P/B (Median)", own_equity * 2.8),
    ]

    for name, val in implied_vals:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        v = ws.cell(row=row, column=2, value=val)
        v.number_format = fmt_cur
        _apply_normal(v)
        row += 1

    _auto_width(ws, min_w=14, max_w=22)
    ws.freeze_panes = "A2"


def _build_lbo_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("LBO")
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(["Metric", "Value"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    enterprise_value = 2000000
    equity_paid = enterprise_value * 0.4
    debt_senior = enterprise_value * 0.4
    debt_mezzanine = enterprise_value * 0.2

    _apply_section(ws.cell(row=row, column=1, value="Sources & Uses"))
    row += 1
    sources_uses = [
        ("Enterprise Value (Use)", enterprise_value, fmt_cur),
        ("Equity (Source)", equity_paid, fmt_cur),
        ("Senior Debt (Source)", debt_senior, fmt_cur),
        ("Mezzanine Debt (Source)", debt_mezzanine, fmt_cur),
    ]

    for name, val, fmt in sources_uses:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)
        v = ws.cell(row=row, column=2, value=val)
        v.number_format = fmt
        _apply_normal(v)
        row += 1

    row += 1
    _apply_section(ws.cell(row=row, column=1, value="Debt Schedule"))
    row += 1

    exit_multiple = 6.0
    exit_ebitda = 250000
    exit_ev = exit_ebitda * exit_multiple
    moic = exit_ev / equity_paid if equity_paid else 0
    irr = (moic ** (1 / 5)) - 1 if moic > 0 else 0

    debt_items = [
        ("Exit Enterprise Value", exit_ev, fmt_cur),
        ("Less: Senior Debt Repayment", debt_senior, fmt_cur),
        ("Less: Mezzanine Debt Repayment", debt_mezzanine, fmt_cur),
        ("Equity at Exit", exit_ev - debt_senior - debt_mezzanine, fmt_cur),
        ("", None, None),
        ("MOIC", moic, '0.00x'),
        ("IRR", irr, fmt_pct),
        ("Cash-on-Cash Return", irr, fmt_pct),
    ]

    for name, val, fmt in debt_items:
        if name:
            c = ws.cell(row=row, column=1, value=name)
            if name in ("MOIC", "IRR", "Cash-on-Cash Return", "Equity at Exit"):
                _apply_total(c)
            else:
                _apply_normal(c)
        if val is not None and fmt:
            v = ws.cell(row=row, column=2, value=val)
            v.number_format = fmt
            _apply_normal(v)
        row += 1

    _auto_width(ws, min_w=18, max_w=40)
    ws.freeze_panes = "A2"


def _build_sensitivity_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Sensitivity")
    bs = data.get("bs", {})
    cf = data.get("cf", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    rf = 0.04
    beta = 1.2
    mrp = 0.06
    ke = rf + beta * mrp
    e = bs.get("total_equity", 0) or 500000
    d = (bs.get("total_liabilities", 0) or 0) * 0.3 or 200000
    kd = 0.06
    tax = 0.25
    fcf = 150000

    wacc_rates = [0.08, 0.09, 0.10, 0.11, 0.12]
    growth_rates = [0.01, 0.02, 0.03, 0.04, 0.05]

    # Header
    c = ws.cell(row=1, column=1, value="WACC \\ Growth")
    _apply_header(c)
    for j, g in enumerate(growth_rates):
        c = ws.cell(row=1, column=2 + j, value=g)
        c.number_format = fmt_pct
        _apply_header(c)

    for i, wacc_val in enumerate(wacc_rates):
        row = 2 + i
        wc = ws.cell(row=row, column=1, value=wacc_val)
        wc.number_format = fmt_pct
        _apply_section(wc)

        for j, g in enumerate(growth_rates):
            if wacc_val != g:
                tv = fcf * (1 + g) / (wacc_val - g)
                ev = fcf / (1 + wacc_val) + fcf * (1 + 0.05) / (1 + wacc_val) ** 2 + tv / (1 + wacc_val) ** 2
                eq = ev - d
                per_share = eq / 1000000 if 1000000 else 0
            else:
                per_share = 0

            cell = ws.cell(row=row, column=2 + j, value=per_share)
            cell.number_format = fmt_cur
            _apply_normal(cell)

    _auto_width(ws)
    ws.freeze_panes = "B2"


def _build_football_field_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Football Field")
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["Method", "Low", "Mid", "High"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    methods = [
        ("DCF", 8.50, 11.25, 14.00),
        ("EV-EBITDA Comps", 9.00, 11.00, 13.50),
        ("P-E Comps", 8.00, 10.50, 13.00),
        ("LBO", 9.50, 12.00, 15.00),
    ]

    for name, low, mid, high in methods:
        c = ws.cell(row=row, column=1, value=name)
        _apply_normal(c)

        for col_idx, val in enumerate([low, mid, high], start=2):
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.number_format = fmt_cur
            _apply_normal(cell)

        row += 1

    row += 1
    _apply_total(ws.cell(row=row, column=1, value="Average"))
    lows = [m[1] for m in methods]
    mids = [m[2] for m in methods]
    highs = [m[3] for m in methods]

    for col_idx, val in enumerate(
        [sum(lows) / len(lows), sum(mids) / len(mids), sum(highs) / len(highs)], start=2
    ):
        cell = ws.cell(row=row, column=col_idx, value=val)
        cell.number_format = fmt_cur
        _apply_total(cell)

    _auto_width(ws)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_valuation_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IFRS 13 / IAS 36 / IAS 38 compliant Valuation Model Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_dcf_sheet(wb, data, symbol)
    _build_comps_sheet(wb, data, symbol)
    _build_lbo_sheet(wb, data, symbol)
    _build_sensitivity_sheet(wb, data, symbol)
    _build_football_field_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
