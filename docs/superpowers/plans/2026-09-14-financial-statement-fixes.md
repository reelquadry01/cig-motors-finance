# Financial Statement Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all chartered accountant findings across P&L, Balance Sheet, Cash Flow, and Ratios — both in the Python pipeline and the Excel export.

**Architecture:** Pipeline generates corrected data → Excel formulas propagate automatically via TB → Notes → Statements chain. Cash Flow sheet and Ratio formulas require direct changes in `excelExport.js`.

**Tech Stack:** Python (pandas, openpyxl), JavaScript (exceljs), React

---

## File Map

| File | Changes |
|------|---------|
| `pipeline/build_statements.py` | Fix quick ratio, rewrite cash flow (indirect method), align monthly summary, move capex out of P&L |
| `pipeline/config.py` | Add CF indirect method config, current portion borrowing %, separate Other Income/Gains |
| `pipeline/ratios.py` | Fix quick ratio, fix cash ratio, add efficiency ratios, add EBITDA |
| `pipeline/main.py` | Pass additional data to cash flow builder |
| `dashboard/src/lib/excelExport.js` | Fix CF sheet (indirect method formulas), fix ratio formulas |
| `dashboard/src/components/CFView.jsx` | Update for new CF structure |
| `Statement_Mapping.xlsx` | Reclassify lease interest from OpEx to Finance Costs |

---

### Task 1: Fix Quick Ratio (Critical)

**Files:**
- Modify: `pipeline/build_statements.py:420-421`
- Modify: `pipeline/ratios.py:25`

- [ ] **Step 1: Fix quick ratio in build_balance_sheet()**

In `pipeline/build_statements.py`, find line 421:
```python
"quick_ratio": round(safe_div(total_ca, total_cl), 2),
```
Replace with:
```python
inventories = sum(i["value"] for i in current_assets_list if "inventor" in i["label"].lower())
prepayments = sum(i["value"] for i in current_assets_list if "prepayment" in i["label"].lower())
quick_assets = total_ca - inventories - prepayments
"quick_ratio": round(safe_div(quick_assets, total_cl), 2),
```

Note: Need to capture the `current_assets_list` before it's consumed. Look at the loop that builds `current_assets` items — the list variable name is `ca_items` or similar. Use that.

- [ ] **Step 2: Fix quick ratio fallback in ratios.py**

In `pipeline/ratios.py`, find line 25:
```python
quick_ratio = bs.get("quick_ratio", round(safe_div(total_ca, total_cl), 2))
```
Replace with:
```python
quick_ratio = bs.get("quick_ratio", 0)
```

- [ ] **Step 3: Run pipeline and verify**

Run: `python -m pipeline.main --gl "Sample GL_complete_dirty.xlsx" --mapping "Statement_Mapping.xlsx"`
Expected: `dashboard/public/data/dashboard_data.json` updated
Verify: `bs.quick_ratio` should be ~2.86 (not 7.13)

- [ ] **Step 4: Commit**

```bash
git add pipeline/build_statements.py pipeline/ratios.py
git commit -m "fix: quick ratio now excludes inventory and prepayments"
```

---

### Task 2: Fix Cash Ratio (Critical)

**Files:**
- Modify: `pipeline/ratios.py:30`

- [ ] **Step 1: Fix cash ratio formula**

In `pipeline/ratios.py`, find line 30:
```python
"cash_ratio": round(safe_div(operating_cf, total_cl), 2),
```
Replace with:
```python
cash_and_equivalents = 0
for item in bs.get("current_assets", []):
    if "cash" in item["label"].lower():
        cash_and_equivalents += item["value"]
"cash_ratio": round(safe_div(cash_and_equivalents, total_cl), 2),
```

- [ ] **Step 2: Run pipeline and verify**

Run: `python -m pipeline.main --gl "Sample GL_complete_dirty.xlsx" --mapping "Statement_Mapping.xlsx"`
Verify: `ratios.cash_ratio` should be ~1.59 (not 7.04)

- [ ] **Step 3: Commit**

```bash
git add pipeline/ratios.py
git commit -m "fix: cash ratio uses cash balance, not broken operating CF"
```

---

### Task 3: Rewrite Cash Flow — Indirect Method (Critical)

**Files:**
- Modify: `pipeline/build_statements.py:425-456` (rewrite `build_cash_flow`)
- Modify: `pipeline/config.py` (add CF indirect method config)
- Modify: `pipeline/main.py` (pass pl + bs to cash flow builder)

- [ ] **Step 1: Add CF indirect method config to config.py**

Add to `pipeline/config.py` after `CF_CATEGORIES`:

```python
# Cash Flow — Indirect Method
# Working capital FS_Headings that map to current assets (increase = cash outflow)
CF_CURRENT_ASSET_KEYWORDS = [
    "receivable", "inventor", "prepayment", "due from",
    "other receivable", "expected credit loss",
]
# Working capital FS_Headings that map to current liabilities (increase = cash inflow)
CF_CURRENT_LIABILITY_KEYWORDS = [
    "payable", "accrued", "other payable",
]
# Non-current liability keywords for financing activities
CF_NONCURRENT_LIABILITY_KEYWORDS = [
    "borrowing", "lease liability", "loan",
]
# Equity keywords for financing activities
CF_EQUITY_KEYWORDS = [
    "share capital", "capital reserve", "deposit for shares",
    "retained earnings",
]
```

- [ ] **Step 2: Rewrite build_cash_flow() in build_statements.py**

Replace the entire `build_cash_flow` function (lines 425-456) with:

```python
def build_cash_flow(merged: pd.DataFrame, pl: dict = None, bs: dict = None) -> dict:
    """Build indirect-method Cash Flow per IAS 7.

    Requires P&L and B/S data for the period, plus the full merged
    DataFrame for working capital change analysis.
    """
    # --- Operating Activities (indirect method) ---
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

    # Working capital changes — compute from merged data
    # Group by FS_Heading and sum Net for the period
    if bs:
        ca_items = bs.get("current_assets", [])
        cl_items = bs.get("current_liabilities", [])

        # For each current asset line, the change is the period's Net activity
        # (which represents Debit - Credit movement during the period)
        for item in ca_items:
            label = item["label"]
            value = item["value"]
            if "cash" in label.lower():
                continue  # Cash is the reconciliation target, not a WC change
            # Increase in current asset = cash outflow (negative)
            operating_items.append({
                "label": f"(Increase)/Decrease in {label}",
                "value": round(-abs(value), 2) if value > 0 else round(abs(value), 2),
            })

        for item in cl_items:
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

    # --- Investing Activities ---
    investing_items = []
    capex = pl.get("capex", 0) if pl else 0
    if capex:
        investing_items.append({"label": "Purchase of property, plant and equipment", "value": round(-capex, 2)})

    investing_total = sum(i["value"] for i in investing_items)

    # --- Financing Activities ---
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

    # --- Reconciliation ---
    net_change = round(operating_total + investing_total + financing_total, 2)

    # Opening/closing cash from B/S
    opening_cash = 0
    closing_cash = 0
    if bs:
        for item in bs.get("current_assets", []):
            if "cash" in item["label"].lower():
                closing_cash += item["value"]
    # For opening cash, derive from net_change if closing is known
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
```

- [ ] **Step 3: Update main.py to pass pl + bs to build_cash_flow**

In `pipeline/main.py`, find where `build_cash_flow` is called. Change from:
```python
cf = build_cash_flow(bs_cf_data)
```
To:
```python
cf = build_cash_flow(bs_cf_data, pl=pl, bs=bs)
```

- [ ] **Step 4: Run pipeline and verify**

Run: `python -m pipeline.main --gl "Sample GL_complete_dirty.xlsx" --mapping "Statement_Mapping.xlsx"`
Verify:
- `cf.opening_cash` is NOT zero
- `cf.closing_cash` matches `bs.current_assets` cash line
- `cf.net_change` = `cf.opening_cash` to `cf.closing_cash` difference
- Operating section starts with PBT, adds back depreciation/interest
- No "Cash and cash equivalents" or "Revenue" in operating items

- [ ] **Step 5: Commit**

```bash
git add pipeline/build_statements.py pipeline/config.py pipeline/main.py
git commit -m "feat: rewrite cash flow to IAS 7 indirect method"
```

---

### Task 4: Fix Monthly Summary Operating Profit (High)

**Files:**
- Modify: `pipeline/build_statements.py:541` (monthly summary section)

- [ ] **Step 1: Find and fix the monthly summary OP formula**

In `build_statements.py`, find the monthly summary section (around line 541). The current formula is:
```python
operating_profit = round(revenue - cogs - opex, 2)
```

Find the line that computes `operating_profit` in the monthly summary context. It should be near where `dep` and `other_income` are computed for the monthly summary. Change to:
```python
operating_profit = round(revenue - cogs - opex - dep + other_income, 2)
```

Look for the exact variable names used in that scope — they may be `depreciation` instead of `dep`, or `other_inc` instead of `other_income`. Match the existing naming convention.

- [ ] **Step 2: Run pipeline and verify**

Verify: Monthly summary `operating_profit` for 2025-01 should match main P&L `operating_profit` (533,589,100).

- [ ] **Step 3: Commit**

```bash
git add pipeline/build_statements.py
git commit -m "fix: align monthly summary operating profit with main P&L"
```

---

### Task 5: Move Capex Out of P&L (Moderate)

**Files:**
- Modify: `pipeline/build_statements.py` (remove capex from build_pl return)
- Modify: `pipeline/main.py` (compute capex separately)

- [ ] **Step 1: Remove capex from build_pl() return dict**

In `build_pl()`, remove the `capex` and `capex_breakdown` keys from the returned dict. These belong in the cash flow / investing analysis, not the P&L.

- [ ] **Step 2: Create standalone capex computation in main.py**

Add a helper function or inline computation in `main.py` that extracts capex from the merged data (same logic that was in `build_pl`):
```python
capex_df = merged[
    (merged["Statement_Section"].isin(cfg.BS_ASSET_SECTIONS))
    & (merged["FS_Heading"].astype(str).str.contains("property|plant|equipment", case=False, na=False))
    & (merged["Note_Heading"].astype(str).str.contains("cost|addition", case=False, na=False))
]
capex = round(capex_df["Net"].sum(), 2) if not capex_df.empty else 0
```

Pass this to the JSON output as a top-level `capex` field (not inside `pl`).

- [ ] **Step 3: Update CF builder to use the new capex source**

In the rewritten `build_cash_flow`, get capex from the standalone value instead of `pl.get("capex")`.

- [ ] **Step 4: Update CFView.jsx if it references data.pl.capex**

Check `dashboard/src/components/CFView.jsx` for any reference to `data.pl.capex` — change to `data.capex`.

- [ ] **Step 5: Run pipeline and verify**

Verify: `pl` dict no longer has `capex` key. Top-level `capex` field exists in JSON.

- [ ] **Step 6: Commit**

```bash
git add pipeline/build_statements.py pipeline/main.py dashboard/src/components/CFView.jsx
git commit -m "refactor: move capex from P&L to standalone field"
```

---

### Task 6: Add Efficiency Ratios (High)

**Files:**
- Modify: `pipeline/ratios.py`

- [ ] **Step 1: Add efficiency ratio calculations**

After the existing ratio calculations in `ratios.py`, add:

```python
# Efficiency ratios
inventory = sum(i["value"] for i in bs.get("current_assets", []) if "inventor" in i["label"].lower())
trade_receivables = sum(i["value"] for i in bs.get("current_assets", []) if "receivable" in i["label"].lower())

inventory_turnover = round(safe_div(cogs, inventory), 2) if inventory else 0
receivables_turnover = round(safe_div(revenue, trade_receivables), 2) if trade_receivables else 0

# Add to ratios dict:
"inventory_turnover": inventory_turnover,
"receivables_turnover": receivables_turnover,
"days_inventory_outstanding": round(safe_div(365, inventory_turnover), 0) if inventory_turnover else 0,
"days_sales_outstanding": round(safe_div(365, receivables_turnover), 0) if receivables_turnover else 0,
```

- [ ] **Step 2: Add EBITDA and effective tax rate**

```python
ebitda = round(operating_profit + depreciation, 2)
ebitda_margin = round(safe_div(ebitda, revenue) * 100, 1)
effective_tax_rate = round(safe_div(total_tax, pbt) * 100, 1) if pbt else 0

# Add to ratios dict:
"ebitda": ebitda,
"ebitda_margin": ebitda_margin,
"effective_tax_rate": effective_tax_rate,
"working_capital": bs.get("working_capital", 0),
"net_debt": round((total_borrowings + lease_liability) - cash_and_equivalents, 2),
```

- [ ] **Step 3: Run pipeline and verify**

Verify: New ratios appear in `dashboard_data.json` → `ratios` section.

- [ ] **Step 4: Commit**

```bash
git add pipeline/ratios.py
git commit -m "feat: add efficiency ratios, EBITDA, effective tax rate, net debt"
```

---

### Task 7: Update Excel Export — Cash Flow Sheet (Critical)

**Files:**
- Modify: `dashboard/src/lib/excelExport.js` (sheetCash function)

- [ ] **Step 1: Rewrite sheetCash() for indirect method**

The current `sheetCash()` (lines 649-675) uses SUMIFS on TB by CF category. Replace with formula-driven indirect method that references the Income statement and Balance sheet.

The new CF sheet should:
1. **Operating section**: Reference PBT from IS, add back depreciation/interest from IS, compute WC changes from BS
2. **Investing section**: Reference capex from a dedicated line
3. **Financing section**: Reference borrowings/equity movements from BS
4. **Reconciliation**: Opening cash + net change = closing cash (reference BS cash)

Key formulas:
- PBT cell: `=Notes!$C${pbtRow}` (reference to IS PBT total)
- Depreciation: `=Notes!$C${deprRow}`
- Interest: `=Notes!$C${interestRow}`
- WC changes: `=Notes!$C${receivablesRow} * -1` (sign flip for increase = outflow)
- Net change: `=SUM(B{first}:B{last})` per section
- Opening cash: `=Notes!$C${cashOpeningRow}` or hardcoded from data
- Closing cash: `=Notes!$C${cashClosingRow}`

- [ ] **Step 2: Update the sign() function for CF**

The `sign()` function (line 155) currently handles credit-positive groups. For the indirect method CF, the sign convention is different — increases in assets are negative, increases in liabilities are positive. Update the CF-specific logic.

- [ ] **Step 3: Test Excel export**

Generate an Excel file from the dashboard and verify:
- CF sheet shows indirect method structure
- Operating section starts with PBT
- Depreciation and interest are add-backs
- WC changes show increase/decrease labels
- Net change matches pipeline output
- Opening + net = closing cash

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/lib/excelExport.js
git commit -m "fix: Excel CF sheet uses indirect method formulas"
```

---

### Task 8: Update Excel Export — Ratio Formulas (Critical)

**Files:**
- Modify: `dashboard/src/lib/excelExport.js` (sheetRatios function)

- [ ] **Step 1: Fix quick ratio formula in Excel**

In `sheetRatios()`, find where the quick ratio is computed. Change from:
```
=IF(BS!$C${cl}=0,0,BS!$C${ca}/BS!$C${cl})
```
To:
```
=IF(BS!$C${cl}=0,0,(BS!$C${ca}-BS!$C${inventoryRow}-BS!$C${prepaymentRow})/BS!$C${cl})
```

Need to capture the inventory and prepayment row references from the BS sheet.

- [ ] **Step 2: Fix cash ratio formula in Excel**

Change from using operating CF to:
```
=IF(BS!$C${cl}=0,0,BS!$C${cashRow}/BS!$C${cl})
```

- [ ] **Step 3: Add new ratio rows**

Add rows for:
- EBITDA and EBITDA margin
- Effective tax rate
- Inventory turnover
- Receivables turnover
- Days inventory outstanding
- Days sales outstanding
- Net debt
- Net debt / EBITDA

Each with appropriate formulas referencing IS/BS sheets.

- [ ] **Step 4: Test Excel export**

Verify all ratio formulas produce correct values.

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/lib/excelExport.js
git commit -m "fix: Excel ratio formulas — quick ratio, cash ratio, add efficiency ratios"
```

---

### Task 9: Update CFView.jsx for New Structure (High)

**Files:**
- Modify: `dashboard/src/components/CFView.jsx`

- [ ] **Step 1: Update component for new CF data structure**

The new CF structure has:
- `operating.items` with adjustment flags
- `investing.items`
- `financing.items`
- `net_change`, `opening_cash`, `closing_cash`

Update the component to:
1. Show opening cash → net change → closing cash reconciliation panel
2. Display adjustment items (depreciation, interest) with visual distinction
3. Show working capital changes as a sub-group
4. Update the donut chart to use the three section totals

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/CFView.jsx
git commit -m "feat: CFView displays indirect method cash flow"
```

---

### Task 10: Update RatiosView.jsx for New Ratios (High)

**Files:**
- Modify: `dashboard/src/components/RatiosView.jsx`

- [ ] **Step 1: Add new ratio cards**

Add display sections for:
- EBITDA and EBITDA margin
- Efficiency ratios (inventory turnover, receivables turnover, DSO, DIO)
- Net debt and Net debt/EBITDA
- Effective tax rate

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/RatiosView.jsx
git commit -m "feat: display efficiency ratios, EBITDA, net debt in dashboard"
```

---

### Task 11: Full Pipeline Test & Build (Verification)

**Files:** All modified files

- [ ] **Step 1: Run full pipeline**

```bash
python -m pipeline.main --gl "Sample GL_complete_dirty.xlsx" --mapping "Statement_Mapping.xlsx"
```

- [ ] **Step 2: Verify JSON output**

Check all sections:
- `pl.operating_profit` matches monthly summary
- `pl` no longer has `capex` key
- `bs.quick_ratio` ≈ 2.86 (not 7.13)
- `cf.operating.items[0].label` = "Profit before tax"
- `cf.opening_cash` ≠ 0
- `cf.closing_cash` matches BS cash
- `ratios.cash_ratio` ≈ 1.59
- `ratios.inventory_turnover` > 0
- `ratios.receivables_turnover` > 0
- `ratios.ebitda` > 0

- [ ] **Step 3: Build React dashboard**

```bash
cd dashboard && npm run build
```

- [ ] **Step 4: Verify dashboard loads**

Check: CFView shows indirect method, RatiosView shows new ratios, no console errors.

- [ ] **Step 5: Generate Excel and verify**

Open dashboard, click Export, generate Excel. Verify:
- CF sheet has indirect method structure
- Ratios sheet has correct formulas
- All cross-sheet references work

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "fix: complete financial statement review fixes — CF, ratios, Excel export"
```
