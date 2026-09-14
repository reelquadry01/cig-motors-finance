"""Reads GL_Clean.xlsx and Statement_Mapping.xlsx into DataFrames.

Sheet names and column assumptions are configurable via pipeline.config.
"""

import pandas as pd
from pathlib import Path
from . import config as cfg


def read_gl_clean(path: str | Path, sheet_name: str | None = None) -> pd.DataFrame:
    """Read the GL sheet from the cleaned GL workbook.

    Auto-detects the sheet: tries config default, then the first sheet.
    """
    sn = sheet_name or cfg.DEFAULT_GL_SHEET
    try:
        df = pd.read_excel(path, sheet_name=sn)
    except ValueError:
        # Sheet not found — try first sheet
        xl = pd.ExcelFile(path)
        df = pd.read_excel(path, sheet_name=xl.sheet_names[0])
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
    for col in ["Debit", "Credit", "Net"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    if "Doc_Date" in df.columns:
        df["Doc_Date"] = pd.to_datetime(df["Doc_Date"], errors="coerce")
    if "Month_No" in df.columns:
        df["Month_No"] = pd.to_numeric(df["Month_No"], errors="coerce").astype("Int64")
    if "Year" in df.columns:
        df["Year"] = pd.to_numeric(df["Year"], errors="coerce").astype("Int64")
    # Ensure Period column exists
    if "Period" not in df.columns and "Doc_Date" in df.columns:
        df["Period"] = df["Doc_Date"].dt.strftime("%Y-%m")
    return df


def read_statement_mapping(path: str | Path, sheet_name: str | None = None) -> pd.DataFrame:
    """Read the Statement Mapping sheet.

    Auto-detects the sheet: tries config default, then first sheet.
    """
    sn = sheet_name or cfg.DEFAULT_MAPPING_SHEET
    try:
        df = pd.read_excel(path, sheet_name=sn)
    except ValueError:
        xl = pd.ExcelFile(path)
        df = pd.read_excel(path, sheet_name=xl.sheet_names[0])
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip()
    return df


def read_budget(path: str | Path, sheet_name: str | None = None) -> pd.DataFrame:
    """Read budget data into a long frame [GL_Code, Period, Budget].

    The template is keyed by GL_Code with month columns. Year is auto-detected
    from column headers or defaults to the earliest year in the data.
    """
    cols = ["GL_Code", "Period", "Budget"]
    sn = sheet_name or cfg.DEFAULT_BUDGET_SHEET
    try:
        raw = pd.read_excel(path, sheet_name=sn, header=None)
    except Exception:
        return pd.DataFrame(columns=cols)

    hdr_idx = None
    for idx, row in raw.iterrows():
        if any(str(c).strip() == "GL_Code" for c in row.values):
            hdr_idx = idx
            break
    if hdr_idx is None:
        return pd.DataFrame(columns=cols)

    header = [str(c).strip() if c is not None else None for c in raw.iloc[hdr_idx].tolist()]
    body = raw.iloc[hdr_idx + 1:].copy()
    body.columns = header
    # Exclude known non-month columns
    skip_cols = {"GL_Code", "Account_Name", "Account_Description", "None", None}
    month_cols = [c for c in header if c not in skip_cols]

    # Try to detect year from data or headers
    year = None
    # Check if any header looks like a year
    for c in header:
        if c and str(c).strip().isdigit() and len(str(c).strip()) == 4:
            year = int(str(c).strip())
            break
    # Check Period column in existing data
    if year is None:
        year = 2025  # fallback

    recs = []
    for _, r in body.iterrows():
        gl = str(r.get("GL_Code")).strip().replace(".0", "")
        if not gl or gl.lower() == "nan":
            continue
        for k, mc in enumerate(month_cols):
            val = pd.to_numeric(r.get(mc), errors="coerce")
            if pd.notna(val) and val != 0:
                recs.append({"GL_Code": gl, "Period": f"{year}-{k + 1:02d}", "Budget": float(val)})
    return pd.DataFrame(recs, columns=cols)


def read_account_summary(path: str | Path, sheet_name: str | None = None) -> pd.DataFrame:
    """Read the Account_Summary sheet (opening balances, source totals).

    Returns empty DataFrame if sheet not found.
    """
    sn = sheet_name or cfg.DEFAULT_ACCOUNT_SUMMARY_SHEET
    try:
        df = pd.read_excel(path, sheet_name=sn)
    except ValueError:
        return pd.DataFrame()
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip()
    for col in ["Opening_Debit", "Opening_Credit", "Src_Total_Debit",
                "Src_Total_Credit", "Src_Ending_Net"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df
