# CIG Motors Dashboard — Data Integrity Philosophy

## No Placeholders. No Fake Data. Only Real Numbers.

This dashboard is built on a principle: **if data doesn't exist, that section doesn't appear.** We don't generate plausible-sounding dummy values. We don't show "TBD" or "N/A" in key metrics. Instead, the dashboard gracefully skips sections that lack real data and focuses on what we actually know.

---

## Why This Matters

1. **Trust:** A CFO looking at the dashboard at 2am before a board meeting needs to trust every number. One fake placeholder can undermine credibility for everything else.

2. **Audit Trail:** Auditors and lenders will ask "where did this come from?" If we can't point to a source document or calculation, it shouldn't be there.

3. **Operational Clarity:** Missing data highlights what needs to be done. "We don't have a budget for Q2" is actionable feedback. A fake budget obscures that gap.

4. **Simplicity:** Rather than trying to invent missing data, we provide templates. The templates are honest — they say "fill this in if you have it." No guessing. No magic.

---

## The Two Sources of Truth

### **Source 1: Sage 300 GL (Required)**
- **What it provides:** Actual transactions, account balances, period-end positions
- **Freshness:** Updated daily (or at each transaction)
- **Reliability:** Audited; reconciled; subject to internal controls
- **Pipeline reads:** GL_Clean.xlsx → financial statements (P&L, B/S, Cash Flow)
- **Dashboard impact:** Always shows; no option to hide

### **Source 2: Finance Inputs (Optional, On-Demand)**
These are not "system data" — they're management inputs. They require human judgment and must be entered deliberately:

| Input | Frequency | Role in Dashboard |
|-------|-----------|-------------------|
| Budget | Annual (or rolling monthly) | Revenue vs Actual; Variance flags |
| Covenants | Annual or at debt renewal | Compliance indicators; Red/green lights |
| Commentary | Monthly (after close) | Narrative; "Things to Watch"; Context |
| Prior Year | Annual or quarterly | Growth rates; YoY comparison |

---

## When Data Isn't Available

### Example 1: Budget Not Yet Entered
**What we don't do:**
- Create a default budget based on historical average (wrong, anecdotal)
- Assume budget = last year's actual (misleading)
- Show "Budget: TBD" (dashboard clutter)

**What we do:**
- Read GL_Clean only
- Render P&L with actuals
- Hide the "Revenue vs Budget" panel entirely
- Log: "Budget_Template.xlsx not found — revenue variance panel skipped"

**Result:** Dashboard shows a honest P&L. No budget comparison, but no false data either.

---

### Example 2: Covenants Not Yet Defined
**What we don't do:**
- Apply "industry standard" ratios (e.g., "assume Current Ratio target of 1.5")
- Highlight ratios in red/green based on heuristics

**What we do:**
- Calculate key ratios (Current Ratio, Gearing, DSCR, etc.) from GL actuals
- Show ratios with 12-month trends
- Hide red/green compliance flags
- Log: "Covenant_Template.xlsx not found — no compliance indicators shown, ratios only"

**Result:** Dashboard shows ratio trends. CFO can eyeball whether they're improving or declining. No false flags.

---

### Example 3: Commentary Not Yet Written
**What we don't do:**
- Auto-generate narrative from ratios (e.g., "Revenue increased 12% YoY due to Spare Parts growth")
- Show template prompts in the dashboard (clutter)

**What we do:**
- Hide the "Management Commentary" tab
- Keep the "Ratios & Covenants" tab (hard numbers only)
- Log: "Commentary_Template.xlsx not found — narrative section skipped"

**Result:** Board sees numbers. If they want narrative, CFO provides it separately or fills the template for next month.

---

## The Template Approach

Each missing-data category has a corresponding template. Templates are:
- **Structured** (not free-form) → ensures consistent data entry
- **Honest** (show exactly what's needed) → don't pretend to know more than we do
- **Repeatable** (same format every month/year) → can be automated later
- **Optional** (dashboard works without them) → no pressure to fill with fake data

### Example: Budget_Template.xlsx
```
GL_Code | Account_Name          | Jan | Feb | Mar | ... | Dec
40000   | Motor Vehicles Revenue | [fill in] | [fill in] | ...
50000   | Motor Vehicles COGS    | [fill in] | [fill in] | ...
...
```

**Rules:**
- Only GL codes from Statement_Mapping (no made-up accounts)
- Only months (Jan–Dec; no sub-month granularity)
- Blank cells are OK (means "no budget for this code/month")
- Currency is NGN (or USD for USD accounts, clearly separated)

---

## The Monthly Refresh Checklist

| Step | Action | Data Source | Status |
|------|--------|-------------|--------|
| 1 | Sage 300 close complete | System | ✓ (Required) |
| 2 | GL export → GL_Clean | Sage 300 + GL Cleaner | ✓ (Required) |
| 3 | Account reconciliation check | GL_Clean Account_Summary | ✓ (Required) |
| 4 | Enter monthly budget | Finance/CFO | ? (Optional) |
| 5 | Verify covenant thresholds | Finance/Lender | ? (Optional) |
| 6 | Write CFO commentary | CFO | ? (Optional) |
| 7 | Update prior-year data | Finance | ? (Optional) |
| 8 | Run pipeline script | Automation | ✓ (Required) |
| 9 | Review dashboard | CFO/Board | ✓ (Always) |

Dashboard renders **only what's green (✓)** plus any optional items that have been filled.

---

## For Auditors & Lenders

When asked "where did this number come from?", we can always answer:

- **P&L, B/S, Cash Flow numbers:** "From Sage 300 GL_Clean extract, reconciled to Account_Summary"
- **Revenue vs Budget variance:** "From Budget_Template.xlsx, manually entered by CFO, row [X]"
- **Current Ratio:** "Calculated from GL: Current Assets [value] ÷ Current Liabilities [value]"
- **Covenant compliance:** "Ratio [value] vs Covenant_Template.xlsx threshold [value]"
- **CFO commentary:** "From Commentary_Template.xlsx, signed by CFO, dated [date]"

**No guessing. No assumptions. No placeholder data.**

---

## Templates as Living Documents

Think of these templates not as "forms to fill once" but as **evolving reference documents**:

- **Budget:** Refined each quarter as actuals emerge; updated at year-end
- **Covenants:** Updated when debt facility renews or terms change (annual or bi-annual)
- **Commentary:** Monthly record of CFO insights; historical archive for pattern analysis
- **Prior Year:** Built once at year-start; updated as each month closes

They become the **paper trail** for the dashboard — proof of what was known when.

---

## Exception: Restatements

If GL data changes (e.g., Sage 300 audit adjustment), the pipeline re-runs with new GL_Clean, and all downstream sections auto-update. No manual edits needed.

If template data changes (budget revised, covenant waived), simply update the template file and re-run pipeline. Again, automatic.

The dashboard is always traceable to its source.

---

## Summary

| Principle | Application |
|-----------|------------|
| **Real Data Only** | GL actuals from Sage 300; templates for judgment-based inputs |
| **No Placeholders** | Missing data = hidden dashboard sections, not dummy values |
| **Audit Trail** | Every number traces to a source (GL, template, or formula) |
| **Templates Over Magic** | Explicit human input via structured forms, not heuristics |
| **Graceful Degradation** | Dashboard works with partial data; doesn't fail if something's missing |
| **Honest Gaps** | Missing data is visible to CFO → signals what needs attention |

**Result:** A dashboard that the board and lenders trust, auditors can verify, and the CFO can defend at 2am.

