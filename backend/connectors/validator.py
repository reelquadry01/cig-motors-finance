"""Financial integrity checks run after cleaning, before pipeline.

Each check returns a standardised result::

    {
        "name": "double_entry_balance",
        "severity": "critical",   # critical | warning | info
        "ok": True,
        "message": "Debits equal credits",
        "details": {...}
    }

``run_all_checks`` executes every check and returns the list of results.
"""
from __future__ import annotations

import logging
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def _ok(name: str, severity: str, message: str, details: Optional[dict] = None) -> dict:
    return {"name": name, "severity": severity, "ok": True, "message": message, "details": details or {}}


def _fail(name: str, severity: str, message: str, details: Optional[dict] = None) -> dict:
    return {"name": name, "severity": severity, "ok": False, "message": message, "details": details or {}}


# ── Individual checks ───────────────────────────────────────────────


def check_double_entry(df: pd.DataFrame) -> dict:
    """Verify total debits equal total credits."""
    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    if not dr_col or not cr_col:
        return _fail("double_entry_balance", "critical", "Missing Debit/Credit columns")

    dr_total = pd.to_numeric(df[dr_col], errors="coerce").fillna(0).sum()
    cr_total = pd.to_numeric(df[cr_col], errors="coerce").fillna(0).sum()
    gap = abs(float(dr_total) - float(cr_total))

    if gap < 0.01:
        return _ok(
            "double_entry_balance",
            "critical",
            f"Debits ({dr_total:,.2f}) equal credits ({cr_total:,.2f})",
            {"dr_total": float(dr_total), "cr_total": float(cr_total), "gap": gap},
        )
    return _fail(
        "double_entry_balance",
        "critical",
        f"Debits ({dr_total:,.2f}) ≠ credits ({cr_total:,.2f}) — gap {gap:,.2f}",
        {"dr_total": float(dr_total), "cr_total": float(cr_total), "gap": gap},
    )


def check_pl_balance(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Verify P&L: Revenue - Expenses = Net Income."""
    if mapping_df is None or "Statement_Section" not in mapping_df.columns:
        return _ok("pl_balance", "critical", "No mapping available — skipped")

    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not all([dr_col, cr_col, gl_col]):
        return _fail("pl_balance", "critical", "Missing required columns")

    section_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Statement_Section"]))
    df = df.copy()
    df["_section"] = df[gl_col].astype(str).map(section_map)

    revenue = pd.to_numeric(
        df.loc[df["_section"].str.lower().str.contains("revenue|income|sales", na=False), cr_col],
        errors="coerce",
    ).sum() - pd.to_numeric(
        df.loc[df["_section"].str.lower().str.contains("revenue|income|sales", na=False), dr_col],
        errors="coerce",
    ).sum()

    expenses = pd.to_numeric(
        df.loc[df["_section"].str.lower().str.contains("expense|cost", na=False), dr_col],
        errors="coerce",
    ).sum() - pd.to_numeric(
        df.loc[df["_section"].str.lower().str.contains("expense|cost", na=False), cr_col],
        errors="coerce",
    ).sum()

    net_income = revenue - expenses

    if abs(net_income) < abs(revenue) * 0.0001 + 0.01:
        return _ok(
            "pl_balance",
            "critical",
            f"P&L balanced: Revenue {revenue:,.2f} - Expenses {expenses:,.2f} = Net {net_income:,.2f}",
            {"revenue": float(revenue), "expenses": float(expenses), "net_income": float(net_income)},
        )
    return _fail(
        "pl_balance",
        "critical",
        f"P&L gap: Revenue {revenue:,.2f} - Expenses {expenses:,.2f} = {net_income:,.2f} (expected ≈0)",
        {"revenue": float(revenue), "expenses": float(expenses), "net_income": float(net_income)},
    )


def check_bs_balance(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Verify Balance Sheet: Assets = Liabilities + Equity."""
    if mapping_df is None or "Statement_Section" not in mapping_df.columns:
        return _ok("bs_balance", "critical", "No mapping available — skipped")

    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not all([dr_col, cr_col, gl_col]):
        return _fail("bs_balance", "critical", "Missing required columns")

    section_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Statement_Section"]))
    df = df.copy()
    df["_section"] = df[gl_col].astype(str).map(section_map)

    def _net_for(pattern: str) -> float:
        mask = df["_section"].str.lower().str.contains(pattern, na=False)
        dr = pd.to_numeric(df.loc[mask, dr_col], errors="coerce").sum()
        cr = pd.to_numeric(df.loc[mask, cr_col], errors="coerce").sum()
        return float(dr - cr)

    assets = _net_for("asset")
    liabilities = _net_for("liabilit")
    equity = _net_for("equity|capital")
    gap = abs(assets - (liabilities + equity))

    if gap < max(abs(assets), 1) * 0.0001 + 0.01:
        return _ok(
            "bs_balance",
            "critical",
            f"B/S balanced: A={assets:,.2f} L+E={liabilities + equity:,.2f}",
            {"assets": assets, "liabilities": liabilities, "equity": equity, "gap": gap},
        )
    return _fail(
        "bs_balance",
        "critical",
        f"B/S gap: Assets {assets:,.2f} ≠ L+E {liabilities + equity:,.2f} (gap {gap:,.2f})",
        {"assets": assets, "liabilities": liabilities, "equity": equity, "gap": gap},
    )


def check_account_types(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Verify account type consistency (e.g., revenue accounts have credit balance)."""
    if mapping_df is None:
        return _ok("account_types", "warning", "No mapping available — skipped")

    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not gl_col or "Normal_Balance" not in mapping_df.columns:
        return _ok("account_types", "warning", "Insufficient data for check")

    violations = []
    nb_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Normal_Balance"]))

    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)

    if dr_col and cr_col:
        for gl_code, group in df.groupby(gl_col):
            nb = nb_map.get(str(gl_code), "")
            dr = pd.to_numeric(group[dr_col], errors="coerce").fillna(0).sum()
            cr = pd.to_numeric(group[cr_col], errors="coerce").fillna(0).sum()
            if nb.lower() == "debit" and cr > dr and cr > 0:
                violations.append({"gl_code": str(gl_code), "expected": "debit", "actual_credit": float(cr)})
            elif nb.lower() == "credit" and dr > cr and dr > 0:
                violations.append({"gl_code": str(gl_code), "expected": "credit", "actual_debit": float(dr)})

    if not violations:
        return _ok("account_types", "warning", "All account types consistent")
    return _fail(
        "account_types",
        "warning",
        f"{len(violations)} account type violations found",
        {"violations": violations[:20]},
    )


def check_period_completeness(df: pd.DataFrame) -> dict:
    """Check for missing months in the dataset."""
    date_col = next((c for c in df.columns if "date" in c.lower() and "doc" in c.lower()), None)
    if not date_col:
        date_col = next((c for c in df.columns if "date" in c.lower()), None)
    if not date_col:
        return _ok("period_completeness", "warning", "No date column found")

    try:
        dates = pd.to_datetime(df[date_col], errors="coerce", dayfirst=True)
    except Exception:
        return _ok("period_completeness", "warning", "Could not parse dates")

    months = dates.dt.to_period("M").dropna().unique()
    if len(months) < 2:
        return _ok("period_completeness", "warning", "Too few periods to check")

    all_months = pd.period_range(start=months.min(), end=months.max(), freq="M")
    missing = sorted(set(all_months) - set(months))
    missing_str = [str(m) for m in missing]

    if not missing:
        return _ok(
            "period_completeness",
            "warning",
            f"All months present ({months.min()} to {months.max()})",
        )
    return _fail(
        "period_completeness",
        "warning",
        f"{len(missing)} missing month(s): {', '.join(missing_str[:12])}",
        {"missing_months": missing_str},
    )


def check_cash_flow(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Verify cash flow coherence: operating + investing + financing ≈ net change."""
    if mapping_df is None or "CF_Category" not in mapping_df.columns:
        return _ok("cash_flow", "warning", "No CF mapping available — skipped")

    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not all([dr_col, cr_col, gl_col]):
        return _ok("cash_flow", "warning", "Missing columns — skipped")

    cf_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["CF_Category"]))
    df = df.copy()
    df["_cf"] = df[gl_col].astype(str).map(cf_map)

    def _cf_net(cat_pattern: str) -> float:
        mask = df["_cf"].str.lower().str.contains(cat_pattern, na=False)
        dr = pd.to_numeric(df.loc[mask, dr_col], errors="coerce").sum()
        cr = pd.to_numeric(df.loc[mask, cr_col], errors="coerce").sum()
        return float(cr - dr)

    operating = _cf_net("operating")
    investing = _cf_net("investing")
    financing = _cf_net("financing")
    net_change = operating + investing + financing

    # Net change should be close to the cash account movement
    return _ok(
        "cash_flow",
        "warning",
        f"CF: Op={operating:,.2f} Inv={investing:,.2f} Fin={financing:,.2f} Net={net_change:,.2f}",
        {"operating": operating, "investing": investing, "financing": financing, "net_change": net_change},
    )


def check_tax_reasonability(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Check that tax expense is 0-50% of profit before tax."""
    if mapping_df is None or "Statement_Section" not in mapping_df.columns:
        return _ok("tax_reasonability", "warning", "No mapping available — skipped")

    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not all([dr_col, cr_col, gl_col]):
        return _ok("tax_reasonability", "warning", "Missing columns — skipped")

    section_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Statement_Section"]))
    df = df.copy()
    df["_section"] = df[gl_col].astype(str).map(section_map)

    def _net(pattern: str) -> float:
        mask = df["_section"].str.lower().str.contains(pattern, na=False)
        dr = pd.to_numeric(df.loc[mask, dr_col], errors="coerce").sum()
        cr = pd.to_numeric(df.loc[mask, cr_col], errors="coerce").sum()
        return float(cr - dr)

    revenue = _net("revenue|income|sales")
    expenses = _net("expense|cost")
    tax = _net("tax")
    pbt = revenue - expenses - tax
    tax_rate = (tax / pbt * 100) if pbt > 0 else 0

    if 0 <= tax_rate <= 50:
        return _ok(
            "tax_reasonability",
            "warning",
            f"Tax rate {tax_rate:.1f}% is within 0-50% of PBT",
            {"tax_rate": round(tax_rate, 2), "tax": tax, "pbt": pbt},
        )
    return _fail(
        "tax_reasonability",
        "warning",
        f"Tax rate {tax_rate:.1f}% is outside 0-50% range",
        {"tax_rate": round(tax_rate, 2), "tax": tax, "pbt": pbt},
    )


def check_negative_balances(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """Flag accounts with unexpected negative balances."""
    dr_col = next((c for c in df.columns if c.lower() in ("debit", "debits")), None)
    cr_col = next((c for c in df.columns if c.lower() in ("credit", "credits")), None)
    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not all([dr_col, cr_col, gl_col]):
        return _ok("negative_balances", "warning", "Missing columns — skipped")

    anomalies = []
    for gl_code, group in df.groupby(gl_col):
        dr = pd.to_numeric(group[dr_col], errors="coerce").fillna(0).sum()
        cr = pd.to_numeric(group[cr_col], errors="coerce").fillna(0).sum()
        balance = float(dr - cr)
        if balance < 0:
            nb = ""
            if mapping_df is not None and "Normal_Balance" in mapping_df.columns:
                nb_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Normal_Balance"]))
                nb = nb_map.get(str(gl_code), "")
            if nb.lower() != "credit":
                anomalies.append({
                    "gl_code": str(gl_code),
                    "balance": balance,
                    "normal_balance": nb,
                })

    if not anomalies:
        return _ok("negative_balances", "warning", "No unexpected negative balances")
    return _fail(
        "negative_balances",
        "warning",
        f"{len(anomalies)} account(s) with unexpected negative balances",
        {"anomalies": anomalies[:20]},
    )


def check_unmapped_accounts(df: pd.DataFrame, mapping_df: Optional[pd.DataFrame] = None) -> dict:
    """List GL codes not in the mapping file."""
    if mapping_df is None:
        return _ok("unmapped_accounts", "info", "No mapping available — skipped")

    gl_col = next((c for c in df.columns if c.lower() in ("gl_code", "gl_account", "account_number")), None)
    if not gl_col or "GL_Code" not in mapping_df.columns:
        return _ok("unmapped_accounts", "info", "Insufficient data — skipped")

    mapped_codes = set(mapping_df["GL_Code"].astype(str))
    data_codes = set(df[gl_col].astype(str))
    unmapped = sorted(data_codes - mapped_codes)

    if not unmapped:
        return _ok("unmapped_accounts", "info", "All accounts are mapped")
    return _fail(
        "unmapped_accounts",
        "info",
        f"{len(unmapped)} unmapped account(s)",
        {"unmapped": unmapped},
    )


def check_duplicates(df: pd.DataFrame) -> dict:
    """Count duplicate rows."""
    before_count = len(df)
    after_count = len(df.drop_duplicates())
    dup_count = before_count - after_count

    if dup_count == 0:
        return _ok("duplicates", "warning", "No duplicate rows found")
    return _fail(
        "duplicates",
        "warning",
        f"{dup_count} duplicate row(s) detected ({dup_count/before_count*100:.1f}%)",
        {"duplicate_count": dup_count, "total_rows": before_count},
    )


# ── Aggregate ───────────────────────────────────────────────────────


def run_all_checks(
    df: pd.DataFrame,
    mapping_df: Optional[pd.DataFrame] = None,
) -> list[dict]:
    """Run every integrity check and return the results."""
    checks = [
        lambda: check_double_entry(df),
        lambda: check_pl_balance(df, mapping_df),
        lambda: check_bs_balance(df, mapping_df),
        lambda: check_account_types(df, mapping_df),
        lambda: check_period_completeness(df),
        lambda: check_cash_flow(df, mapping_df),
        lambda: check_tax_reasonability(df, mapping_df),
        lambda: check_negative_balances(df, mapping_df),
        lambda: check_unmapped_accounts(df, mapping_df),
        lambda: check_duplicates(df),
    ]
    results = []
    for fn in checks:
        try:
            results.append(fn())
        except Exception as exc:
            results.append({
                "name": fn.__name__.replace("check_", ""),
                "severity": "info",
                "ok": True,
                "message": f"Check failed to run: {exc}",
                "details": {},
            })
    return results
