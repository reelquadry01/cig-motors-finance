# Financial Statement Review — Chartered Accountant Findings & Fix Design

**Date:** 2026-09-14
**Status:** Approved
**Reviewed by:** Chartered Accountant (CA) perspective
**Scope:** P&L, Balance Sheet, Cash Flow, Ratios — IAS 1 / IAS 7 / IAS 12 / IFRS 16 compliance

---

## Executive Summary

The financial statements have **fundamental structural flaws** that would result in a qualified audit opinion. The Balance Sheet equation holds (Assets = Liabilities + Equity) and P&L arithmetic is correct, but the Cash Flow statement is not a cash flow statement, two of three liquidity ratios are materially wrong, and several IFRS presentation requirements are violated.

### Critical Findings Count

| Statement | Critical | High | Moderate | Low |
|-----------|----------|------|----------|-----|
| Cash Flow | 6 | 0 | 0 | 0 |
| P&L | 1 | 4 | 3 | 3 |
| Balance Sheet | 1 | 2 | 3 | 1 |
| Ratios | 2 | 1 | 0 | 0 |
| **Total** | **10** | **7** | **6** | **4** |

---

## SECTION 1: CASH FLOW STATEMENT

### Verdict: **NOT A CASH FLOW STATEMENT — COMPLETE REWRITE REQUIRED**

The current `build_cash_flow()` function in `pipeline/build_statements.py:425-456` does not produce a GAAP-compliant cash flow statement. It sums raw `Net = Debit - Credit` for accounts tagged with `CF_Category` in the mapping, producing meaningless results.

### Critical Issues

| # | Issue | Impact |
|---|-------|--------|
| CF-1 | Balance sheet balances (Inventories 18.4B, PPE 5.1B, Receivables 3.8B) dumped into "Operating" section | Not cash flows — these are period-end positions, not movements |
| CF-2 | P&L items (Revenue -6.3B, COS 4.4B, G&A 1.2B) mixed into operating section | Indirect method requires starting from PBT, not raw revenue/expenses |
| CF-3 | Investing section shows B/S carrying values (PPE 20.9B, ROU 870M) | Should show acquisitions/disposals, not balances |
| CF-4 | Financing section shows equity balances (Share Capital -5B, Retained Earnings -18.4B) | Equity balances are not financing cash flows |
| CF-5 | Net change = 0 is a mathematical artifact of double-entry bookkeeping | Not a meaningful result |
| CF-6 | Opening/Closing cash hardcoded to 0 | Must reconcile opening → closing per IAS 7 |

### Root Cause

```python
# Current (BROKEN):
df = merged[merged["CF_Category"].isin(cfg.CF_CATEGORIES)]
grouped = df.groupby(["CF_Category", "FS_Heading"]).agg(Net=("Net", "sum"))
# This sums raw Debit - Credit per account — NOT cash flows
```

### Fix: Indirect Method Implementation

Rewrite `build_cash_flow()` to implement IAS 7 indirect method:

```
Operating Activities:
  Profit Before Tax (from P&L)                          XXX
  Adjustments for non-cash items:
    Depreciation & Amortization (from P&L)              +XXX
    Interest expense (from P&L)                         +XXX
  Operating profit before working capital changes        XXX
  Changes in working capital:
    (Increase)/Decrease in receivables                  +XXX
    (Increase)/Decrease in inventories                  +XXX
    Increase/(Decrease) in payables                     +XXX
    (Increase)/Decrease in prepayments                  +XXX
  Cash generated from operations                        XXX
  Interest paid                                         -XXX
  Income tax paid                                       -XXX
  Net cash from operating activities                    XXX

Investing Activities:
  Purchase of PPE (from capex data)                     -XXX
  Proceeds from disposal of PPE                         +XXX
  Net cash from investing activities                    XXX

Financing Activities:
  Proceeds from borrowings (B/S movement)               +XXX
  Repayment of borrowings (B/S movement)                -XXX
  Proceeds from share issuance (B/S movement)           +XXX
  Dividends paid (if any)                               -XXX
  Lease principal payments                              -XXX
  Net cash from financing activities                    XXX

Net increase/(decrease) in cash                         XXX
Cash at beginning of period                             XXX
Cash at end of period                                   XXX
```

### Data Sources for Indirect Method

| Need | Source | How |
|------|--------|-----|
| Profit Before Tax | `pl.pbt` | Direct |
| Depreciation | `pl.total_depreciation` | Direct |
| Interest expense | `pl.total_finance_costs` | Direct |
| Working capital changes | `tb_by_period` + `tb_meta` + mapping `Normal_Balance` | Compute delta between periods |
| Capex | `pl.capex` | Direct |
| Borrowing movements | `tb_by_period` for non-current liability accounts | Delta between periods |
| Equity movements | `tb_by_period` for equity accounts | Delta between periods |
| Opening cash | `tb_opening_by_period` or first period B/S cash balance | Derive from data |
| Closing cash | Current period B/S cash balance | From `bs.current_assets` matching "cash" |

### New CF Output Structure

```json
{
  "operating": {
    "items": [
      {"label": "Profit before tax", "value": 439447900},
      {"label": "Depreciation & amortization", "value": 166125300, "adjustment": true},
      {"label": "Interest expense", "value": 94141200, "adjustment": true},
      {"label": "Increase in trade receivables", "value": -3750000000},
      {"label": "Increase in inventories", "value": -18410000000},
      {"label": "Increase in trade payables", "value": 5158670800}
    ],
    "total": -16300905100
  },
  "investing": {
    "items": [
      {"label": "Purchase of property, plant and equipment", "value": -20925000000}
    ],
    "total": -20925000000
  },
  "financing": {
    "items": [
      {"label": "Proceeds from borrowings", "value": 30669540000},
      {"label": "Lease principal payments", "value": -370000000}
    ],
    "total": 30299540000
  },
  "net_change": -6926465100,
  "opening_cash": 15115979400,
  "closing_cash": 8189514300
}
```

---

## SECTION 2: P&L (INCOME STATEMENT)

### Verdict: **ARITHMETICALLY CORRECT — MATERIAL IFRS COMPLIANCE GAPS**

P&L arithmetic verified: GP = Rev - COS ✓, OP = GP - OpEx - Depr + Other Income ✓, PBT = OP - Finance ✓, PAT = PBT - Tax ✓. Margins correct. However, several IAS 1 presentation requirements are violated.

### Critical Issues

| # | Issue | Impact | IAS Reference |
|---|-------|--------|---------------|
| PL-1 | Interest expense on Lease Liability (NGN 32.7M) classified in OpEx instead of Finance Costs | Overstates operating profit; understates finance costs; misstates interest coverage by ~43% | IFRS 16.52, IAS 1.82(b) |

### High Issues

| # | Issue | Impact | IAS Reference |
|---|-------|--------|---------------|
| PL-2 | Distribution costs vs. Administrative expenses not separated | Single OpEx line hides material functional analysis | IAS 1.99 |
| PL-3 | Other Income and Other Gains/Losses combined into one line | Obscures operating vs. non-operating income | IAS 1.87(a) |
| PL-4 | Monthly summary operating profit excludes Other Income (NGN 6.8M difference) | Users see contradictory numbers for same period | Internal consistency |
| PL-5 | Vehicle sales segment shows COGS (NGN 842M) > Revenue (NGN 604M) — gross loss | Potential mapping error or genuine margin erosion requiring investigation | IAS 1.104 |

### Moderate Issues

| # | Issue | Impact |
|---|-------|--------|
| PL-6 | Revenue net of trade discounts not confirmed | IAS 1.33 risk |
| PL-7 | OCI not included in equity (if any exists) | IAS 1.106 |
| PL-8 | Capex (NGN 20.9B) presented in P&L output — misleading | Non-standard; capex is B/S/CF, not P&L |

### Low Issues

| # | Issue | Impact |
|---|-------|--------|
| PL-9 | 15.75% effective tax rate undocumented (Nigeria statutory: 30%) | IAS 12 disclosure |
| PL-10 | "Other Gains/Losses" sign convention confusing (credit-positive for mixed category) | UX |
| PL-11 | No comparative period or discontinued ops provision | IAS 1.38/82 |

### Fixes Required

1. **Reclassify lease interest** from OpEx to Finance Costs in Statement Mapping
2. **Separate Distribution vs. Admin** in Statement Mapping (`Statement_Section` values)
3. **Separate Other Income from Other Gains/Losses** in config grouping
4. **Align monthly summary formula** with main P&L: `OP = GP - OpEx - Depr + OtherIncome`
5. **Move capex out of P&L** into separate analytical section
6. **Add effective tax rate** to P&L output: `tax / pbt`

---

## SECTION 3: BALANCE SHEET

### Verdict: **EQUATION BALANCES — MATERIAL CLASSIFICATION DEFICIENCIES**

The accounting equation holds: Assets (63,660,895,800) = Liabilities (36,198,210,800) + Equity (27,462,685,000). Sign convention correctly implemented via `Normal_Balance`. However, classification and presentation issues exist.

### Critical Issues

| # | Issue | Impact | IAS Reference |
|---|-------|--------|---------------|
| BS-1 | Quick ratio = Current ratio (inventory excluded incorrectly) | Overstates liquidity by 149% (7.13x vs correct 2.86x) | Standard practice |

### High Issues

| # | Issue | Impact | IAS Reference |
|---|-------|--------|---------------|
| BS-2 | Borrowings (NGN 30.7B) entirely non-current — no current portion split | Current liabilities understated; current ratio overstated | IAS 1.60 |
| BS-3 | Lease Liability (NGN 370M) entirely non-current — no IFRS 16 split | Current liabilities understated | IFRS 16.47-48 |

### Moderate Issues

| # | Issue | Impact |
|---|-------|--------|
| BS-4 | PAT appended as "Net Income for the Period" instead of rolling into Retained Earnings | Non-standard equity presentation |
| BS-5 | Blanket reclassification of "Other" to Assets — masks data quality issues | Audit trail weakened |
| BS-6 | "Deposit for shares" (NGN 2.5B) classified as equity — may be liability if refundable | Classification risk |

### Low Issues

| # | Issue | Impact |
|---|-------|--------|
| BS-7 | FS_Heading labels non-standard (e.g., "Right of Use Asset" vs "Right-of-use assets") | IFRS terminology |

### Fixes Required

1. **Fix quick ratio**: `quick_ratio = (total_ca - inventories - prepayments) / total_cl`
2. **Add current portion of borrowings** — configurable percentage in `config.py` (e.g., `CURRENT_PORTION_PCT = 0.10` for 10% current)
3. **Add current portion of lease liability** — next 12 months of payments as current
4. **Roll PAT into Retained Earnings** or label as "Retained earnings (incl. profit for the period)"
5. **Remove blanket Other→Assets reclass** — require explicit mapping, log warnings for unmapped items
6. **Review "Deposit for shares"** classification

---

## SECTION 4: RATIOS

### Verdict: **TWO OF THREE LIQUIDITY RATIOS MATERIALLY WRONG — EFFICIENCY RATIOS ZEROED OUT**

### Critical Issues

| # | Issue | Reported | Correct | Error |
|---|-------|----------|---------|-------|
| R-1 | Quick ratio = Current ratio | 7.13x | 2.86x | +149% overstated |
| R-2 | Cash ratio uses broken CF data (operating CF total, not cash balance) | 7.04x | 1.59x | +343% overstated |

### High Issues

| # | Issue | Impact |
|---|-------|--------|
| R-3 | Efficiency ratios (inventory_turnover, receivables_turnover, DSO, DIO) all hardcoded to 0 | Data available but not computed |

### Fixes Required

1. **Fix quick_ratio**: Use `(total_ca - inventory - prepayments) / total_cl`
2. **Fix cash_ratio**: Use `cash_and_equivalents / total_cl` (not operating CF)
3. **Compute efficiency ratios**:
   - `inventory_turnover = cogs / inventory`
   - `receivables_turnover = revenue / trade_receivables`
   - `days_sales_outstanding = 365 / receivables_turnover`
   - `days_inventory_outstanding = 365 / inventory_turnover`

### Additional Ratios to Add

| Ratio | Formula | Data Available? |
|-------|---------|-----------------|
| EBITDA | operating_profit + depreciation | Yes |
| EBITDA margin | ebitda / revenue | Yes |
| Effective tax rate | tax / pbt | Yes |
| Working capital | total_ca - total_cl | Yes (in BS, not in ratios) |
| Net debt | total_borrowings - cash | Yes |
| Net debt / EBITDA | net_debt / annualized_ebitda | Yes |
| ROCE | ebit / (total_assets - current_liabilities) | Yes |

---

## SECTION 5: IMPLEMENTATION PLAN

### Phase 1: Critical Fixes (Must Do)

| Fix | File | Change |
|-----|------|--------|
| Quick ratio | `build_statements.py:421`, `ratios.py:25` | Subtract inventory + prepayments from CA |
| Cash ratio | `ratios.py:30` | Use cash_and_equivalents / total_cl |
| CF rewrite | `build_statements.py:425-456` | Indirect method implementation |
| Lease interest reclass | Statement Mapping Excel | Move from OpEx to Finance Costs |

### Phase 2: High Priority (Should Do)

| Fix | File | Change |
|-----|------|--------|
| Current portion borrowings | `config.py` | Add CURRENT_BORROWING_PCT config |
| Current portion lease | `build_statements.py` | Split lease liability |
| Monthly summary alignment | `build_statements.py:541` | Include Other Income in OP |
| Efficiency ratios | `ratios.py` | Compute inventory_turnover, receivables_turnover, DSO, DIO |
| Distribution vs Admin separation | Statement Mapping + `config.py` | Split OpEx sections |

### Phase 3: Moderate (Nice to Have)

| Fix | File | Change |
|-----|------|--------|
| PAT → Retained Earnings | `build_statements.py:398-403` | Merge into RE line |
| Remove Other→Assets blanket reclass | `config.py:66` | Log warnings instead |
| Add EBITDA + EBITDA margin | `ratios.py` | New calculations |
| Add effective tax rate | `ratios.py` | tax / pbt |
| Move capex out of P&L | `build_statements.py` | Separate function |
| Separate Other Income/Gains | `config.py` | Two distinct sections |

---

## SECTION 6: VERIFICATION CHECKLIST

After fixes, verify:

- [ ] Cash flow: opening_cash + net_change = closing_cash
- [ ] Cash flow: closing_cash matches B/S cash and cash equivalents
- [ ] Cash flow: operating + investing + financing = net_change
- [ ] P&L: GP = Revenue - COS
- [ ] P&L: OP = GP - OpEx - Depr + Other Income
- [ ] P&L: PBT = OP - Finance Costs (including lease interest)
- [ ] P&L: PAT = PBT - Tax
- [ ] B/S: Assets = Liabilities + Equity
- [ ] B/S: Quick ratio ≠ Current ratio (unless zero inventory)
- [ ] Ratios: cash_ratio = cash / CL (not operating CF / CL)
- [ ] Ratios: All efficiency ratios > 0 (not hardcoded to 0)
- [ ] All IAS 1 presentation requirements met
