"""Main pipeline entry point: reads data, builds statements, outputs JSON."""

import json
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from pipeline.read_data import read_gl_clean, read_statement_mapping, read_account_summary, read_budget
from pipeline.build_statements import (
    merge_mapping, build_pl, build_balance_sheet, build_cash_flow,
    build_segments, build_monthly_summary, build_budget,
)
from pipeline.ratios import calculate_ratios
from pipeline.commentary import generate_commentary


def run_pipeline(
    gl_path: str = "Sample GL_clean.xlsx",
    mapping_path: str = "Statement_Mapping.xlsx",
    budget_path: str = "Budget_Template.xlsx",
    output_path: str = "dashboard/public/data/dashboard_data.json",
    period: str | None = None,
    period_from: str | None = None,
    period_to: str | None = None,
    mode: str = "latest",
):
    """Run the full pipeline and write dashboard_data.json.

    Generates per-period P&L data so React can filter client-side.
    B/S and C/F default to latest period.
    """
    base = Path(__file__).parent.parent

    print("Reading GL data...")
    gl = read_gl_clean(base / gl_path)
    sm = read_statement_mapping(base / mapping_path)
    ac = read_account_summary(base / gl_path)
    print(f"  GL: {len(gl)} transactions, {gl['GL_Code'].nunique()} accounts")
    print(f"  Mapping: {len(sm)} codes")

    print("Merging with statement mapping...")
    merged = merge_mapping(gl, sm)
    unmapped = merged[merged["Statement_Section"] == "Unclassified"]
    if len(unmapped) > 0:
        print(f"  WARNING: {len(unmapped)} transactions unmapped "
              f"(GL codes: {unmapped['GL_Code'].unique().tolist()})")

    # Available periods
    all_periods = sorted(merged["Period"].dropna().unique().tolist())
    all_years = sorted(set(str(p)[:4] for p in all_periods if isinstance(p, str) and len(p) >= 4))

    # Day-level keys (for date-range filtering down to the day)
    merged["Day"] = merged["Doc_Date"].dt.strftime("%Y-%m-%d")
    all_days = sorted(d for d in merged["Day"].dropna().unique().tolist())

    # Determine which period to use for B/S and C/F (point-in-time)
    if mode == "yearly" and period:
        bs_cf_data = merged[merged["Period"].str.startswith(period, na=False)]
        period_label = period
    elif mode == "monthly" and period:
        bs_cf_data = merged[merged["Period"] == period]
        period_label = period
    elif mode == "range" and period_from and period_to:
        bs_cf_data = merged[(merged["Period"] >= period_from) & (merged["Period"] <= period_to)]
        period_label = f"{period_from} to {period_to}"
    else:
        # Default to period with most data
        if all_periods:
            period_counts = merged.dropna(subset=["Period"]).groupby("Period").size()
            best_period = period_counts.idxmax()
            bs_cf_data = merged[merged["Period"] == best_period]
            period_label = str(best_period)
        else:
            bs_cf_data = merged
            period_label = "Unknown"

    print("Building financial statements...")
    # P&L for the selected period
    pl = build_pl(bs_cf_data)
    # B/S and C/F for the selected period
    bs = build_balance_sheet(bs_cf_data, ac)
    cf = build_cash_flow(bs_cf_data)
    segments_raw = build_segments(bs_cf_data)

    # Monthly P&L trend from full dataset
    monthly = build_monthly_summary(merged)

    # Per-period P&L breakdown for client-side filtering
    pl_by_period = {}
    for p in all_periods:
        period_data = merged[merged["Period"] == p]
        pl_by_period[p] = build_pl(period_data)

    # Per-day P&L for day-level date-range filtering. Only days with P&L
    # activity are stored to keep the payload lean.
    pl_by_day = {}
    for day in all_days:
        day_data = merged[merged["Day"] == day]
        pl_d = build_pl(day_data)
        if pl_d["total_revenue"] or pl_d["total_cogs"] or pl_d["total_opex"]:
            pl_by_day[day] = pl_d
    active_days = sorted(pl_by_day.keys())

    # Budget (blank until Budget_Template.xlsx is populated)
    try:
        budget_df = read_budget(base / budget_path)
    except Exception:
        budget_df = None
    budget_by_period = build_budget(budget_df, sm)
    has_budget = len(budget_by_period) > 0
    print(f"  Budget: {'loaded ' + str(len(budget_by_period)) + ' periods' if has_budget else 'none supplied (blank)'}")

    # Format segments
    total_rev = pl["total_revenue"]
    revenue_by_segment = [
        {"name": s["segment"], "value": s["revenue"],
         "share": round(s["revenue"] / total_rev * 100, 1) if total_rev > 0 else 0}
        for s in segments_raw if s["revenue"] > 0
    ]
    opex_items = pl.get("opex", [])
    total_opex = pl["total_opex"]
    opex_by_category = [
        {"name": item["label"], "value": item["value"],
         "share": round(item["value"] / total_opex * 100, 1) if total_opex > 0 else 0}
        for item in opex_items if item["value"] > 0
    ]
    segments = {"revenue_by_segment": revenue_by_segment, "opex_by_category": opex_by_category}

    print(f"  Period: {period_label}")
    print(f"  Revenue: NGN {pl['total_revenue']/1e9:.2f}B")
    print(f"  GP margin: {pl['gp_margin']}%")
    print(f"  Net margin: {pl['pat_margin']}%")

    print("Calculating ratios...")
    ratios = calculate_ratios(pl, bs, cf)

    print("Generating commentary...")
    commentary = generate_commentary(pl, bs, cf, ratios, monthly)

    dashboard_data = {
        "period": period_label,
        "company": "CIG Motors",
        "currency": "NGN",
        "unit": "millions",
        "generated_at": datetime.now().isoformat(),
        "data_sources": {
            "gl_transactions": len(gl),
            "gl_accounts": int(gl["GL_Code"].nunique()),
            "mapping_codes": int(len(sm)),
            "unmapped_transactions": int(len(unmapped)),
        },
        "available_periods": {
            "months": all_periods,
            "years": all_years,
            "days": active_days,
            "date_min": active_days[0] if active_days else None,
            "date_max": active_days[-1] if active_days else None,
        },
        "pl": pl,
        "bs": bs,
        "cf": cf,
        "segments": segments,
        "monthly": monthly,
        "pl_by_period": pl_by_period,
        "pl_by_day": pl_by_day,
        "budget_by_period": budget_by_period,
        "ratios": ratios,
        "commentary": commentary,
        "available_data": {
            "budget": has_budget,
            "covenants": False,
            "prior_period": len(all_periods) > 1,
            "commentary_manual": False,
        },
    }

    out = base / output_path
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(dashboard_data, f, indent=2, default=str)
    print(f"\n  Dashboard data written to {out}")
    print(f"  File size: {out.stat().st_size / 1024:.1f} KB")

    return dashboard_data


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate dashboard data from GL")
    parser.add_argument("--gl", default="Sample GL_complete_dirty.xlsx")
    parser.add_argument("--mapping", default="Statement_Mapping.xlsx")
    parser.add_argument("--budget", default="Budget_Template.xlsx")
    parser.add_argument("--output", default="dashboard/public/data/dashboard_data.json")
    parser.add_argument("--mode", default="latest",
                        choices=["latest", "monthly", "yearly", "range"])
    parser.add_argument("--period", default=None, help="Month (YYYY-MM) or year (YYYY)")
    parser.add_argument("--period-from", default=None, help="Start month (YYYY-MM)")
    parser.add_argument("--period-to", default=None, help="End month (YYYY-MM)")
    args = parser.parse_args()
    run_pipeline(gl_path=args.gl, mapping_path=args.mapping, budget_path=args.budget,
                 output_path=args.output, period=args.period,
                 period_from=args.period_from, period_to=args.period_to, mode=args.mode)
