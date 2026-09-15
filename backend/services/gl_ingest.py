"""Accept either a raw Sage-style GL export or an already-flat GL_Clean file.

The Sage 300 monthly GL comes out in a hierarchical shape:

    row 1  "Account Number/Year/ Prd."  Source  Doc. Date  Description  Reference  Debits  Credits
    row 2  <GL code>  <account name>  Opening Balance:  <opening dr>  <opening cr>
    row 3  <year>
    row 4+ <period>  <source>  <date>  <narration>  <reference>  <debit>  <credit>
    ...
    end    Totals: …          Ending Balance: …

`gl_cleaner.py` at the repo root already knows how to flatten that shape
into a proper GL_Clean sheet plus an Account_Summary. This module bridges
the two: when the admin uploads a GL, we sniff the shape and — if it's raw
— pipe it through gl_cleaner before anything else touches it. The rest of
the pipeline continues to see the same clean GL_Clean it always has.
"""
from __future__ import annotations
import sys
from pathlib import Path

import openpyxl

# gl_cleaner.py lives at the repo root, not in a package
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


def detect_gl_shape(path: Path) -> str:
    """Return 'clean' if the file looks like a flat GL_Clean sheet, else 'raw'.

    Heuristics, tolerant of casing / whitespace:
      • a sheet literally called GL_Clean → clean
      • first sheet's header row contains GL_Code + Debit + Credit → clean
      • first cell in row 2 looks like an opening-balance marker → raw
      • otherwise fall back to raw (the cleaner handles wrong guesses gracefully)
    """
    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    except Exception:
        return "raw"
    try:
        names = [n.strip().lower() for n in wb.sheetnames]
        if any(n in ("gl_clean", "clean", "transactions") for n in names):
            return "clean"
        ws = wb[wb.sheetnames[0]]
        header = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(max_row=1))]
        # Already-flat header
        if "gl_code" in header and ("debit" in header) and ("credit" in header):
            return "clean"
        # Raw Sage export marker in row 2
        row2 = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(min_row=2, max_row=2))]
        if any("opening balance" in v for v in row2):
            return "raw"
        # Raw header column A is the tell too
        if header and "account number" in header[0]:
            return "raw"
        return "raw"
    finally:
        wb.close()


def clean_raw_gl(raw_path: Path, out_path: Path | None = None) -> Path:
    """Run gl_cleaner over a raw hierarchical export; return the clean .xlsx path.

    Any workbook opened from the raw source is closed automatically. If a
    chart-of-accounts mapping file is available in the current dataset, we use
    it to correct account descriptions; otherwise the cleaner falls back to the
    GL's own names and every account is flagged Unmapped-Review.
    """
    import gl_cleaner as C   # imported here so a bad module doesn't break FastAPI startup
    from .. import config

    gl_sheet = "gl"
    try:
        wb = openpyxl.load_workbook(raw_path, read_only=True, data_only=True)
        # pick the first sheet if "gl" isn't explicit
        gl_sheet = next(
            (n for n in wb.sheetnames if n.strip().lower() == "gl"),
            wb.sheetnames[0],
        )
        wb.close()
    except Exception:
        pass

    # Try to reuse Statement_Mapping.xlsx as the chart-of-accounts source
    mapping_path = config.CURRENT_DIR / config.FILE_TYPES["mapping"]["filename"]
    map_file = str(mapping_path) if mapping_path.exists() else None

    agreed, _ = C.resolve_map(str(raw_path), gl_sheet, map_file, C.DEFAULT_MAP_SHEET)
    transactions, summary, exceptions = C.parse_gl(str(raw_path), gl_sheet, agreed)

    out_path = out_path or raw_path.with_name(raw_path.stem + "__cleaned.xlsx")
    C.write_outputs(transactions, summary, exceptions, out_path)

    # Release the big intermediate objects before returning — matters on the
    # 512 MB Render free tier where a 8k-row GL can push resident memory near
    # the ceiling. Without this, the differ's subsequent pd.read_excel of the
    # cleaned file has been observed to OOM-kill the process.
    import gc
    del transactions, summary, exceptions, agreed
    gc.collect()
    return out_path


def prepare_gl_for_diff(uploaded_path: Path) -> tuple[Path, dict]:
    """Return (path_for_diffing, meta) — cleaning the raw shape if needed.

    meta is a small dict the upload endpoint can echo to the client so the UI
    can say things like "Cleaned from 7,945 raw rows → 6,412 transactions".
    """
    shape = detect_gl_shape(uploaded_path)
    if shape == "clean":
        return uploaded_path, {"shape": "clean"}
    cleaned = clean_raw_gl(uploaded_path)
    import pandas as pd
    try:
        tx = pd.read_excel(cleaned, sheet_name="GL_Clean")
        raw_rows = _count_raw_rows(uploaded_path)
        return cleaned, {
            "shape": "raw",
            "raw_rows": raw_rows,
            "clean_rows": int(len(tx)),
            "message": f"Cleaned {raw_rows:,} raw rows → {len(tx):,} transactions",
        }
    except Exception:
        return cleaned, {"shape": "raw"}


def _count_raw_rows(path: Path) -> int:
    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            return wb[wb.sheetnames[0]].max_row or 0
        finally:
            wb.close()
    except Exception:
        return 0
