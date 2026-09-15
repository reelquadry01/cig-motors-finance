"""Generate a realistic 12-month GL for CIG Motors.

Produces `Sample GL_realistic.xlsx` in the clean pipeline-ready shape
(GL_Clean + Account_Summary sheets). The balance sheet balances, every
statement line is populated with figures that make business sense, and
there is enough month-over-month variation that trend charts read as
"real business" rather than a straight line.

Design decisions:
  • Numbers are on a Nigerian mid-market scale: ~₦12bn annual revenue,
    ~₦48bn total assets. Small enough to be legible, big enough to be
    representative.
  • Every posting is a proper two-sided journal entry so the trial
    balance nets to zero within a naira.
  • Opening balances are set once at Jan 1 as "Opening Balance" rows;
    the pipeline reads them from Account_Summary.
  • Revenue splits into the five real revenue GL codes in the mapping
    (Vehicle Sales · Spare Parts · Labour · Warranty · Insurance) so
    segment breakdowns aren't dominated by one line.
  • Costs split into ~15 opex accounts (personnel, occupancy, admin,
    logistics, marketing) so the Costs page has real texture.

Usage:
    python generate_realistic_gl.py
    python generate_realistic_gl.py --output "Sample GL_realistic.xlsx"
"""
from __future__ import annotations
import argparse
import random
from datetime import date
from pathlib import Path

import openpyxl
from openpyxl import Workbook


# ── Chart of accounts we'll post to. GL codes match Statement_Mapping.xlsx.
# Each tuple: (code, name, natural_side, opening_balance_signed)
# For opening_balance_signed: positive = debit balance, negative = credit balance.
OPENING = {
    # ── Assets (Dr) ────────────────────────────────────────────────────
    "10000": ("Cash in Hand - Naira-1",         "Dr",  2_700_000_000),
    "10100": ("Cash in Hand - Naira - 2",       "Dr",    600_000_000),
    "10130": ("Bank -  Zenith Bank Acct-2",     "Dr",    500_000_000),
    "10140": ("Bank -  Access Bank",            "Dr",  1_400_000_000),
    "10150": ("Bank -  Polaris Bank",           "Dr",    900_000_000),
    "11000": ("CA - Accounts Receivable",       "Dr",  3_200_000_000),
    "14022": ("Prepaid - Rent-Frank Court",     "Dr",    900_000_000),
    "12000": ("Inventory - GN8",                "Dr",  4_500_000_000),
    "12100": ("Inventory- New & Used Cars-GA3", "Dr",  6_800_000_000),
    "12200": ("Inventory - New Cars-GS4",       "Dr",  4_200_000_000),
    "12250": ("Inventory - New Cars-GA4",       "Dr",  2_900_000_000),
    "15500": ("FA - Land",                      "Dr",  6_000_000_000),
    "15501": ("FA - Building",                  "Dr",  8_400_000_000),
    "15200": ("FA - Motor Vehicle",             "Dr",  3_200_000_000),
    "15100": ("FA - Equipment",                 "Dr",  2_400_000_000),
    "15000": ("FA - Furniture & Fittings",      "Dr",    900_000_000),

    # ── Liabilities (Cr, stored as negative for balance-sheet math) ────
    "20000": ("CL - Accounts Payable",          "Cr", -4_700_000_000),
    "23600": ("CA - VAT Payable/Output",        "Cr",   -680_000_000),
    "24600": ("CL - Accrued Expenses",          "Cr",   -420_000_000),
    "23900": ("CL - Income Taxes Payable",      "Cr",   -180_000_000),
    "10155": ("CL- Polaris bank Loan",          "Cr", -8_000_000_000),
    "10160": ("Bank -  Union Bank",             "Cr",-22_000_000_000),
    "24500": ("Lease Liability",                "Cr",   -370_000_000),

    # ── Equity (Cr) ────────────────────────────────────────────────────
    "39004": ("Share Capital",                  "Cr", -5_000_000_000),
    "39005": ("Retained Earnings",              "Cr", -7_400_000_000),
    "39006": ("Capital reserve",                "Cr",   -750_000_000),
}


# ── Revenue mix (share of monthly revenue that lands on each account)
REVENUE_MIX = [
    ("40000", "Revenue - Vehicle Sales",           0.62),
    ("40200", "Revenue - Spare Parts",             0.18),
    ("40500", "Revenue - Labour Income-VI",        0.10),
    ("40700", "Revenue - Labour Income-OJOTA",     0.05),
    ("24950", "Revenue - Warranty-Fee Service",    0.03),
    ("24400", "Revenue - Insurance Claim",         0.02),
]

# ── COGS by account (all codes verified against Statement_Mapping.xlsx)
COGS_MIX = [
    ("50000", "COGS - Vehicles",                  0.72),
    ("50200", "COGS - Aftersales-VI",             0.10),
    ("50800", "COGS - Spare Parts- Ojota",        0.10),
    ("60800", "COGS - Painting Expenses VI",      0.04),
    ("60900", "COGS - Painting Exp Ojota",        0.04),
]

# ── Opex categories — only codes present in the mapping. Mix chosen so
# each of the classic personnel / occupancy / admin buckets has weight.
OPEX_MIX = [
    ("67700", "IE-  Audit Fees Expenses",         0.06),
    ("62000", "IE - Bank Charges",                0.04),
    ("60100", "IE - Business Pro",                0.06),
    ("64300", "IE - Photo & Video Expenses",      0.02),
    ("66500", "IE-  Corporate gift Expense",      0.03),
    ("71200", "IE-  Donation/Sponsorship",        0.02),
    ("91960", "IE- BOI Expenses",                 0.03),
    ("90800", "IE- LC cash back",                 0.03),
]

# ── Depreciation lines
DEP_MIX = [
    ("64510", "IE- Dep- Furnitures & Fittings",   0.10),
    ("64520", "IE- Depreciation - Equipment",     0.30),
    ("64530", "IE- Depreciation-Motor Vehicle",   0.28),
    ("64540", "IE- Depreciation plant machine",   0.06),
    ("64550", "IE- Depreciation -Building",       0.26),
]

# Finance costs / tax / other income → single accounts each
FIN_ACC   = ("62050", "IE - Interest on Loan")
TAX_ACC   = ("67000", "IE-  Income Tax expense")
OI_ACC    = ("40800", "OI - Miscellaneous")

# When posting revenue we split the offset 60/40 between cash and AR so
# the receivables balance actually moves month to month.
CASH_ACC = ("10140", "Bank -  Access Bank")
CASH2    = ("10000", "Cash in Hand - Naira-1")
AR_ACC   = ("11000", "CA - Accounts Receivable")
AP_ACC   = ("20000", "CL - Accounts Payable")
CURRTAX  = ("23900", "CL - Income Taxes Payable")
INV_ACC  = ("12200", "Inventory - New Cars-GS4")   # the inventory we drain
ACC_DEP  = ("15200", "FA - Motor Vehicle")           # net PPE via depreciation


# ── Monthly plan
# annual_revenue: ₦12.4bn. Introduce seasonality — quieter Feb, strong Nov/Dec.
MONTH_SEASONALITY = [0.85, 0.75, 0.90, 0.95, 1.00, 1.05,
                     1.00, 0.95, 1.05, 1.10, 1.20, 1.20]
ANNUAL_REVENUE = 12_400_000_000
COGS_RATIO      = 0.65
OPEX_RATIO      = 0.18
DEP_MONTHLY     = 55_000_000
FINCOST_MONTHLY = 42_000_000
OI_MONTHLY      = 3_500_000
TAX_RATE        = 0.30


def month_end(y: int, m: int) -> date:
    """Last calendar day of a month."""
    from calendar import monthrange
    return date(y, m, monthrange(y, m)[1])


def gen_transactions(year: int, seed: int = 42) -> list[dict]:
    """Return a list of GL rows (one per posting side)."""
    rng = random.Random(seed)
    txs: list[dict] = []
    tid = 1

    def push(dt: date, code: str, name: str, debit: float, credit: float,
             source: str, ref: str, narr: str):
        nonlocal tid
        row = {
            "Transaction_ID": f"TX{tid:07d}",
            "GL_Code":  code,
            "GL_Account": name,
            "Desc_Status": "Matched",
            "Doc_Date": dt,
            "Year": year,
            "Month_No": dt.month,
            "Month_Name": dt.strftime("%b"),
            "Period": f"{year}-{dt.month:02d}",
            "Source": source,
            "Reference": ref,
            "Narration": narr,
            "Debit":  round(debit, 2),
            "Credit": round(credit, 2),
            "Net":    round(debit - credit, 2),
            "Source_Account_Name": name,
        }
        txs.append(row)
        tid += 1

    monthly_seed = 100
    for m in range(1, 13):
        rng.seed(seed + m)
        me = month_end(year, m)
        s = MONTH_SEASONALITY[m - 1]
        # tiny random ±5% wobble on top of the season pattern
        wobble = rng.uniform(0.95, 1.05)
        month_revenue = (ANNUAL_REVENUE / 12) * s * wobble

        # ── Revenue postings — one journal per revenue GL, split 60% cash, 40% AR
        for code, name, share in REVENUE_MIX:
            amt = month_revenue * share
            cash = amt * 0.60
            ar   = amt * 0.40
            ref = f"INV-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
            if cash:
                push(me, CASH_ACC[0], CASH_ACC[1], cash, 0, "Sales", ref, f"{name} — cash sale")
            if ar:
                push(me, AR_ACC[0], AR_ACC[1], ar, 0, "Sales", ref, f"{name} — on account")
            push(me, code, name, 0, amt, "Sales", ref, name)

        # ── COGS — release inventory, hit each COGS account
        for code, name, share in COGS_MIX:
            amt = month_revenue * COGS_RATIO * share
            ref = f"COGS-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
            push(me, code, name, amt, 0, "GL-JE", ref, name)
            push(me, INV_ACC[0], INV_ACC[1], 0, amt, "GL-JE", ref, "Inventory release")

        # ── Operating expenses — half cash-paid, half accrued into payables
        for code, name, share in OPEX_MIX:
            amt = month_revenue * OPEX_RATIO * share
            paid = amt * 0.50
            accrued = amt - paid
            ref_p = f"PAY-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
            ref_a = f"ACC-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
            if paid:
                push(me, code, name, paid, 0, "GL-JE", ref_p, name + " (cash)")
                push(me, CASH_ACC[0], CASH_ACC[1], 0, paid, "GL-JE", ref_p, "Payment")
            if accrued:
                push(me, code, name, accrued, 0, "GL-JE", ref_a, name + " (accrual)")
                push(me, AP_ACC[0], AP_ACC[1], 0, accrued, "GL-JE", ref_a, "Accrual — trade payables")

        # ── Depreciation — non-cash, credits the PPE line for now
        for code, name, share in DEP_MIX:
            amt = DEP_MONTHLY * share
            ref = f"DEP-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
            push(me, code, name, amt, 0, "GL-JE", ref, name)
            push(me, ACC_DEP[0], ACC_DEP[1], 0, amt, "GL-JE", ref, "Accumulated depreciation")

        # ── Finance costs — interest paid in cash
        ref = f"INT-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
        push(me, FIN_ACC[0], FIN_ACC[1], FINCOST_MONTHLY, 0, "GL-JE", ref, "Loan interest")
        push(me, CASH_ACC[0], CASH_ACC[1], 0, FINCOST_MONTHLY, "GL-JE", ref, "Interest paid")

        # ── Other income — small credit each month
        ref = f"OI-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
        push(me, CASH_ACC[0], CASH_ACC[1], OI_MONTHLY, 0, "GL-JE", ref, "Other income")
        push(me, OI_ACC[0], OI_ACC[1], 0, OI_MONTHLY, "GL-JE", ref, OI_ACC[1])

        # ── Customer collections — clear 55% of the AR balance built up this month
        collection = month_revenue * 0.40 * 0.55
        ref = f"COL-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
        push(me, CASH_ACC[0], CASH_ACC[1], collection, 0, "Bank", ref, "Customer collections")
        push(me, AR_ACC[0], AR_ACC[1], 0, collection, "Bank", ref, "AR collections")

        # ── Supplier payments — pay down 60% of the accruals built up
        payment = month_revenue * OPEX_RATIO * 0.50 * 0.60
        ref = f"SUP-{year}{m:02d}-{monthly_seed:04d}"; monthly_seed += 1
        push(me, AP_ACC[0], AP_ACC[1], payment, 0, "Bank", ref, "Supplier payments")
        push(me, CASH_ACC[0], CASH_ACC[1], 0, payment, "Bank", ref, "Supplier settlements")

    # ── Year-end tax accrual (December only)
    # Rough PBT: revenue - COGS - Opex - Dep - FinCost + OI
    annual_dep     = DEP_MONTHLY * 12
    annual_fin     = FINCOST_MONTHLY * 12
    annual_oi      = OI_MONTHLY * 12
    annual_opex    = ANNUAL_REVENUE * OPEX_RATIO
    annual_cogs    = ANNUAL_REVENUE * COGS_RATIO
    pbt = ANNUAL_REVENUE - annual_cogs - annual_opex - annual_dep - annual_fin + annual_oi
    tax = max(0, pbt) * TAX_RATE
    dec_end = month_end(year, 12)
    ref = f"TAX-{year}-YEAREND"
    push(dec_end, TAX_ACC[0], TAX_ACC[1], tax, 0, "GL-JE", ref, "Income tax charge")
    push(dec_end, CURRTAX[0], CURRTAX[1], 0, tax, "GL-JE", ref, "Current tax payable")

    # ── Opening-balance activation journal ─────────────────────────────
    # The pipeline's build_tb_meta only builds metadata for accounts that
    # appear in transactions. Accounts that only have opening balances
    # (Cash Naira-2, Land, Building, Long-term borrowings, Share Capital…)
    # would be silently dropped from the trial balance.
    # This tiny paired posting nets to zero movement but puts every opening
    # account in `merged` so it survives.
    jan_start = date(year, 1, 2)
    activated = set()
    for tx in txs:
        activated.add(tx["GL_Code"])
    dormant = [c for c in OPENING if c not in activated]
    # Pair each dormant account with the next one so debits/credits balance.
    for i in range(0, len(dormant), 2):
        a = dormant[i]
        b = dormant[i + 1] if i + 1 < len(dormant) else dormant[0]
        na = OPENING[a][0]; nb = OPENING[b][0]
        ref = f"ACT-{year}-{i:03d}"
        push(jan_start, a, na, 1, 0, "GL-JE", ref, "Opening balance activation")
        push(jan_start, b, nb, 0, 1, "GL-JE", ref, "Opening balance activation")

    return txs


def write_workbook(txs: list[dict], out_path: Path) -> None:
    wb = Workbook()
    # Sheet 1 — GL_Clean
    ws = wb.active
    ws.title = "GL_Clean"
    headers = [
        "Transaction_ID", "GL_Code", "GL_Account", "Desc_Status", "Doc_Date",
        "Year", "Month_No", "Month_Name", "Period",
        "Source", "Reference", "Narration",
        "Debit", "Credit", "Net", "Source_Account_Name",
    ]
    ws.append(headers)
    for r in txs:
        ws.append([r[h] for h in headers])

    # Sheet 2 — Account_Summary (opening + txn totals)
    summary = wb.create_sheet("Account_Summary")
    summary.append([
        "GL_Code", "GL_Account", "Desc_Status",
        "Opening_Debit", "Opening_Credit", "Opening_Net",
        "Txn_Debit", "Txn_Credit",
        "Src_Total_Debit", "Src_Total_Credit", "Src_Ending_Net",
    ])

    # Per-account txn totals
    from collections import defaultdict
    txn_dr = defaultdict(float); txn_cr = defaultdict(float)
    for r in txs:
        txn_dr[r["GL_Code"]] += r["Debit"]
        txn_cr[r["GL_Code"]] += r["Credit"]

    all_codes = set(OPENING) | set(txn_dr) | set(txn_cr)
    for code in sorted(all_codes):
        opening = OPENING.get(code)
        if opening:
            name = opening[0]
            op_signed = opening[2]
            op_dr = op_signed if op_signed >= 0 else 0
            op_cr = -op_signed if op_signed < 0 else 0
        else:
            # look up from any transaction
            hit = next((r for r in txs if r["GL_Code"] == code), None)
            name = hit["GL_Account"] if hit else code
            op_dr = op_cr = 0
        dr = txn_dr.get(code, 0)
        cr = txn_cr.get(code, 0)
        summary.append([
            code, name, "Matched",
            round(op_dr, 2), round(op_cr, 2), round(op_dr - op_cr, 2),
            round(dr, 2), round(cr, 2),
            round(op_dr + dr, 2), round(op_cr + cr, 2),
            round((op_dr + dr) - (op_cr + cr), 2),
        ])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a realistic 12-month CIG Motors GL.")
    parser.add_argument("--year", type=int, default=2025)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", default=None,
                        help="Output .xlsx path (default overwrites Sample GL_complete_dirty.xlsx)")
    args = parser.parse_args()

    txs = gen_transactions(args.year, args.seed)
    out = Path(args.output) if args.output else Path(__file__).parent / "Sample GL_complete_dirty.xlsx"
    write_workbook(txs, out)

    # Quick totals so you can eyeball the result
    total_dr = sum(r["Debit"] for r in txs)
    total_cr = sum(r["Credit"] for r in txs)
    print(f"✓ wrote {out} — {len(txs):,} transaction rows")
    print(f"  totals: Dr {total_dr:,.0f} · Cr {total_cr:,.0f} · diff {total_dr - total_cr:,.2f}")
    # Opening TB check
    op_dr = sum(o[2] for o in OPENING.values() if o[2] >= 0)
    op_cr = -sum(o[2] for o in OPENING.values() if o[2] < 0)
    print(f"  opening TB: Dr {op_dr:,.0f} · Cr {op_cr:,.0f} · diff {op_dr - op_cr:,.2f}")


if __name__ == "__main__":
    main()
