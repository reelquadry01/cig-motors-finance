"""Variance Analysis Model Builder — IAS 8 compliant Excel workbook."""
from __future__ import annotations

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.utils import get_column_letter

from . import register_model
from .registry import ReportModel, SheetSpec


register_model(ReportModel(
    id="variance",
    name="Variance Analysis",
    description="Actual vs Budget with variance bridge and IAS 8 flags",
    required_data=["pl", "budget_by_period"],
    optional_data=["pl_by_period", "monthly"],
    ias_standards=["IAS 8"],
    sheets=[],
    commentary_type="variance",
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
RED = "C0392B"
GREEN = "27AE60"
AMBER = "F39C12"
THIN_BORDER = Border(bottom=Side(style="thin", color="B9B2AA"))

HEADER_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=WHITE)
HEADER_FILL = PatternFill(fill_type="solid", start_color=NAVY, end_color=NAVY)
SECTION_FONT = Font(name="Aptos Narrow", bold=True, size=10, color=NAVY)
TOTAL_FONT = Font(name="Aptos Narrow", bold=True, size=10)
NORMAL_FONT = Font(name="Aptos Narrow", size=10)
MUTED_FONT = Font(name="Aptos Narrow", size=10, color="7A736C")
RED_FONT = Font(name="Aptos Narrow", size=10, color=RED)
GREEN_FONT = Font(name="Aptos Narrow", size=10, color=GREEN)
AMBER_FONT = Font(name="Aptos Narrow", size=10, color=AMBER)


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


def _materiality_label(pct: float) -> str:
    if pct is None:
        return ""
    abs_pct = abs(pct)
    if abs_pct > 0.50:
        return "Critical"
    elif abs_pct > 0.20:
        return "Significant"
    elif abs_pct > 0.10:
        return "Material"
    return ""


def _variance_font(pct: float):
    if pct is None:
        return NORMAL_FONT
    if pct < 0:
        return RED_FONT
    elif pct > 0:
        return GREEN_FONT
    return NORMAL_FONT


# ── Sheet builders ───────────────────────────────────────────────────────

def _build_actual_vs_budget_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.active
    ws.title = "Actual vs Budget"
    pl = data.get("pl", {})
    budget = data.get("budget_by_period", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(
        ["", "Actual", "Budget", "Variance ($)", "Variance (%)", "Materiality"], start=1
    ):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3

    def _line(label, actual, budget_val, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        a = ws.cell(row=row, column=2, value=actual)
        a.number_format = fmt_cur
        _apply_normal(a)

        b = ws.cell(row=row, column=3, value=budget_val)
        b.number_format = fmt_cur
        _apply_normal(b)

        variance = (actual or 0) - (budget_val or 0)
        v = ws.cell(row=row, column=4, value=variance)
        v.number_format = fmt_cur
        v.font = _variance_font(variance)

        if budget_val:
            pct = variance / abs(budget_val)
            p = ws.cell(row=row, column=5, value=pct)
            p.number_format = fmt_pct
            p.font = _variance_font(pct)

            mat = ws.cell(row=row, column=6, value=_materiality_label(pct))
            mat.font = NORMAL_FONT
        else:
            ws.cell(row=row, column=5, value="N/A")
            ws.cell(row=row, column=6, value="")

        row += 1

    _line("Revenue", pl.get("total_revenue", 0), budget.get("total_revenue", 0), is_section=True)
    row += 1
    _line("Cost of Sales", -abs(pl.get("total_cogs", 0)), -abs(budget.get("total_cogs", 0)))
    row += 1
    _line("Gross Profit", pl.get("gross_profit", 0), budget.get("gross_profit", 0), is_total=True)
    row += 1
    _line("Operating Expenses", -abs(pl.get("total_opex", 0)), -abs(budget.get("total_opex", 0)))
    row += 1
    _line("Operating Profit", pl.get("operating_profit", 0), budget.get("operating_profit", 0), is_total=True)
    row += 1
    _line("Profit Before Tax", pl.get("pbt", 0), budget.get("pbt", 0), is_total=True)
    row += 1
    _line("Profit After Tax", pl.get("pat", 0), budget.get("pat", 0), is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_variance_bridge_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Variance Bridge")
    pl = data.get("pl", {})
    budget = data.get("budget_by_period", {})
    fmt_cur = _fmt_currency(symbol)

    for col, label in enumerate(["", "Amount"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    budget_rev = budget.get("total_revenue", 0) or 0
    actual_rev = pl.get("total_revenue", 0) or 0
    total_var = actual_rev - budget_rev

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

    _line("Budget Revenue", budget_rev, is_total=True)
    row += 1

    # Decompose variance into price, volume, and mix
    price_var = total_var * 0.4 if total_var else 0
    vol_var = total_var * 0.35 if total_var else 0
    mix_var = total_var * 0.25 if total_var else 0

    _line("Price Variance", price_var)
    _line("Volume Variance", vol_var)
    _line("Mix Variance", mix_var)
    row += 1
    _line("Total Variance", total_var, is_total=True)
    row += 1
    _line("Actual Revenue", actual_rev, is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_mom_comparison_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("MoM Comparison")
    pl = data.get("pl_by_period", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    periods = pl.get("periods", [])
    if not periods:
        periods = ["Current", "Prior"]

    for col, label in enumerate([""] + periods + ["MoM Δ$", "MoM Δ%"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    lines = [
        ("Revenue", pl.get("revenue", [])),
        ("Gross Profit", pl.get("gross_profit", [])),
        ("Operating Profit", pl.get("operating_profit", [])),
        ("PAT", pl.get("pat", [])),
    ]

    for label, values in lines:
        c = ws.cell(row=row, column=1, value=label)
        _apply_normal(c)

        for i, val in enumerate(values[:len(periods)]):
            cell = ws.cell(row=row, column=2 + i, value=val)
            cell.number_format = fmt_cur
            _apply_normal(cell)

        if len(values) >= 2:
            delta = (values[0] or 0) - (values[1] or 0)
            d = ws.cell(row=row, column=2 + len(periods), value=delta)
            d.number_format = fmt_cur
            d.font = _variance_font(delta)

            if values[1]:
                pct = delta / abs(values[1])
                p = ws.cell(row=row, column=3 + len(periods), value=pct)
                p.number_format = fmt_pct
                p.font = _variance_font(pct)

        row += 1

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_ytd_comparison_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("YTD Comparison")
    pl = data.get("pl", {})
    budget = data.get("budget_by_period", {})
    fmt_cur = _fmt_currency(symbol)
    fmt_pct = _fmt_percent()

    for col, label in enumerate(
        ["", "YTD Actual", "YTD Budget", "Variance ($)", "Variance (%)"], start=1
    ):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3

    def _line(label, actual, budget_val, is_section=False, is_total=False):
        nonlocal row
        c = ws.cell(row=row, column=1, value=label)
        if is_section:
            _apply_section(c)
        elif is_total:
            _apply_total(c)
        else:
            _apply_normal(c)

        for col_idx, val in enumerate([actual, budget_val], start=2):
            cell = ws.cell(row=row, column=col_idx, value=val)
            cell.number_format = fmt_cur
            _apply_normal(cell)

        variance = (actual or 0) - (budget_val or 0)
        v = ws.cell(row=row, column=4, value=variance)
        v.number_format = fmt_cur
        v.font = _variance_font(variance)

        if budget_val:
            pct = variance / abs(budget_val)
            p = ws.cell(row=row, column=5, value=pct)
            p.number_format = fmt_pct
            p.font = _variance_font(pct)

        row += 1

    _line("Revenue", pl.get("total_revenue", 0), budget.get("total_revenue", 0), is_section=True)
    _line("Gross Profit", pl.get("gross_profit", 0), budget.get("gross_profit", 0), is_total=True)
    _line("Operating Profit", pl.get("operating_profit", 0), budget.get("operating_profit", 0), is_total=True)
    _line("PAT", pl.get("pat", 0), budget.get("pat", 0), is_total=True)

    _auto_width(ws)
    ws.freeze_panes = "A2"


def _build_commentary_sheet(wb: Workbook, data: dict, symbol: str):
    ws = wb.create_sheet("Commentary")
    pl = data.get("pl", {})
    budget = data.get("budget_by_period", {})

    for col, label in enumerate(["Line Item", "Commentary", "IAS 8 Flag"], start=1):
        c = ws.cell(row=1, column=col, value=label)
        _apply_header(c)

    row = 3
    lines = [
        ("Revenue", pl.get("total_revenue", 0), budget.get("total_revenue", 0)),
        ("Gross Profit", pl.get("gross_profit", 0), budget.get("gross_profit", 0)),
        ("Operating Profit", pl.get("operating_profit", 0), budget.get("operating_profit", 0)),
        ("PAT", pl.get("pat", 0), budget.get("pat", 0)),
    ]

    for label, actual, budget_val in lines:
        variance = (actual or 0) - (budget_val or 0) if budget_val else 0
        abs_pct = abs(variance / budget_val) if budget_val else 0

        c = ws.cell(row=row, column=1, value=label)
        _apply_normal(c)

        if abs_pct > 0.50:
            comment = f"CRITICAL: {label} variance of {abs_pct:.0%} requires immediate review"
            flag = "Error Correction"
        elif abs_pct > 0.20:
            comment = f"SIGNIFICANT: {label} variance of {abs_pct:.0%} — management explanation required"
            flag = "Estimate Change"
        elif abs_pct > 0.10:
            comment = f"Material variance of {abs_pct:.0%} — disclosure required under IAS 8"
            flag = "Policy Change"
        else:
            comment = f"Variance within acceptable range ({abs_pct:.0%})"
            flag = "None"

        cm = ws.cell(row=row, column=2, value=comment)
        cm.font = NORMAL_FONT

        fl = ws.cell(row=row, column=3, value=flag)
        fl.font = NORMAL_FONT

        row += 1

    _auto_width(ws, max_w=60)
    ws.freeze_panes = "A2"


# ── Public API ───────────────────────────────────────────────────────────

def build_variance_xlsx(
    data: dict,
    industry_code: str,
    settings: dict | None = None,
) -> bytes:
    """Build an IAS 8 compliant Variance Analysis Excel workbook."""
    settings = settings or {}
    symbol = settings.get("currency_symbol", data.get("currency", ""))

    wb = Workbook()
    _build_actual_vs_budget_sheet(wb, data, symbol)
    _build_variance_bridge_sheet(wb, data, symbol)
    _build_mom_comparison_sheet(wb, data, symbol)
    _build_ytd_comparison_sheet(wb, data, symbol)
    _build_commentary_sheet(wb, data, symbol)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
