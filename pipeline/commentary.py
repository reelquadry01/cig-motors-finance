"""Auto-generates narrative commentary from financial figures.

All currency labels and thresholds come from pipeline.config.
"""

from .utils import safe_div
from . import config as cfg


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
    fmt = cfg.fmt_amount

    # P&L commentary
    if monthly and len(monthly) >= 2:
        prior = monthly[-2]["revenue"]
        growth = round(safe_div(revenue - prior, prior) * 100, 1) if prior else 0
        trend = "up" if growth > 0 else "down" if growth < 0 else "flat"
        sections["pnl"] = (f"Revenue for the period was {fmt(revenue)}, "
                           f"{abs(growth)}% {trend} vs prior month "
                           f"({fmt(prior)}). "
                           f"Gross margin {gp_margin}%, operating margin {op_margin}%, "
                           f"net margin {pat_margin}%. "
                           f"Operating expenses were {fmt(total_opex)}.")
    else:
        sections["pnl"] = (f"Revenue for the period was {fmt(revenue)}. "
                           f"Gross margin {gp_margin}%, net margin {pat_margin}%.")

    # Balance sheet commentary
    total_assets = bs["total_assets"]
    total_liabilities = bs["total_liabilities"]
    total_equity = bs["total_equity"]
    current_ratio = bs.get("current_ratio", 0)
    sections["balance_sheet"] = (f"Total assets {fmt(total_assets)}, "
                                 f"total liabilities {fmt(total_liabilities)}, "
                                 f"shareholders' equity {fmt(total_equity)}. "
                                 f"Current ratio {current_ratio}x.")

    # Cash flow commentary
    op_cf = cf["operating"]["total"]
    inv_cf = cf["investing"]["total"]
    fin_cf = cf["financing"]["total"]
    net_change = cf["net_change"]
    sections["cash_flow"] = (f"Net cash movement {fmt(net_change)}. "
                             f"Operating {fmt(op_cf)}, "
                             f"investing {fmt(inv_cf)}, "
                             f"financing {fmt(fin_cf)}.")

    # Ratios
    cr = ratios.get("current_ratio", 0)
    de = ratios.get("debt_to_equity", 0)
    sections["ratios"] = (f"Current ratio {cr}x, debt-to-equity {de}%, "
                          f"asset turnover {ratios.get('asset_turnover', 0)}x.")

    # Executive summary
    perf = "profitable" if net_income > 0 else "loss-making"
    sections["executive_summary"] = (f"The company was {perf} for this period with "
                                     f"{fmt(net_income)} net income. "
                                     f"Revenue {fmt(revenue)}, "
                                     f"gross margin {gp_margin}%.")

    # Red flags — use configurable thresholds
    flags = []
    if gp_margin < cfg.THRESHOLD_GP_MARGIN_LOW:
        flags.append({"title": "Low gross margin",
                       "detail": f"Gross margin {gp_margin}% is below {cfg.THRESHOLD_GP_MARGIN_LOW}% threshold"})
    if net_income < 0:
        flags.append({"title": "Loss-making period",
                       "detail": "Company is loss-making for this period"})
    if cr < cfg.THRESHOLD_CR_LOW:
        flags.append({"title": "Liquidity concern",
                       "detail": f"Current ratio {cr}x below {cfg.THRESHOLD_CR_LOW}x"})
    if de > cfg.THRESHOLD_DE_HIGH:
        flags.append({"title": "Elevated leverage",
                       "detail": f"Debt-to-equity {de}% is elevated (threshold {cfg.THRESHOLD_DE_HIGH}%)"})
    sections["red_flags"] = flags if flags else [{"title": "No material concerns",
                                                   "detail": "No material concerns detected"}]

    # Quick wins — generated dynamically based on data availability
    quick_wins = []
    if not ratios.get("inventory_turnover"):
        quick_wins.append({"title": "Inventory turnover",
                           "detail": "Inventory data not yet available for turnover analysis"})
    if not ratios.get("receivables_turnover"):
        quick_wins.append({"title": "Receivables turnover",
                           "detail": "Receivables aging data not yet available"})
    sections["quick_wins"] = quick_wins if quick_wins else [
        {"title": "No quick wins identified",
         "detail": "All key metrics are within normal ranges"}
    ]

    # Pending data
    pending = []
    if not monthly or len(monthly) < 3:
        pending.append({"title": "Prior period data",
                        "detail": "Need at least 3 months for meaningful trend analysis"})
    sections["pending_data"] = pending

    return sections
