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


def read_account_summary(path: str | Path) -> pd.DataFrame:
    """Read the Account_Summary sheet (opening balances, source totals)."""
    df = pd.read_excel(path, sheet_name="Account_Summary")
    df["GL_Code"] = df["GL_Code"].astype(str).str.strip()
    for col in ["Opening_Debit", "Opening_Credit", "Src_Total_Debit",
                "Src_Total_Credit", "Src_Ending_Net"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df
