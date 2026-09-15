"""Auto-clean rules for connector data.

Each function takes a DataFrame and optional parameters, applies a
specific cleaning transformation, and returns ``(cleaned_df, change_log)``.

The change log is a list of dicts describing what changed::

    {
        "rule": "remove_duplicates",
        "rows_affected": 42,
        "before_summary": "1,500 rows",
        "after_summary": "1,458 rows",
        "preview": [{"Transaction_ID": "TX-001", ...}, ...]
    }
"""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def _make_log(
    rule: str,
    df_before: pd.DataFrame,
    df_after: pd.DataFrame,
    preview_rows: int = 5,
) -> dict:
    """Build a standardised change-log entry."""
    before_n = len(df_before)
    after_n = len(df_after)
    preview = (
        df_after.head(preview_rows).to_dict(orient="records") if len(df_after) > 0 else []
    )
    return {
        "rule": rule,
        "rows_affected": before_n - after_n,
        "before_summary": f"{before_n:,} rows",
        "after_summary": f"{after_n:,} rows",
        "preview": preview,
    }


# ── Individual cleaners ─────────────────────────────────────────────


def remove_duplicates(
    df: pd.DataFrame,
    key_columns: Optional[list[str]] = None,
) -> tuple[pd.DataFrame, list[dict]]:
    """Remove duplicate rows based on *key_columns*.

    If *key_columns* is ``None``, uses all columns.  The first occurrence
    is kept.
    """
    before = df.copy()
    if key_columns:
        existing = [c for c in key_columns if c in df.columns]
        if existing:
            after = df.drop_duplicates(subset=existing, keep="first").reset_index(drop=True)
        else:
            after = df.drop_duplicates(keep="first").reset_index(drop=True)
    else:
        after = df.drop_duplicates(keep="first").reset_index(drop=True)

    log = _make_log("remove_duplicates", before, after)
    if log["rows_affected"] > 0:
        logger.info("Removed %d duplicate rows", log["rows_affected"])
    return after, [log]


def map_missing_gl_codes(
    df: pd.DataFrame,
    mapping_df: Optional[pd.DataFrame] = None,
) -> tuple[pd.DataFrame, list[dict]]:
    """Map GL codes that are missing an account description using the mapping file.

    Adds ``GL_Account`` from the mapping if it's missing in the data.
    """
    before = df.copy()
    if mapping_df is None or "GL_Code" not in mapping_df.columns:
        return df, [_make_log("map_missing_gl_codes", before, before)]

    gl_col = "GL_Code"
    if gl_col not in df.columns:
        return df, [_make_log("map_missing_gl_codes", before, before)]

    # Build lookup from mapping
    map_lookup = {}
    if "Account_Description" in mapping_df.columns:
        map_lookup = dict(
            zip(mapping_df["GL_Code"].astype(str), mapping_df["Account_Description"])
        )

    if not map_lookup:
        return df, [_make_log("map_missing_gl_codes", before, before)]

    missing_mask = df["GL_Account"].isna() | (df["GL_Account"] == "")
    mapped = df.loc[missing_mask, gl_col].astype(str).map(map_lookup)
    df = df.copy()
    df.loc[missing_mask, "GL_Account"] = mapped

    after = df
    log = _make_log("map_missing_gl_codes", before, after)
    if log["rows_affected"] > 0:
        logger.info("Mapped %d missing GL codes", log["rows_affected"])
    return after, [log]


def normalize_dates(
    df: pd.DataFrame,
    date_column: str = "Doc_Date",
) -> tuple[pd.DataFrame, list[dict]]:
    """Normalise dates in *date_column* to ``DD/MM/YYYY`` format.

    Handles common formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY,
    MM/DD/YYYY, YYYYMMDD, and Excel serial dates.
    """
    before = df.copy()
    if date_column not in df.columns:
        return df, [_make_log("normalize_dates", before, before)]

    df = df.copy()
    col = df[date_column]

    # Already datetime
    if pd.api.types.is_datetime64_any_dtype(col):
        df[date_column] = col.dt.strftime("%d/%m/%Y")
        return df, [_make_log("normalize_dates", before, df)]

    # Try pandas to_datetime with mixed format
    try:
        parsed = pd.to_datetime(col, format="mixed", dayfirst=True, errors="coerce")
        df[date_column] = parsed.dt.strftime("%d/%m/%Y")
    except Exception:
        # Fallback: string-based normalisation
        patterns = [
            (r"(\d{4})-(\d{2})-(\d{2})", lambda m: f"{m.group(3)}/{m.group(2)}/{m.group(1)}"),
            (r"(\d{2})/(\d{2})/(\d{4})", lambda m: f"{m.group(1)}/{m.group(2)}/{m.group(3)}"),
            (r"(\d{2})-(\d{2})-(\d{4})", lambda m: f"{m.group(1)}/{m.group(2)}/{m.group(3)}"),
            (r"(\d{4})(\d{2})(\d{2})", lambda m: f"{m.group(3)}/{m.group(2)}/{m.group(1)}"),
        ]
        def _convert(val):
            s = str(val).strip()
            for pat, fn in patterns:
                m = re.match(pat, s)
                if m:
                    return fn(m)
            return s

        df[date_column] = col.apply(_convert)

    after = df
    log = _make_log("normalize_dates", before, after)
    return after, [log]


def verify_signs(
    df: pd.DataFrame,
    mapping_df: Optional[pd.DataFrame] = None,
) -> tuple[pd.DataFrame, list[dict]]:
    """Verify debit/credit signs against ``Normal_Balance`` in the mapping.

    Flags rows where the sign doesn't match expectations but doesn't
    modify them — just adds a ``Sign_Flag`` column.
    """
    before = df.copy()
    if mapping_df is None:
        return df, [_make_log("verify_signs", before, before)]

    required_cols = {"GL_Code", "Normal_Balance"}
    if not required_cols.issubset(mapping_df.columns):
        return df, [_make_log("verify_signs", before, before)]

    if "Debit" not in df.columns or "Credit" not in df.columns:
        return df, [_make_log("verify_signs", before, before)]

    df = df.copy()
    norm_map = dict(zip(mapping_df["GL_Code"].astype(str), mapping_df["Normal_Balance"]))

    def _check_sign(row):
        gl = str(row.get("GL_Code", ""))
        nb = norm_map.get(gl, "")
        debit = float(row.get("Debit", 0) or 0)
        credit = float(row.get("Credit", 0) or 0)
        if nb.lower() == "debit" and credit > 0 and debit == 0:
            return "MISMATCH"
        if nb.lower() == "credit" and debit > 0 and credit == 0:
            return "MISMATCH"
        return "OK"

    df["Sign_Flag"] = df.apply(_check_sign, axis=1)

    after = df
    mismatch_count = (after["Sign_Flag"] == "MISMATCH").sum()
    log = _make_log("verify_signs", before, after)
    log["rows_affected"] = int(mismatch_count)
    log["preview"] = (
        after[after["Sign_Flag"] == "MISMATCH"].head(5).to_dict(orient="records")
    )
    if mismatch_count > 0:
        logger.warning("Detected %d sign mismatches", mismatch_count)
    return after, [log]


def flag_unmapped(
    df: pd.DataFrame,
    mapping_df: Optional[pd.DataFrame] = None,
) -> tuple[pd.DataFrame, list[dict]]:
    """Flag GL codes not present in the mapping file.

    Adds ``Unmapped_Flag`` column (``True``/``False``).
    """
    before = df.copy()
    gl_col = "GL_Code"
    if mapping_df is None or gl_col not in mapping_df.columns:
        return df, [_make_log("flag_unmapped", before, before)]

    if "GL_Code" not in df.columns:
        return df, [_make_log("flag_unmapped", before, before)]

    df = df.copy()
    mapped_codes = set(mapping_df[gl_col].astype(str))
    df["Unmapped_Flag"] = ~df[gl_col].astype(str).isin(mapped_codes)

    after = df
    unmapped_count = int(df["Unmapped_Flag"].sum())
    log = _make_log("flag_unmapped", before, after)
    log["rows_affected"] = unmapped_count
    log["preview"] = (
        after[after["Unmapped_Flag"]].head(5).to_dict(orient="records")
    )
    if unmapped_count > 0:
        logger.warning("Detected %d unmapped GL codes", unmapped_count)
    return after, [log]


def remove_empty_rows(
    df: pd.DataFrame,
    debit_col: str = "Debit",
    credit_col: str = "Credit",
) -> tuple[pd.DataFrame, list[dict]]:
    """Remove rows where both Debit and Credit are zero or NaN."""
    before = df.copy()
    if debit_col not in df.columns or credit_col not in df.columns:
        return df, [_make_log("remove_empty_rows", before, before)]

    dr = pd.to_numeric(df[debit_col], errors="coerce").fillna(0)
    cr = pd.to_numeric(df[credit_col], errors="coerce").fillna(0)
    mask = (dr == 0) & (cr == 0)
    after = df[~mask].reset_index(drop=True)

    log = _make_log("remove_empty_rows", before, after)
    if log["rows_affected"] > 0:
        logger.info("Removed %d empty rows", log["rows_affected"])
    return after, [log]


# ── Aggregated cleaner ──────────────────────────────────────────────


def run_all_cleaners(
    df: pd.DataFrame,
    mapping_df: Optional[pd.DataFrame] = None,
    rules_config: Optional[dict] = None,
) -> tuple[pd.DataFrame, list[dict]]:
    """Apply all cleaning rules in sequence.

    *rules_config* can selectively disable rules::

        {"remove_duplicates": False, "normalize_dates": True}

    By default all rules run.
    """
    cfg = rules_config or {}
    df = df.copy()
    all_logs: list[dict] = []

    cleaners = [
        ("remove_duplicates", lambda d: remove_duplicates(d, key_columns=["Transaction_ID"])),
        ("map_missing_gl_codes", lambda d: map_missing_gl_codes(d, mapping_df)),
        ("normalize_dates", lambda d: normalize_dates(d)),
        ("remove_empty_rows", lambda d: remove_empty_rows(d)),
        ("verify_signs", lambda d: verify_signs(d, mapping_df)),
        ("flag_unmapped", lambda d: flag_unmapped(d, mapping_df)),
    ]

    for name, fn in cleaners:
        if cfg.get(name, True) is False:
            continue
        try:
            df, logs = fn(df)
            all_logs.extend(logs)
        except Exception as exc:
            logger.error("Cleaner '%s' failed: %s", name, exc)
            all_logs.append({
                "rule": name,
                "rows_affected": 0,
                "before_summary": f"ERROR: {exc}",
                "after_summary": "skipped",
                "preview": [],
            })

    return df, all_logs
