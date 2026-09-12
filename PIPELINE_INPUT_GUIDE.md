# CIG Motors Finance Dashboard — Pipeline Input Guide

## Overview
The daily dashboard refresh uses **two types of data**:

1. **GL Data (Required Daily)** — Extracted from Sage 300 → GL Cleaner → GL_Clean
2. **Enrichment Data (Optional, As Available)** — Budget, covenants, commentary, prior year

The pipeline never uses placeholder data. If enrichment data isn't available, those dashboard sections simply don't render — no fake numbers.

---

## Data Flow

```
Sage 300 GL Extract
    ↓
[GL_Cleaner Script]
    ↓
GL_Clean.xlsx (7,398 transactions)
    ↓
    ├─→ Join to Statement_Mapping (369 GL codes)
    │        ↓
    │   Financial Statements
    │   (Revenue, COGS, OpEx, Assets, Liabilities, Equity)
    │
    ├─→ Merge Budget_Template.xlsx (if provided)
    │        ↓
    │   Revenue vs Budget Panel
    │   Variance Analysis
    │
    ├─→ Merge Covenant_Template.xlsx (if provided)
    │        ↓
    │   Covenant Compliance Indicators
    │   Red/Green flags
    │
    ├─→ Merge Prior_Period_Template.xlsx (if provided)
    │        ↓
    │   Year-on-Year Comparison
    │   Growth Rates
    │
    └─→ Merge Commentary_Template.xlsx (if provided)
             ↓
        Management Commentary Section
        Sign-off Block
             ↓
        [dashboard_data.json]
             ↓
        Web Dashboard Renders
```

---

## Input Files

### 1. **GL_Clean.xlsx** (From GL Cleaner — Required Daily)
**When:** After Sage 300 close each month, or anytime GL refresh needed
**Source:** `python gl_cleaner.py [Sage_Export.xlsx]`
**Contains:** 
- 7,398+ transaction rows (Jan–Dec 2025)
- 15 columns (GL_Code, Debit, Credit, Doc_Date, Narration, etc.)
- Account_Summary sheet with reconciliation checks

**Pipeline reads:** GL_Clean sheet → SUMIFS by GL_Code → raw period data

---

### 2. **Budget_Template.xlsx** (Optional — Monthly or Once per Year)
**When:** At start of year, or monthly if rolling budget maintained
**Contains:**
- Monthly budget by GL code (40000, 50000, 62000, etc.)
- Columns: GL_Code, Account_Name, Jan–Dec figures
- Blank cells indicate "no budget for this code/month"

**Pipeline reads:** Budget → Joins to GL_Clean by GL_Code and Month → calculates Variance (Actual – Budget), Variance %

**Dashboard renders:** 
- "Revenue vs Budget" panel (Revenue codes 40000, 40200, 24400 only)
- Waterfall chart: Budget → Variance → Actual
- Commentary flag if variance exceeds threshold (e.g., >10%)

**If not provided:** 
- Revenue vs Budget panel hidden
- No budget column in P&L export
- Dashboard works with actuals only

---

### 3. **Covenant_Template.xlsx** (Optional — Fill Once per Year)
**When:** At start of year, or when debt facility/covenant terms change
**Contains:**
- Financial covenants: Current Ratio, Gearing, DSCR, Interest Coverage, ROE
- Credit policy limits: DSO, DPO, DIO, CCC, Customer limits
- Each has Threshold + Policy Band + Notes

**Pipeline reads:** Covenant thresholds → Calculates ratios from GL_Clean → Compares → Flags

**Dashboard renders:**
- Covenant summary card (e.g., "Current Ratio: 1.8 [✓ Target 1.5]")
- Red flag if breached (e.g., "Gearing 1.7 exceeds limit of 1.5")
- Sparkline trend over prior 12 months
- Notes section for covenant variances

**If not provided:**
- Covenant section hidden
- Ratio calculations still shown but without compliance flags
- Dashboard shows trends only, not limits

---

### 4. **Commentary_Template.xlsx** (Optional — Monthly)
**When:** After close, before board meeting / management review
**Contains:**
- Structured narrative sections:
  - Executive Summary
  - Revenue Performance (by segment)
  - Cost Management
  - Working Capital Movement
  - Cash Position
  - Covenant & Ratios
  - Risks & Opportunities
  - Actions Agreed (for next month)
- CFO signature block

**Pipeline reads:** Commentary → Embeds verbatim in dashboard report section

**Dashboard renders:**
- "Management Commentary" tab (full narrative)
- "Things to Watch" summary (first 200 chars of each section)
- Sign-off block with CFO/Board approval

**If not provided:**
- Commentary section hidden
- Dashboard shows only hard numbers (P&L, B/S, Ratios)
- No narrative context

---

### 5. **Prior_Period_Template.xlsx** (Optional — Fill Once, Update Quarterly)
**When:** At year-start (enter full prior-year actuals), then update as months close
**Contains:**
- Prior-year monthly actuals by GL code (same format as Budget_Template)
- Columns: GL_Code, Account_Name, Jan_Prior–Dec_Prior

**Pipeline reads:** Prior → Joins to current GL_Clean by GL_Code and Month → calculates Growth %, Variance

**Dashboard renders:**
- "Revenue by Month" chart: Current vs Prior side-by-side
- "Growth Rate" column in segment analysis
- YoY variance waterfall (if applicable)
- Trend sparklines comparing periods

**If not provided:**
- YoY comparison hidden
- Dashboard shows current period only, month-on-month trends
- No growth rate calculations

---

## File Naming & Organization

Store all files in a **single folder** (e.g., `/Finance/Dashboard_Inputs/`):

```
/Finance/Dashboard_Inputs/
├── GL_Clean.xlsx                    (daily/monthly from GL cleaner)
├── Budget_Template.xlsx             (annual or quarterly)
├── Covenant_Template.xlsx           (annual; update if covenants change)
├── Commentary_Template.xlsx         (monthly; fill after close)
├── Prior_Period_Template.xlsx       (annual; update as periods close)
└── 2025_Dashboard_Config.json       (pipeline manifest — see below)
```

---

## Pipeline Configuration (manifest)

**File:** `2025_Dashboard_Config.json`

```json
{
  "period": "2025-12",
  "gl_file": "GL_Clean.xlsx",
  "gl_sheet": "GL_Clean",
  "statement_mapping": "/path/to/Statement_Mapping.xlsx",
  "inputs": {
    "budget": {
      "file": "Budget_Template.xlsx",
      "sheet": "Budget",
      "available": true
    },
    "covenants": {
      "file": "Covenant_Template.xlsx",
      "sheet": "Covenants",
      "available": true
    },
    "commentary": {
      "file": "Commentary_Template.xlsx",
      "sheet": "Commentary",
      "available": true
    },
    "prior_period": {
      "file": "Prior_Period_Template.xlsx",
      "sheet": "Prior_Period",
      "available": true
    }
  },
  "output": {
    "file": "dashboard_data.json",
    "format": "json",
    "includes": ["statements", "covenants", "commentary", "prior_comparison"]
  }
}
```

Pipeline logic:
- Checks each input file for existence
- Sets `"available": false` if missing
- Skips that section in JSON output
- Proceeds with remaining data (no errors)

---

## Timeline & Responsibilities

### **Month-End Close**
1. Finance team closes GL in Sage 300
2. Export GL to Excel (Sage 300 → Export GL)
3. Run GL Cleaner script: `python gl_cleaner.py [SageExport.xlsx]` → GL_Clean.xlsx
4. Review GL_Clean Account_Summary for reconciliation ✓

### **Day 1–2 After Close**
5. **Budget data:** CFO reviews actual vs budget → enters final budget (if not already on file)
6. **Prior year data:** Finance updates Prior_Period_Template if comparing to prior month

### **Day 2–3 After Close**
7. **Covenants:** Finance calculates key ratios, flags any issues → updates Covenant_Template if thresholds changed
8. **Commentary:** CFO writes narrative → fills Commentary_Template
9. Place all files in `/Finance/Dashboard_Inputs/`

### **Daily Close (End of Day 3)**
10. Pipeline runs automatically:
    - Reads GL_Clean + Statement_Mapping → builds P&L, B/S, CF
    - Merges Budget_Template (if exists) → variance calculations
    - Merges Covenant_Template (if exists) → compliance flags
    - Merges Prior_Period_Template (if exists) → YoY calculations
    - Merges Commentary_Template (if exists) → embeds narrative
    - Outputs `dashboard_data.json`
11. Web app refreshes → new dashboard live

---

## Missing Data — What Happens

| Data Type | If Not Provided | Dashboard Impact |
|-----------|-----------------|------------------|
| Budget | No Budget_Template.xlsx | Revenue vs Budget panel hidden; P&L shows actuals only |
| Covenants | No Covenant_Template.xlsx | Ratios calculated but no compliance flags; no red/green highlights |
| Commentary | No Commentary_Template.xlsx | No narrative; hard numbers only |
| Prior Period | No Prior_Period_Template.xlsx | No YoY comparison; current period trends only |

**No fake data is generated.** Dashboard remains clean and honest.

---

## First Run Checklist

- [ ] GL_Clean.xlsx generated and reconciliation ✓
- [ ] Budget_Template.xlsx downloaded and monthly figures entered
- [ ] Covenant_Template.xlsx downloaded and thresholds entered (fill once)
- [ ] Commentary_Template.xlsx downloaded and narrative sections filled
- [ ] Prior_Period_Template.xlsx downloaded (optional; fill as needed)
- [ ] All files placed in `/Finance/Dashboard_Inputs/`
- [ ] 2025_Dashboard_Config.json created in same folder
- [ ] Pipeline script executed (next section)
- [ ] dashboard_data.json generated ✓
- [ ] Web app renders dashboard ✓

