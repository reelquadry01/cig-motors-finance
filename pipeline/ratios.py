"""Calculates financial ratios from statement data.

Ratios are computed from P&L, B/S, and C/F dicts built by build_statements.
Working capital ratios use B/S current assets/liabilities subtotals.
"""

from .utils import safe_div


def calculate_ratios(pl: dict, bs: dict, cf: dict) -> dict:
    """Calculate key financial ratios from statements."""
    revenue = pl["total_revenue"]
    gp = pl["gross_profit"]
    ebit = pl["operating_profit"]
    pat = pl["pat"]
    total_assets = bs["total_assets"]
    total_equity = bs["total_equity"]
    total_liabilities = bs["total_liabilities"]
    total_ca = bs.get("total_current_assets", total_assets)
    total_cl = bs.get("total_current_liabilities", total_liabilities)

    # Working capital ratios from B/S subtotals
    current_ratio = bs.get("current_ratio", round(safe_div(total_ca, total_cl), 2))
    quick_ratio = bs.get("quick_ratio", 0)

    # Cash ratio — uses actual cash balance, not operating CF
    cash_and_equivalents = sum(
        i["value"] for i in bs.get("current_assets", [])
        if "cash" in i["label"].lower()
    )

    # Efficiency ratios
    inventory = sum(
        i["value"] for i in bs.get("current_assets", [])
        if "inventor" in i["label"].lower()
    )
    trade_receivables = sum(
        i["value"] for i in bs.get("current_assets", [])
        if "receivable" in i["label"].lower()
    )
    cogs = pl["total_cogs"]
    depreciation = pl.get("total_depreciation", 0)
    total_tax = pl.get("total_tax", 0)
    pbt = pl.get("pbt", 0)

    inventory_turnover = round(safe_div(cogs, inventory), 2) if inventory else 0
    receivables_turnover = round(safe_div(revenue, trade_receivables), 2) if trade_receivables else 0

    # EBITDA
    ebitda = round(ebit + depreciation, 2)
    ebitda_margin = round(safe_div(ebitda, revenue) * 100, 1)

    # Effective tax rate
    effective_tax_rate = round(safe_div(total_tax, pbt) * 100, 1) if pbt else 0

    # Net debt
    total_borrowings = sum(
        i["value"] for i in bs.get("non_current_liabilities", [])
        if "borrowing" in i["label"].lower()
    )
    lease_liability = sum(
        i["value"] for i in bs.get("non_current_liabilities", [])
        if "lease" in i["label"].lower()
    )
    net_debt = round((total_borrowings + lease_liability) - cash_and_equivalents, 2)

    return {
        "current_ratio": current_ratio,
        "quick_ratio": quick_ratio,
        "cash_ratio": round(safe_div(cash_and_equivalents, total_cl), 2),
        "inventory_turnover": inventory_turnover,
        "receivables_turnover": receivables_turnover,
        "days_sales_outstanding": round(safe_div(365, receivables_turnover), 0) if receivables_turnover else 0,
        "days_inventory_outstanding": round(safe_div(365, inventory_turnover), 0) if inventory_turnover else 0,
        "gross_margin": pl["gp_margin"],
        "operating_margin": pl["op_margin"],
        "net_margin": pl["pat_margin"],
        "ebitda": ebitda,
        "ebitda_margin": ebitda_margin,
        "roe": round(safe_div(pat, total_equity) * 100, 1),
        "roa": round(safe_div(pat, total_assets) * 100, 1),
        "asset_turnover": round(safe_div(revenue, total_assets), 2),
        "debt_to_equity": round(safe_div(total_liabilities, total_equity) * 100, 1),
        "equity_multiplier": round(safe_div(total_assets, total_equity), 2),
        "interest_coverage": round(safe_div(ebit, pl["total_finance_costs"]), 2) if pl["total_finance_costs"] > 0 else None,
        "debt_ratio": round(safe_div(total_liabilities, total_assets) * 100, 1),
        "effective_tax_rate": effective_tax_rate,
        "working_capital": bs.get("working_capital", 0),
        "net_debt": net_debt,
        "net_debt_to_ebitda": round(safe_div(net_debt, ebitda * 12), 2) if ebitda else 0,
    }
