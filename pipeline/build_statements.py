"""Aggregates GL transactions into P&L, Balance Sheet, and Cash Flow.

Fully data-driven: reads section names, sign conventions, and classification
rules from pipeline.config so it works with any chart of accounts.
"""

import pandas as pd
from .utils import safe_div
from . import config as cfg


# ── Trial balance: account-level source the statements roll up from ──


def tb_group(section: str, fs_heading: str):
    """Presentation group an account rolls into, or None if it is not part of
    the trial balance (P&L + balance sheet).

    Reads from config to map Statement_Section -> TB group name.
    """
    fsl = str(fs_heading or "").lower()

    # P&L sections: map directly from config
    _pl_map = {
        "Revenue": "Revenue",
        "COGS": "Cost of sales",
        "Cost of Sales": "Cost of sales",
        "Operating Expenses": "Operating expenses",
        "Depreciation": "Depreciation",
        "Other Income": "Other income",
        "Other Gains/Losses": "Other income",
        "Finance Costs": "Finance costs",
        "Tax": "Tax",
    }
    if section in _pl_map:
        return _pl_map[section]

    if section == "Equity":
        return "Equity"

    if section in cfg.BS_ASSET_SECTIONS:
        return ("Current assets"
                if any(k in fsl for k in cfg.CURRENT_ASSET_KEYWORDS)
                else "Non-current assets")

    if section in cfg.BS_LIABILITY_SECTIONS:
        return ("Current liabilities"
                if any(k in fsl for k in cfg.CURRENT_LIABILITY_KEYWORDS)
                else "Non-current liabilities")

    # "Other" is used in the mapping for the inventory and prepayment buckets
    # (Statement_Section = "Other", FS_Heading = "Inventories"/"Prepayment").
    # Elsewhere the pipeline reclassifies "Other" into Assets on the balance
    # sheet; the trial balance was silently dropping it, so opening balances
    # for those accounts never landed. Treat "Other" as a balance-sheet asset
    # here too, using the same current / non-current keyword split.
    if section == "Other":
        return ("Current assets"
                if any(k in fsl for k in cfg.CURRENT_ASSET_KEYWORDS)
                else "Non-current assets")

    return None


def build_tb_meta(merged: pd.DataFrame) -> dict:
    """Stable per-account metadata.

    {code: {name, group, line, note, cf, segment}} where `line` is the
    statement line (FS heading), `note` the note heading and `cf` the cash-flow
    category. These become columns on the exported trial balance so every
    statement, note and schedule can be a SUMIF against it.
    """
    out = {}
    cols = ["GL_Code", "Account_Description", "Statement_Section", "FS_Heading",
            "Note_Heading", "CF_Category", "Segment"]
    # Only include columns that exist
    cols = [c for c in cols if c in merged.columns]
    df = merged[cols].drop_duplicates(subset=["GL_Code"])
    for _, r in df.iterrows():
        g = tb_group(r["Statement_Section"], r["FS_Heading"])
        if not g:
            continue
        s = lambda v, d="": str(v) if pd.notna(v) else d
        out[str(r["GL_Code"])] = {
            "name": s(r.get("Account_Description"), str(r["GL_Code"])),
            "group": g,
            "line": s(r.get("FS_Heading"), g),
            "note": s(r.get("Note_Heading"), s(r.get("FS_Heading"), g)),
            "cf": s(r.get("CF_Category"), ""),
            "segment": s(r.get("Segment"), "Unspecified"),
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
    # Fill missing mapping columns with defaults
    for col, default in [
        ("Statement_Section", "Unclassified"),
        ("FS_Heading", "Unclassified"),
        ("Note_Heading", "Unclassified"),
        ("CF_Category", "Unclassified"),
        ("Segment", "Unspecified"),
        ("Normal_Balance", "Debit"),
    ]:
        if col in merged.columns:
            merged[col] = merged[col].fillna(default)
        else:
            merged[col] = default
    return merged


def _clean_account_label(desc: str, section_hint: str = "") -> str:
    """Tidy a raw GL account description for display in a breakdown row."""
    if not isinstance(desc, str):
        return "Other"
    label = desc.strip()
    # Drop common leading statement prefixes
    for prefix in ("Revenue -", "Revenue-", "COGS -", "COGS-", "DE -", "DE-",
                   "Discount -", "Discount-", "Cost of Sales -", "Cost of Sales-"):
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


def _is_credit_positive(section: str) -> bool:
    """Return True if this P&L section uses credit-positive sign convention."""
    return section in cfg.CREDIT_POSITIVE_SECTIONS


def build_pl(merged: pd.DataFrame) -> dict:
    """Build P&L from merged GL data. Expects pre-filtered data.

    Fully dynamic: reads section groups from config.
    """
    all_pl_sections = set(cfg.PL_SECTION_ORDER)
    df = merged[merged["Statement_Section"].isin(all_pl_sections)].copy()

    # ── Capital expenditure (PP&E additions in the period) ──
    capex_df = merged[
        (merged["Statement_Section"].isin(cfg.BS_ASSET_SECTIONS))
        & (merged["FS_Heading"].astype(str).str.contains("property|plant|equipment", case=False, na=False))
        & (merged["Note_Heading"].astype(str).str.contains("cost|addition", case=False, na=False))
    ].copy()
    capex_df["Amount"] = capex_df["Debit"] - capex_df["Credit"]
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
        if _is_credit_positive(section):
            amount = row["Credit"] - row["Debit"]
        else:
            amount = row["Debit"] - row["Credit"]
        pl_lines.append({
            "section": section,
            "heading": heading,
            "amount": round(amount, 2),
        })

    # Summarise by config-defined section groups
    def sum_sections(groups):
        return sum(l["amount"] for l in pl_lines if l["section"] in groups)

    revenue = sum_sections(["Revenue"])
    cogs = sum_sections(cfg.PL_COGS_SECTIONS)
    opex = sum_sections(cfg.PL_OPEX_SECTIONS)
    depreciation = sum_sections(cfg.PL_DEPR_SECTIONS)
    other_income = sum_sections(cfg.PL_OTHER_INCOME_SECTIONS)
    finance_costs = sum_sections(cfg.PL_FINANCE_SECTIONS)
    tax = sum_sections(cfg.PL_TAX_SECTIONS)

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
        "cogs": items_for(cfg.PL_COGS_SECTIONS),
        "cogs_breakdown": build_breakdown(df, cfg.PL_COGS_SECTIONS, credit_positive=False),
        "total_cogs": round(cogs, 2),
        "gross_profit": round(gp, 2),
        "opex": items_for(cfg.PL_OPEX_SECTIONS),
        "opex_breakdown": build_flat(df, cfg.PL_OPEX_SECTIONS, credit_positive=False),
        "total_opex": round(opex, 2),
        "depreciation": items_for(cfg.PL_DEPR_SECTIONS),
        "total_depreciation": round(depreciation, 2),
        "operating_profit": round(ebit, 2),
        "other_income": items_for(cfg.PL_OTHER_INCOME_SECTIONS),
        "total_other_income": round(other_income, 2),
        "finance_costs": items_for(cfg.PL_FINANCE_SECTIONS),
        "total_finance_costs": round(finance_costs, 2),
        "pbt": round(pbt, 2),
        "tax": items_for(cfg.PL_TAX_SECTIONS),
        "total_tax": round(tax, 2),
        "pat": round(pat, 2),
        "gp_margin": round(safe_div(gp, revenue) * 100, 1),
        "op_margin": round(safe_div(ebit, revenue) * 100, 1),
        "pbt_margin": round(safe_div(pbt, revenue) * 100, 1),
        "pat_margin": round(safe_div(pat, revenue) * 100, 1),
    }


def build_balance_sheet(merged: pd.DataFrame, pl: dict = None) -> dict:
    """Build Balance Sheet from GL data. Expects pre-filtered data.

    Uses Normal_Balance from the statement mapping for correct sign handling:
    - Debit-normal accounts: balance = Net (positive = normal)
    - Credit-normal accounts: balance = -Net (positive = normal)

    If a P&L dict is provided, net income (PAT) is added to equity so that
    Assets = Liabilities + Equity holds.
    """
    bs_sections = (cfg.BS_ASSET_SECTIONS + cfg.BS_LIABILITY_SECTIONS
                   + cfg.BS_EQUITY_SECTIONS + ["Other"])
    df = merged[merged["Statement_Section"].isin(bs_sections)].copy()

    # Reclassify "Other" items into the configured target (default: Assets)
    if cfg.BS_OTHER_RECLASS:
        other_mask = df["Statement_Section"] == "Other"
        if other_mask.any():
            df.loc[other_mask, "Statement_Section"] = cfg.BS_OTHER_RECLASS

    # Compute balance using Normal_Balance from mapping
    df = df.copy()
    def _balance(row):
        nb = str(row.get("Normal_Balance", "Debit")).strip()
        if nb == "Credit":
            return -row["Net"]
        return row["Net"]
    df["Balance"] = df.apply(_balance, axis=1)

    grouped = df.groupby(["Statement_Section", "FS_Heading"]).agg(
        Balance=("Balance", "sum"),
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
        amount = row["Balance"]
        if heading == "Unclassified":
            continue

        item = {"label": heading, "value": round(amount, 2)}

        if section in cfg.BS_ASSET_SECTIONS:
            total_assets += amount
            hl = heading.lower()
            if any(k in hl for k in cfg.CURRENT_ASSET_KEYWORDS):
                current_assets.append(item)
            else:
                non_current_assets.append(item)
        elif section in cfg.BS_LIABILITY_SECTIONS:
            total_liabilities += amount
            hl = heading.lower()
            if any(k in hl for k in cfg.CURRENT_LIABILITY_KEYWORDS):
                current_liabilities.append(item)
            else:
                non_current_liabilities.append(item)
        elif section in cfg.BS_EQUITY_SECTIONS:
            total_equity += amount
            equity_items.append(item)

    total_ca = sum(i["value"] for i in current_assets)
    total_cl = sum(i["value"] for i in current_liabilities)

    # Add net income (PAT) to equity so A = L + E
    if pl:
        pat = pl.get("pat", 0)
        if pat != 0:
            equity_items.append({"label": "Net Income for the Period", "value": round(pat, 2)})
            total_equity += pat

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
        "quick_ratio": round(safe_div(
            total_ca
            - sum(i["value"] for i in current_assets if "inventor" in i["label"].lower())
            - sum(i["value"] for i in current_assets if "prepayment" in i["label"].lower()),
            total_cl), 2),
    }


def build_cash_flow(merged: pd.DataFrame, pl: dict = None, bs: dict = None) -> dict:
    """Build IAS 7 indirect-method Cash Flow from GL data.

    Uses P&L for profit before tax and non-cash add-backs,
    and B/S for working capital changes and financing activities.
    """
    operating_items = []

    # Start with PBT
    pbt = pl.get("pbt", 0) if pl else 0
    operating_items.append({"label": "Profit before tax", "value": round(pbt, 2)})

    # Add back non-cash items
    depreciation = pl.get("total_depreciation", 0) if pl else 0
    if depreciation:
        operating_items.append({"label": "Depreciation & amortization", "value": round(depreciation, 2)})

    finance_costs = pl.get("total_finance_costs", 0) if pl else 0
    if finance_costs:
        operating_items.append({"label": "Interest expense", "value": round(finance_costs, 2)})

    # Working capital changes from B/S
    if bs:
        for item in bs.get("current_assets", []):
            label = item["label"]
            value = item["value"]
            if "cash" in label.lower():
                continue  # Cash is the reconciliation target
            # Increase in current asset = cash outflow (negative)
            operating_items.append({
                "label": f"(Increase)/Decrease in {label}",
                "value": round(-abs(value), 2) if value > 0 else round(abs(value), 2),
            })

        for item in bs.get("current_liabilities", []):
            label = item["label"]
            value = item["value"]
            # Increase in current liability = cash inflow (positive)
            operating_items.append({
                "label": f"Increase/(Decrease) in {label}",
                "value": round(abs(value), 2) if value > 0 else round(-abs(value), 2),
            })

    # Interest paid and tax paid
    if finance_costs:
        operating_items.append({"label": "Interest paid", "value": round(-finance_costs, 2)})
    total_tax = pl.get("total_tax", 0) if pl else 0
    if total_tax:
        operating_items.append({"label": "Income tax paid", "value": round(-total_tax, 2)})

    operating_total = sum(i["value"] for i in operating_items)

    # Investing Activities
    investing_items = []
    capex = 0
    if merged is not None and not merged.empty:
        capex_df = merged[
            (merged["Statement_Section"].isin(cfg.BS_ASSET_SECTIONS))
            & (merged["FS_Heading"].astype(str).str.contains("property|plant|equipment", case=False, na=False))
            & (merged["Note_Heading"].astype(str).str.contains("cost|addition", case=False, na=False))
        ]
        if not capex_df.empty:
            capex = float((capex_df["Debit"] - capex_df["Credit"]).sum())
    if capex:
        investing_items.append({"label": "Purchase of property, plant and equipment", "value": round(-abs(capex), 2)})

    investing_total = sum(i["value"] for i in investing_items)

    # Financing Activities
    financing_items = []
    if bs:
        for item in bs.get("non_current_liabilities", []):
            label = item["label"]
            value = item["value"]
            if "borrowing" in label.lower():
                financing_items.append({"label": f"Proceeds from {label}", "value": round(abs(value), 2)})
            elif "lease" in label.lower():
                financing_items.append({"label": f"Repayment of {label}", "value": round(-abs(value), 2)})

        for item in bs.get("equity", []):
            label = item["label"]
            value = item["value"]
            if "share capital" in label.lower():
                financing_items.append({"label": "Proceeds from share issuance", "value": round(abs(value), 2)})
            elif "deposit for shares" in label.lower():
                financing_items.append({"label": "Deposit for shares received", "value": round(abs(value), 2)})

    financing_total = sum(i["value"] for i in financing_items)

    # Reconciliation
    net_change = round(operating_total + investing_total + financing_total, 2)

    # Opening/closing cash from B/S
    closing_cash = 0
    if bs:
        for item in bs.get("current_assets", []):
            if "cash" in item["label"].lower():
                closing_cash += item["value"]
    opening_cash = round(closing_cash - net_change, 2) if closing_cash else 0

    return {
        "operating": {
            "items": operating_items,
            "total": round(operating_total, 2),
        },
        "investing": {
            "items": investing_items,
            "total": round(investing_total, 2),
        },
        "financing": {
            "items": financing_items,
            "total": round(financing_total, 2),
        },
        "net_change": net_change,
        "opening_cash": opening_cash,
        "closing_cash": round(closing_cash, 2),
    }


def build_segments(merged: pd.DataFrame) -> list:
    """Build revenue by segment breakdown."""
    df = merged[merged["Statement_Section"] == "Revenue"].copy()
    if df.empty:
        return []

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
        cogs = s(*cfg.PL_COGS_SECTIONS)
        opex = s(*cfg.PL_OPEX_SECTIONS)
        dep = s(*cfg.PL_DEPR_SECTIONS)
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
    all_sections = set(cfg.MONTHLY_REVENUE_SECTIONS + cfg.MONTHLY_COGS_SECTIONS
                       + cfg.MONTHLY_OPEX_SECTIONS + cfg.PL_DEPR_SECTIONS
                       + cfg.PL_OTHER_INCOME_SECTIONS)
    df = merged[merged["Statement_Section"].isin(all_sections)].copy()

    monthly = df.groupby(["Period", "Statement_Section"]).agg(
        Debit=("Debit", "sum"),
        Credit=("Credit", "sum"),
    ).reset_index()

    results = []
    for period in sorted(monthly["Period"].dropna().unique()):
        period_data = monthly[monthly["Period"] == period]
        rev_row = period_data[period_data["Statement_Section"].isin(cfg.MONTHLY_REVENUE_SECTIONS)]
        cogs_row = period_data[period_data["Statement_Section"].isin(cfg.MONTHLY_COGS_SECTIONS)]
        opex_row = period_data[period_data["Statement_Section"].isin(cfg.MONTHLY_OPEX_SECTIONS)]

        revenue = float(rev_row["Credit"].sum() - rev_row["Debit"].sum()) if len(rev_row) else 0
        cogs = float(cogs_row["Debit"].sum() - cogs_row["Credit"].sum()) if len(cogs_row) else 0
        opex = float(opex_row["Debit"].sum() - opex_row["Credit"].sum()) if len(opex_row) else 0

        # Include depreciation and other income in monthly OP (align with main P&L)
        dep_sections = set(cfg.PL_DEPR_SECTIONS)
        other_inc_sections = set(cfg.PL_OTHER_INCOME_SECTIONS)
        dep_row = period_data[period_data["Statement_Section"].isin(dep_sections)]
        other_row = period_data[period_data["Statement_Section"].isin(other_inc_sections)]
        dep = float(dep_row["Debit"].sum() - dep_row["Credit"].sum()) if len(dep_row) else 0
        other_inc = float(other_row["Credit"].sum() - other_row["Debit"].sum()) if len(other_row) else 0

        results.append({
            "period": period,
            "revenue": round(revenue, 2),
            "cogs": round(cogs, 2),
            "gross_profit": round(revenue - cogs, 2),
            "operating_expenses": round(opex, 2),
            "depreciation": round(dep, 2),
            "other_income": round(other_inc, 2),
            "operating_profit": round(revenue - cogs - opex - dep + other_inc, 2),
        })

    return results
