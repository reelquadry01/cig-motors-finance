"""Smart diff — compares an uploaded file against the current dataset.

The user is shown a summary before we merge, so nothing surprising ever
lands. We identify "same row" by the diff_key defined per file type in
config; when a row's key matches but the payload differs, it counts as
modified. When the key is absent (some GLs don't carry a Transaction_ID),
we fall back to a composite of business columns.
"""
from __future__ import annotations
from pathlib import Path
from typing import Any

import pandas as pd

from .. import config


def _read(path: Path, sheet: str) -> pd.DataFrame:
    """Read an Excel file and normalise column names."""
    df = pd.read_excel(path, sheet_name=sheet)
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _resolve_diff_key(df: pd.DataFrame, spec: dict) -> list[str]:
    """Return whichever diff_key is actually populated in the frame."""
    primary = spec.get("diff_key", [])
    if all(c in df.columns and df[c].notna().any() for c in primary):
        return primary
    fallback = spec.get("diff_key_fallback")
    if fallback and all(c in df.columns for c in fallback):
        return fallback
    return [c for c in df.columns[:3]]   # best-effort last resort


def _key_series(df: pd.DataFrame, keys: list[str]) -> pd.Series:
    if len(keys) == 1:
        return df[keys[0]].astype(str).str.strip()
    return df[keys].astype(str).agg("||".join, axis=1)


def _preview_row(row: pd.Series, headers: list[str]) -> dict[str, Any]:
    """Small serialisable shape the UI shows in the diff summary."""
    return {c: (str(row[c]) if c in row else "") for c in headers[:6]}


def diff(file_type: str, uploaded_path: Path) -> dict:
    """Compute the diff summary for one uploaded file.

    Returns a dict shaped like the API contract in the spec:
        {"existing": {...}, "uploaded": {...},
         "new": N, "modified": N, "duplicates": N,
         "preview": [...]}
    """
    spec = config.file_type_or_400(file_type)
    sheet = spec.get("sheet", 0)
    up_df = _read(uploaded_path, sheet)

    # Validate the BUSINESS-CRITICAL columns are present. Optional columns
    # (Transaction_ID, Source, Reference, Narration) are welcome but not
    # required — the differ falls back to a composite key when they're absent.
    optional = {"Transaction_ID", "Source", "Reference", "Narration", "Borrowing_Type"}
    required = [h for h in spec["headers"] if h not in optional]
    missing = [h for h in required if h not in up_df.columns]
    if missing:
        return {"error": f"Uploaded file is missing required columns: {', '.join(missing)}"}

    from .file_manager import current_path
    cur_path = current_path(file_type)
    if not cur_path.exists():
        return {
            "existing": {"rows": 0, "path": None},
            "uploaded": {"rows": int(len(up_df))},
            "new": int(len(up_df)),
            "modified": 0,
            "duplicates": 0,
            "preview": [
                {"row": i + 1, "change": "new", "cells": _preview_row(up_df.iloc[i], spec["headers"])}
                for i in range(min(5, len(up_df)))
            ],
            "keys": _resolve_diff_key(up_df, spec),
            "first_run": True,
        }

    cur_df = _read(cur_path, sheet)
    keys = _resolve_diff_key(up_df, spec)
    if any(k not in cur_df.columns for k in keys):
        keys = _resolve_diff_key(cur_df, spec)

    up_df["__key"] = _key_series(up_df, keys)
    cur_df["__key"] = _key_series(cur_df, keys)

    cur_index = cur_df.set_index("__key")
    up_index = up_df.set_index("__key")

    new_keys = [k for k in up_index.index if k not in cur_index.index]
    common_keys = [k for k in up_index.index if k in cur_index.index]

    # A row is "modified" if the same key carries different payload.
    payload_cols = [c for c in spec["headers"] if c in up_df.columns and c not in keys]
    modified: list[str] = []
    duplicates: list[str] = []
    if payload_cols:
        for k in common_keys:
            up_row = up_index.loc[k]
            cur_row = cur_index.loc[k]
            if isinstance(up_row, pd.DataFrame):
                up_row = up_row.iloc[0]
            if isinstance(cur_row, pd.DataFrame):
                cur_row = cur_row.iloc[0]
            if any(str(up_row[c]) != str(cur_row[c]) for c in payload_cols):
                modified.append(k)
            else:
                duplicates.append(k)
    else:
        duplicates = list(common_keys)

    def _row_by_key(df: pd.DataFrame, k: str) -> pd.Series:
        row = df.loc[k]
        if isinstance(row, pd.DataFrame):
            return row.iloc[0]
        return row

    preview = []
    for k in new_keys[:5]:
        preview.append({"key": str(k), "change": "new",
                        "cells": _preview_row(_row_by_key(up_index, k), spec["headers"])})
    for k in modified[:5]:
        preview.append({"key": str(k), "change": "modified",
                        "cells": _preview_row(_row_by_key(up_index, k), spec["headers"])})
    for k in duplicates[:3]:
        preview.append({"key": str(k), "change": "duplicate",
                        "cells": _preview_row(_row_by_key(up_index, k), spec["headers"])})

    return {
        "existing": {"rows": int(len(cur_df))},
        "uploaded": {"rows": int(len(up_df))},
        "new": len(new_keys),
        "modified": len(modified),
        "duplicates": len(duplicates),
        "preview": preview,
        "keys": keys,
    }


def apply_merge(file_type: str, uploaded_path: Path, action: str) -> Path:
    """Materialise the merged file. `action` is 'append' or 'replace'.

    Returns the path of the merged file; the caller then hands it to
    file_manager.promote() to move it into data/current/.
    """
    spec = config.file_type_or_400(file_type)
    sheet = spec.get("sheet", 0)
    up_df = _read(uploaded_path, sheet)

    if action == "replace":
        merged = up_df
    else:  # append
        from .file_manager import current_path
        cur_path = current_path(file_type)
        if cur_path.exists():
            cur_df = _read(cur_path, sheet)
            keys = _resolve_diff_key(up_df, spec)
            if any(k not in cur_df.columns for k in keys):
                keys = _resolve_diff_key(cur_df, spec)
            up_df["__key"] = _key_series(up_df, keys)
            cur_df["__key"] = _key_series(cur_df, keys)
            new_only = up_df[~up_df["__key"].isin(cur_df["__key"])].drop(columns="__key")
            merged = pd.concat([cur_df.drop(columns="__key"), new_only], ignore_index=True)
        else:
            merged = up_df

    out = uploaded_path.with_name(uploaded_path.stem + "__merged.xlsx")
    with pd.ExcelWriter(out, engine="openpyxl") as w:
        merged.to_excel(w, sheet_name=str(sheet), index=False)
    return out
