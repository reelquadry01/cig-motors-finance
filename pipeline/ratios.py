"""Calculates financial ratios from statement data."""

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
    operating_cf = cf["operating"]["total"]

    return {
        "current_ratio": bs.get("current_ratio", round(safe_div(total_assets, total_liabilities), 2)),
        "quick_ratio": bs.get("quick_ratio", round(safe_div(total_assets, total_liabilities), 2)),
        "cash_ratio": round(safe_div(operating_cf, total_liabilities), 2),
        "inventory_turnover": 0,
        "receivables_turnover": 0,
        "days_sales_outstanding": 0,
        "days_inventory_outstanding": 0,
        "gross_margin": pl["gp_margin"],
        "operating_margin": pl["op_margin"],
        "net_margin": pl["pat_margin"],
        "roe": round(safe_div(pat, total_equity) * 100, 1),
        "roa": round(safe_div(pat, total_assets) * 100, 1),
        "asset_turnover": round(safe_div(revenue, total_assets), 2),
        "debt_to_equity": round(safe_div(total_liabilities, total_equity) * 100, 1),
        "equity_multiplier": round(safe_div(total_assets, total_equity), 2),
        "interest_coverage": round(safe_div(ebit, pl["total_finance_costs"]), 2) if pl["total_finance_costs"] > 0 else 0,
        "debt_ratio": round(safe_div(total_liabilities, total_assets) * 100, 1),
    }
