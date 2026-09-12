"""Reads GL_Clean.xlsx and Statement_Mapping.xlsx into DataFrames."""

import pandas as pd
from pathlib import Path


def read_gl_clean(path: str | Path) -> pd.DataFrame:
    """Read the GL_Clean sheet from the cleaned GL workbook."""
    df = pd.read_excel(path, sheet_name="GL_Clean")
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip().str.replace(r'\.0$', '', regex=True)
    for col in ["Debit", "Credit", "Net"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    df["Doc_Date"] = pd.to_datetime(df["Doc_Date"], errors="coerce")
    df["Month_No"] = pd.to_numeric(df["Month_No"], errors="coerce").astype("Int64")
    df["Year"] = pd.to_numeric(df["Year"], errors="coerce").astype("Int64")
    return df


def read_statement_mapping(path: str | Path) -> pd.DataFrame:
    """Read the Statement Mapping sheet."""
    df = pd.read_excel(path, sheet_name="Statement Mapping")
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip()
    return df


def read_budget(path: str | Path) -> pd.DataFrame:
    """Read Budget_Template.xlsx into a long frame [GL_Code, Period, Budget].

    The template is keyed by GL_Code with 12 month columns. Returns an empty
    frame when the file is missing or no budget figures have been entered, so
    the pipeline simply reports 'no budget' and the dashboard shows a blank
    Budget section until real numbers are supplied.
    """
    cols = ["GL_Code", "Period", "Budget"]
    try:
        raw = pd.read_excel(path, sheet_name="Budget", header=None)
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
    month_cols = [c for c in header if c not in ("GL_Code", "Account_Name", "None", None)]

    recs = []
    for _, r in body.iterrows():
        gl = str(r.get("GL_Code")).strip().replace(".0", "")
        if not gl or gl.lower() == "nan":
            continue
        for k, mc in enumerate(month_cols):
            val = pd.to_numeric(r.get(mc), errors="coerce")
            if pd.notna(val) and val != 0:
                recs.append({"GL_Code": gl, "Period": f"2025-{k + 1:02d}", "Budget": float(val)})
    return pd.DataFrame(recs, columns=cols)


def read_account_summary(path: str | Path) -> pd.DataFrame:
    """Read the Account_Summary sheet (opening balances, source totals)."""
    df = pd.read_excel(path, sheet_name="Account_Summary")
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip()
    for col in ["Opening_Debit", "Opening_Credit", "Src_Total_Debit",
                "Src_Total_Credit", "Src_Ending_Net"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df
