"""Auto-generates narrative commentary from financial figures."""

from .utils import safe_div


def generate_commentary(pl: dict, bs: dict, cf: dict, ratios: dict,
                        monthly: list) -> dict:
    """Generate structured commentary sections from financial data."""
    sections = {}

    revenue = pl["total_revenue"]
    gp_margin = pl["gp_margin"]
    op_margin = pl["op_margin"]
    pat_margin = pl["pat_margin"]
    total_opex = pl["total_opex"]
    net_income = pl["pat"]

    # P&L commentary
    if monthly and len(monthly) >= 2:
        prior = monthly[-2]["revenue"]
        growth = round(safe_div(revenue - prior, prior) * 100, 1) if prior else 0
        trend = "up" if growth > 0 else "down" if growth < 0 else "flat"
        sections["pnl"] = (f"Revenue for the period was NGN {revenue/1e9:.2f}B, "
                           f"{abs(growth)}% {trend} vs prior month "
                           f"(NGN {prior/1e9:.2f}B). "
                           f"Gross margin {gp_margin}%, operating margin {op_margin}%, "
                           f"net margin {pat_margin}%. "
                           f"Operating expenses were NGN {total_opex/1e6:,.0f}M.")
    else:
        sections["pnl"] = (f"Revenue for the period was NGN {revenue/1e9:.2f}B. "
                           f"Gross margin {gp_margin}%, net margin {pat_margin}%.")

    # Balance sheet commentary
    total_assets = bs["total_assets"]
    total_liabilities = bs["total_liabilities"]
    total_equity = bs["total_equity"]
    current_ratio = bs.get("current_ratio", 0)
    sections["balance_sheet"] = (f"Total assets NGN {total_assets/1e9:.2f}B, "
                                 f"total liabilities NGN {total_liabilities/1e9:.2f}B, "
                                 f"shareholders' equity NGN {total_equity/1e9:.2f}B. "
                                 f"Current ratio {current_ratio}x.")

    # Cash flow commentary
    op_cf = cf["operating"]["total"]
    inv_cf = cf["investing"]["total"]
    fin_cf = cf["financing"]["total"]
    net_change = cf["net_change"]
    sections["cash_flow"] = (f"Net cash movement NGN {net_change/1e6:,.0f}M. "
                             f"Operating NGN {op_cf/1e6:,.0f}M, "
                             f"investing NGN {inv_cf/1e6:,.0f}M, "
                             f"financing NGN {fin_cf/1e6:,.0f}M.")

    # Ratios
    cr = ratios.get("current_ratio", 0)
    de = ratios.get("debt_to_equity", 0)
    sections["ratios"] = (f"Current ratio {cr}x, debt-to-equity {de}%, "
                          f"asset turnover {ratios.get('asset_turnover', 0)}x.")

    # Executive summary
    if net_income > 0:
        perf = "profitable"
    else:
        perf = "loss-making"
    sections["executive_summary"] = (f"The company was {perf} for this period with "
                                     f"NGN {net_income/1e6:,.0f}M net income. "
                                     f"Revenue NGN {revenue/1e9:.2f}B, "
                                     f"gross margin {gp_margin}%.")

    # Red flags
    flags = []
    if gp_margin < 15:
        flags.append({"title": "Low gross margin",
                       "detail": f"Gross margin {gp_margin}% is below 15% threshold"})
    if net_income < 0:
        flags.append({"title": "Loss-making period",
                       "detail": "Company is loss-making for this period"})
    if cr < 1.0:
        flags.append({"title": "Liquidity concern",
                       "detail": f"Current ratio {cr}x below 1.0"})
    if de > 200:
        flags.append({"title": "Elevated leverage",
                       "detail": f"Debt-to-equity {de}% is elevated"})
    sections["red_flags"] = flags if flags else [{"title": "No material concerns",
                                                   "detail": "No material concerns detected"}]

    # Quick wins
    sections["quick_wins"] = [{"title": "Load budget data",
                                "detail": "Budget figures not yet available for variance analysis"},
                               {"title": "Review COGS allocation",
                                "detail": "Ensure cost of sales accounts are correctly classified"}]

    # Pending data
    sections["pending_data"] = [{"title": "Budget figures",
                                  "detail": "Budget data not loaded — variance analysis unavailable"},
                                 {"title": "Prior period data",
                                  "detail": "Prior period figures not available for trend analysis"}]

    return sections
