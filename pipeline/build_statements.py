"""Aggregates GL transactions into P&L, Balance Sheet, and Cash Flow."""

import pandas as pd
from .utils import safe_div

# ── Trial balance: account-level source the statements roll up from ──
_CURRENT_ASSET_KW = ["current", "cash", "receivable", "inventor", "prepayment"]
_CURRENT_LIAB_KW = ["current", "payable", "short", "accrued"]


def tb_group(section: str, fs_heading: str):
    """Presentation group an account rolls into, or None if it is not part of
    the trial balance (P&L + balance sheet)."""
    fsl = str(fs_heading or "").lower()
    simple = {
        "Revenue": "Revenue",
        "COGS": "Cost of sales",
        "Cost of Sales": "Cost of sales",
        "Operating Expenses": "Operating expenses",
        "Depreciation": "Depreciation",
        "Other Income": "Other income",
        "Finance Costs": "Finance costs",
        "Tax": "Tax",
        "Equity": "Equity",
    }
    if section in simple:
        return simple[section]
    if section == "Assets":
        return "Current assets" if any(k in fsl for k in _CURRENT_ASSET_KW) else "Non-current assets"
    if section == "Liabilities":
        return "Current liabilities" if any(k in fsl for k in _CURRENT_LIAB_KW) else "Non-current liabilities"
    return None


def build_tb_meta(merged: pd.DataFrame) -> dict:
    """Stable per-account metadata: {code: {name, group, segment}}."""
    out = {}
    cols = ["GL_Code", "Account_Description", "Statement_Section", "FS_Heading", "Segment"]
    df = merged[cols].drop_duplicates(subset=["GL_Code"])
    for _, r in df.iterrows():
        g = tb_group(r["Statement_Section"], r["FS_Heading"])
        if not g:
            continue
        out[str(r["GL_Code"])] = {
            "name": str(r["Account_Description"]) if pd.notna(r["Account_Description"]) else str(r["GL_Code"]),
            "group": g,
            "segment": str(r["Segment"]) if pd.notna(r["Segment"]) else "Corporate",
        }
    return out


def build_tb_amounts(period_df: pd.DataFrame, meta: dict) -> dict:
    """Per-account debit/credit totals for one period: {code: [debit, credit]}."""
    if period_df.empty:
        return {}
    g = period_df.groupby("GL_Code").agg(Debit=("Debit", "sum"), Credit=("Credit", "sum"))
    out = {}
    for code, row in g.iterrows():
        code = str(code)
        if code not in meta:
            continue
        d, c = float(row["Debit"]), float(row["Credit"])
        if abs(d) < 1 and abs(c) < 1:
            continue
        out[code] = [round(d, 2), round(c, 2)]
    return out


def merge_mapping(gl: pd.DataFrame, mapping: pd.DataFrame) -> pd.DataFrame:
    """Left-join GL transactions with statement mapping."""
    gl["GL_Code"] = gl["GL_Code"].astype(str).str.strip()
    merged = gl.merge(mapping, on="GL_Code", how="left")
    merged["Statement_Section"] = merged["Statement_Section"].fillna("Unclassified")
    merged["FS_Heading"] = merged["FS_Heading"].fillna("Unclassified")
    merged["Note_Heading"] = merged["Note_Heading"].fillna("Unclassified")
    merged["CF_Category"] = merged["CF_Category"].fillna("Unclassified")
    merged["Segment"] = merged["Segment"].fillna("Corporate")
    return merged


def _clean_account_label(desc: str, section_hint: str = "") -> str:
    """Tidy a raw GL account description for display in a breakdown row."""
    if not isinstance(desc, str):
        return "Other"
    label = desc.strip()
    # Drop leading statement prefixes like "Revenue - ", "COGS - ", "DE - "
    for prefix in ("Revenue -", "Revenue-", "COGS -", "COGS-", "DE -", "DE-",
                   "Discount -", "Discount-"):
        if label.lower().startswith(prefix.lower()):
            label = label[len(prefix):].strip()
            break
    return label or "Other"


def build_breakdown(merged: pd.DataFrame, section_names, credit_positive: bool) -> list:
    """Build a two-level breakdown (Segment -> account line) for a P&L section.

    Returns a list of segment groups, each:
        {group, value, share, items: [{label, value, share}, ...]}
    Only positive-contribution lines are kept; groups/items sorted desc by value.
    `credit_positive` picks the sign convention (True for income lines).
    """
    if isinstance(section_names, str):
        section_names = [section_names]
    df = merged[merged["Statement_Section"].isin(section_names)].copy()
    if df.empty:
        return []

    if credit_positive:
        df["Amount"] = df["Credit"] - df["Debit"]
    else:
        df["Amount"] = df["Debit"] - df["Credit"]

    grand_total = float(df["Amount"].sum())

    groups = []
    for segment, seg_df in df.groupby("Segment"):
        seg_total = float(seg_df["Amount"].sum())
        if abs(seg_total) < 1:  # skip empty/negligible segments
            continue
        items = []
        acct = seg_df.groupby("Account_Description")["Amount"].sum()
        for desc, amount in acct.items():
            amount = float(amount)
            if abs(amount) < 1:
                continue
            items.append({
                "label": _clean_account_label(desc),
                "value": round(amount, 2),
                "share": round(safe_div(amount, seg_total) * 100, 1),
            })
        items.sort(key=lambda x: x["value"], reverse=True)
        groups.append({
            "group": segment,
            "value": round(seg_total, 2),
            "share": round(safe_div(seg_total, grand_total) * 100, 1),
            "items": items,
        })
    groups.sort(key=lambda x: x["value"], reverse=True)
    return groups


def build_flat(merged: pd.DataFrame, section_names, credit_positive: bool, top: int = 20) -> list:
    """Account-level breakdown for a P&L section (flat, no segment grouping).

    Returns [{label, value, share}] sorted desc by value, capped at `top`
    with the remainder rolled into an "Other" line.
    """
    if isinstance(section_names, str):
        section_names = [section_names]
    df = merged[merged["Statement_Section"].isin(section_names)].copy()
    if df.empty:
        return []
    df["Amount"] = (df["Credit"] - df["Debit"]) if credit_positive else (df["Debit"] - df["Credit"])
    total = float(df["Amount"].sum())
    acct = df.groupby("Account_Description")["Amount"].sum()
    items = []
    for desc, amount in acct.items():
        amount = float(amount)
        if abs(amount) < 1:
            continue
        items.append({
            "label": _clean_account_label(desc),
            "value": round(amount, 2),
            "share": round(safe_div(amount, total) * 100, 1),
        })
    items.sort(key=lambda x: x["value"], reverse=True)
    if len(items) > top:
        head = items[:top]
        rest = sum(i["value"] for i in items[top:])
        head.append({"label": f"Other ({len(items) - top} accounts)",
                     "value": round(rest, 2),
                     "share": round(safe_div(rest, total) * 100, 1)})
        items = head
    return items


def build_pl(merged: pd.DataFrame) -> dict:
    """Build P&L from merged GL data. Expects pre-filtered data."""
    pl_sections = ["Revenue", "COGS", "Cost of Sales", "Operating Expenses",
                   "Other Income", "Finance Costs", "Tax", "Depreciation"]
    df = merged[merged["Statement_Section"].isin(pl_sections)].copy()

    # ── Capital expenditure (PP&E additions in the period) ──
    # Capex is not a P&L cost (it is capitalised), but it is shown alongside
    # cost so management sees total cash going into cost + investment.
    capex_df = merged[
        (merged["Statement_Section"] == "Assets")
        & (merged["FS_Heading"] == "Property, plant and equipment")
        & (merged["Note_Heading"].astype(str).str.contains("Cost", case=False, na=False))
    ].copy()
    capex_df["Amount"] = capex_df["Debit"] - capex_df["Credit"]  # additions positive
    capex_total = float(capex_df["Amount"].sum())
    capex_breakdown = []
    if not capex_df.empty:
        for desc, amt in capex_df.groupby("Account_Description")["Amount"].sum().items():
            amt = float(amt)
            if abs(amt) < 1:
                continue
            capex_breakdown.append({
                "label": _clean_account_label(desc),
                "value": round(amt, 2),
                "share": round(safe_div(amt, capex_total) * 100, 1),
            })
        capex_breakdown.sort(key=lambda x: x["value"], reverse=True)

    grouped = df.groupby(["Statement_Section", "FS_Heading"]).agg(
        Debit=("Debit", "sum"),
        Credit=("Credit", "sum"),
        Net=("Net", "sum"),
    ).reset_index()

    pl_lines = []
    for _, row in grouped.iterrows():
        section = row["Statement_Section"]
        heading = row["FS_Heading"]
        if section in ["Revenue", "Other Income"]:
            amount = row["Credit"] - row["Debit"]
        else:
            amount = row["Debit"] - row["Credit"]
        pl_lines.append({
            "section": section,
            "heading": heading,
            "amount": round(amount, 2),
        })

    revenue = sum(l["amount"] for l in pl_lines if l["section"] == "Revenue")
    cogs = sum(l["amount"] for l in pl_lines if l["section"] in ("COGS", "Cost of Sales"))
    opex = sum(l["amount"] for l in pl_lines if l["section"] == "Operating Expenses")
    depreciation = sum(l["amount"] for l in pl_lines if l["section"] == "Depreciation")
    other_income = sum(l["amount"] for l in pl_lines if l["section"] == "Other Income")
    finance_costs = sum(l["amount"] for l in pl_lines if l["section"] == "Finance Costs")
    tax = sum(l["amount"] for l in pl_lines if l["section"] == "Tax")

    gp = revenue - cogs
    ebit = gp - opex - depreciation + other_income
    pbt = ebit - finance_costs
    pat = pbt - tax

    def items_for(section_names):
        if isinstance(section_names, str):
            section_names = [section_names]
        return [{"label": l["heading"], "value": l["amount"]}
                for l in pl_lines if l["section"] in section_names and l["heading"] != "Unclassified"]

    return {
        "revenue": items_for("Revenue"),
        "revenue_breakdown": build_breakdown(df, "Revenue", credit_positive=True),
        "total_revenue": round(revenue, 2),
        "cogs": items_for(["COGS", "Cost of Sales"]),
        "cogs_breakdown": build_breakdown(df, ["COGS", "Cost of Sales"], credit_positive=False),
        "total_cogs": round(cogs, 2),
        "gross_profit": round(gp, 2),
        "opex": items_for("Operating Expenses"),
        "opex_breakdown": build_flat(df, "Operating Expenses", credit_positive=False),
        "total_opex": round(opex, 2),
        "capex": round(capex_total, 2),
        "capex_breakdown": capex_breakdown,
        "depreciation": items_for("Depreciation"),
        "total_depreciation": round(depreciation, 2),
        "operating_profit": round(ebit, 2),
        "other_income": items_for("Other Income"),
        "total_other_income": round(other_income, 2),
        "finance_costs": items_for("Finance Costs"),
        "total_finance_costs": round(finance_costs, 2),
        "pbt": round(pbt, 2),
        "tax": items_for("Tax"),
        "total_tax": round(tax, 2),
        "pat": round(pat, 2),
        "gp_margin": round(safe_div(gp, revenue) * 100, 1),
        "op_margin": round(safe_div(ebit, revenue) * 100, 1),
        "pbt_margin": round(safe_div(pbt, revenue) * 100, 1),
        "pat_margin": round(safe_div(pat, revenue) * 100, 1),
    }


def build_balance_sheet(merged: pd.DataFrame, account_summary: pd.DataFrame) -> dict:
    """Build Balance Sheet from GL data. Expects pre-filtered data."""
    bs_sections = ["Assets", "Liabilities", "Equity"]
    df = merged[merged["Statement_Section"].isin(bs_sections)].copy()

    grouped = df.groupby(["Statement_Section", "FS_Heading"]).agg(
        Net=("Net", "sum"),
    ).reset_index()

    total_assets = 0
    total_liabilities = 0
    total_equity = 0
    current_assets = []
    non_current_assets = []
    current_liabilities = []
    non_current_liabilities = []
    equity_items = []

    for _, row in grouped.iterrows():
        section = row["Statement_Section"]
        heading = row["FS_Heading"]
        amount = row["Net"]
        if heading == "Unclassified":
            continue

        item = {"label": heading, "value": round(amount, 2)}

        if section == "Assets":
            total_assets += amount
            if any(k in heading.lower() for k in ["current", "cash", "receivable", "inventory", "prepayment"]):
                current_assets.append(item)
            else:
                non_current_assets.append(item)
        elif section == "Liabilities":
            total_liabilities += amount
            if any(k in heading.lower() for k in ["current", "payable", "short", "accrued"]):
                current_liabilities.append(item)
            else:
                non_current_liabilities.append(item)
        elif section == "Equity":
            total_equity += amount
            equity_items.append(item)

    total_ca = sum(i["value"] for i in current_assets)
    total_cl = sum(i["value"] for i in current_liabilities)

    return {
        "current_assets": current_assets,
        "total_current_assets": round(total_ca, 2),
        "non_current_assets": non_current_assets,
        "total_non_current_assets": round(total_assets - total_ca, 2),
        "total_assets": round(total_assets, 2),
        "current_liabilities": current_liabilities,
        "total_current_liabilities": round(total_cl, 2),
        "non_current_liabilities": non_current_liabilities,
        "total_non_current_liabilities": round(total_liabilities - total_cl, 2),
        "total_liabilities": round(total_liabilities, 2),
        "equity": equity_items,
        "total_equity": round(total_equity, 2),
        "net_assets": round(total_assets - total_liabilities, 2),
        "working_capital": round(total_ca - total_cl, 2),
        "current_ratio": round(safe_div(total_ca, total_cl), 2),
        "quick_ratio": round(safe_div(total_ca, total_cl), 2),
    }


def build_cash_flow(merged: pd.DataFrame) -> dict:
    """Build Cash Flow from GL data. Expects pre-filtered data."""
    cf_cats = ["Operating", "Investing", "Financing"]
    df = merged[merged["CF_Category"].isin(cf_cats)].copy()

    grouped = df.groupby(["CF_Category", "FS_Heading"]).agg(
        Net=("Net", "sum"),
    ).reset_index()

    cf_sections = {}
    for cat in ["Operating", "Investing", "Financing"]:
        cat_data = grouped[grouped["CF_Category"] == cat]
        items = [{"label": r["FS_Heading"], "value": round(r["Net"], 2)}
                 for _, r in cat_data.iterrows() if r["FS_Heading"] != "Unclassified"]
        total = sum(i["value"] for i in items)
        cf_sections[cat.lower()] = {
            "items": items,
            "total": round(total, 2),
        }

    net_movement = sum(cf_sections[c]["total"] for c in cf_sections)

    return {
        "operating": cf_sections.get("operating", {"items": [], "total": 0}),
        "investing": cf_sections.get("investing", {"items": [], "total": 0}),
        "financing": cf_sections.get("financing", {"items": [], "total": 0}),
        "net_change": round(net_movement, 2),
        "opening_cash": 0,
        "closing_cash": round(net_movement, 2),
    }


def build_segments(merged: pd.DataFrame) -> list:
    """Build revenue by segment breakdown."""
    df = merged[merged["Statement_Section"] == "Revenue"].copy()

    grouped = df.groupby("Segment").agg(
        Revenue=("Credit", "sum"),
        Debit=("Debit", "sum"),
    ).reset_index()

    segments = []
    for _, row in grouped.iterrows():
        rev = row["Revenue"] - row["Debit"]
        segments.append({
            "segment": row["Segment"],
            "revenue": round(max(rev, 0), 2),
            "cost": round(row["Debit"], 2),
        })

    return segments


def build_budget(budget_df: pd.DataFrame, mapping: pd.DataFrame) -> dict:
    """Aggregate GL-level budget figures into per-period statement lines.

    Returns {period: {total_revenue, total_cogs, gross_profit, total_opex,
    operating_profit}} or {} when no budget has been supplied.
    """
    if budget_df is None or budget_df.empty:
        return {}
    m = budget_df.merge(mapping[["GL_Code", "Statement_Section"]], on="GL_Code", how="left")
    m["Statement_Section"] = m["Statement_Section"].fillna("Unclassified")
    out = {}
    for period, pdf in m.groupby("Period"):
        def s(*sections):
            return float(pdf[pdf["Statement_Section"].isin(sections)]["Budget"].sum())
        rev = s("Revenue")
        cogs = s("COGS", "Cost of Sales")
        opex = s("Operating Expenses")
        dep = s("Depreciation")
        gp = rev - cogs
        op = gp - opex - dep
        out[str(period)] = {
            "total_revenue": round(rev, 2),
            "total_cogs": round(cogs, 2),
            "gross_profit": round(gp, 2),
            "total_opex": round(opex, 2),
            "total_depreciation": round(dep, 2),
            "operating_profit": round(op, 2),
        }
    return out


def build_monthly_summary(merged: pd.DataFrame) -> list:
    """Build monthly P&L summary for trend charts."""
    pl_sections = ["Revenue", "COGS", "Cost of Sales", "Operating Expenses", "Depreciation"]
    df = merged[merged["Statement_Section"].isin(pl_sections)].copy()

    monthly = df.groupby(["Period", "Statement_Section"]).agg(
        Debit=("Debit", "sum"),
        Credit=("Credit", "sum"),
    ).reset_index()

    results = []
    for period in sorted(monthly["Period"].dropna().unique()):
        period_data = monthly[monthly["Period"] == period]
        rev_row = period_data[period_data["Statement_Section"] == "Revenue"]
        cogs_row = period_data[period_data["Statement_Section"].isin(("COGS", "Cost of Sales"))]
        opex_row = period_data[period_data["Statement_Section"].isin(("Operating Expenses", "Depreciation"))]

        revenue = float(rev_row["Credit"].sum() - rev_row["Debit"].sum()) if len(rev_row) else 0
        cogs = float(cogs_row["Debit"].sum() - cogs_row["Credit"].sum()) if len(cogs_row) else 0
        opex = float(opex_row["Debit"].sum() - opex_row["Credit"].sum()) if len(opex_row) else 0

        results.append({
            "period": period,
            "revenue": round(revenue, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(revenue - cogs, 2),
            "operating_expenses": round(opex, 2),
            "operating_profit": round(revenue - cogs - opex, 2),
        })

    return results
