# CIG Motors Dashboard — Revised Deliverables (Dynamic Commentary)

## Change: Commentary is Auto-Generated, Not Manual

**Removed:** Commentary_Template.xlsx (manual CFO write-up)
**Added:** Dynamic Commentary Generation (automated narrative from GL data)

---

## What You Have Now

### **Required Foundation**
1. ✅ **gl_cleaner.py** — Sage 300 GL cleaning script
2. ✅ **Statement_Mapping.xlsx** — GL code reference (369 codes classified)
3. ✅ **Sample_GL_clean.xlsx** — Example output (reference only)

### **Data Input Templates (Optional, Fill as Available)**
4. ✅ **Budget_Template.xlsx** — Monthly budget by GL code (optional)
5. ✅ **Covenant_Template.xlsx** — Debt covenants & credit policy (optional)
6. ✅ **Prior_Period_Template.xlsx** — Prior-year actuals for YoY (optional)

### **Architecture Documentation**
7. ✅ **PIPELINE_INPUT_GUIDE.md** — How the data flows
8. ✅ **DATA_INTEGRITY_PHILOSOPHY.md** — Why no placeholders
9. ✅ **DYNAMIC_COMMENTARY_ARCHITECTURE.md** — Auto-generated narrative system (NEW)
10. ✅ **NEXT_STEPS.md** — 3-phase roadmap

---

## How Dynamic Commentary Works

**Instead of:**
- CFO fills Commentary_Template.xlsx each month (manual work)
- Commentary divorced from actual GL data (risk of disconnect)
- Narrative delayed until after close (timing issue)

**Now:**
- Pipeline analyzes GL_Clean automatically
- Generates narrative that's **always tied to the numbers**
- Commentary ready instantly when GL_Clean is validated
- CFO can review in 5 minutes and add strategic context if needed

---

## What Gets Generated Automatically

The pipeline generates commentary on 8 sections:

| Section | What Gets Analyzed | Output |
|---------|-------------------|--------|
| **Revenue** | Current, prior, budget, segment split, concentration risk | "Motor Vehicles revenue up 12% to NGN 85.2M..." |
| **Costs** | COGS %, G&A %, depreciation, interest expense trends | "COGS was 80.4% of revenue, up from 78.2%..." |
| **Profitability** | GP%, EBITDA, margins, YoY, vs budget | "Gross profit 20.2%, EBITDA margin 17.7%..." |
| **Working Capital** | DSO, DPO, DIO, CCC trends | "DSO 42 days (up from 38), indicates slower collections..." |
| **Cash Position** | Balance, movements, liquidity ratios | "Cash NGN 28.8M, current ratio 1.8x (strong)..." |
| **Covenant Status** | Ratios vs thresholds, compliance, breaches | "Gearing 1.2x vs limit 1.5x ✓ Compliant..." |
| **Risk Flags** | Anomalies, threshold breaches, concentration | "⚠️ Receivables aging NGN 4.2M over 60 days..." |
| **Things to Watch** | Actionable summary for executive dashboard | "✓ Revenue trending up (maintain momentum)" |

---

## Optional: CFO Annotation

If CFO wants to add **strategic context** (not in GL):
- Market share shifts
- Expected headwinds/tailwinds
- Actions agreed with board
- Qualitative commentary

**File:** CFO_Annotation.xlsx (optional, reviewed before board presentation)

This adds CFO judgment **on top of** auto-generated numbers, not replacing them.

---

## Data Flow (Revised)

```
Sage 300 GL
    ↓
GL_Cleaner
    ↓
GL_Clean.xlsx (7,398 transactions)
    ↓
Statement_Mapping (classify GL codes)
    ↓
[PIPELINE BUILDS:]
├─→ Financial Statements (P&L, B/S, CF)
├─→ Merge Budget (if exists) → Variance Analysis
├─→ Merge Covenant (if exists) → Compliance Flags  
├─→ Merge Prior_Period (if exists) → YoY Growth
└─→ GENERATE COMMENTARY (always)
     ├─→ Revenue analysis
     ├─→ Cost analysis
     ├─→ Profitability
     ├─→ Working capital
     ├─→ Cash position
     ├─→ Covenant status
     ├─→ Risk flags
     └─→ Things to Watch
          ↓
    dashboard_data.json
         ↓
    Dashboard renders with auto-generated narrative
```

---

## Monthly Refresh Workflow (Simplified)

**Day 1 (Month-End)**
- Sage 300 close ✓
- Export GL
- Run: `python gl_cleaner.py [SageExport.xlsx]`
- Review GL_Clean reconciliation ✓

**Day 2–3 (Optional)**
- Enter Budget (if rolling budget maintained)
- Enter Covenants (only if terms changed)
- Add Prior_Period data (quarterly, as periods close)

**Day 4 EOD (Automatic)**
- Run: `python pipeline.py 2025_Dashboard_Config.json`
- Pipeline generates:
  - Financial statements
  - Ratio analysis
  - **Narrative commentary** (auto-generated)
  - Variance analysis (if budget provided)
  - Covenant compliance (if thresholds provided)
  - YoY comparison (if prior data provided)
- Output: `dashboard_data.json`

**Day 5**
- Dashboard live (CFO reviews in 5 minutes)
- If CFO wants to add annotation: fill CFO_Annotation.xlsx, upload to report
- Board/Lender sees dashboard

---

## Benefits of This Approach

✅ **No manual narrative write-up** — Pipeline does it automatically  
✅ **Always accurate** — Commentary generated from GL, not CFO interpretation  
✅ **Always fresh** — Available instantly when GL_Clean is ready  
✅ **Audit-friendly** — Every statement ties directly to GL source  
✅ **Scalable** — Works for unlimited periods/entities automatically  
✅ **CFO-friendly** — Can still add strategic context via annotation (optional)  

---

## Files to Download

All in `/mnt/user-data/outputs/`:

| File | Purpose | Action |
|------|---------|--------|
| `gl_cleaner.py` | GL cleaning script | Use monthly |
| `GL_Cleaner_Guide.html` | Script user guide | Read first time |
| `Statement_Mapping.xlsx` | GL reference | Keep; never change |
| `Budget_Template.xlsx` | Budget entry (optional) | Fill if budget available |
| `Covenant_Template.xlsx` | Covenant entry (optional) | Fill once per year |
| `Prior_Period_Template.xlsx` | Prior year (optional) | Fill annually, update quarterly |
| `PIPELINE_INPUT_GUIDE.md` | Data flow walkthrough | Reference |
| `DATA_INTEGRITY_PHILOSOPHY.md` | Principles | Read for context |
| `DYNAMIC_COMMENTARY_ARCHITECTURE.md` | Auto-narrative design | Read before pipeline build |
| `NEXT_STEPS.md` | Roadmap | Start here |

---

## What Changed

| Item | Before | After |
|------|--------|-------|
| Commentary source | Manual CFO template | Auto-generated from GL |
| Narrative timing | Delayed (after CFO writes) | Instant (with GL_Clean) |
| Commentary accuracy | CFO-dependent | GL-driven |
| Monthly workflow | Burden on CFO | Automated |
| CFO input | Write 8 narrative sections | (Optional) Review + annotate |

---

## Next Phase: Pipeline Build

Once GL_Clean validated (Week 1), we build:

1. **Pipeline script** (Python)
   - Reads GL_Clean + Statement_Mapping
   - Merges optional templates (Budget, Covenant, Prior_Period)
   - **Generates commentary automatically** (NEW)
   - Outputs financial statements + ratios + narrative

2. **Web app** (React/HTML)
   - Renders dashboard with KPIs
   - Narrative tab (auto-generated commentary)
   - Things to Watch (actionable summary)
   - Optional CFO annotation block

3. **Automation** (cron/scheduled task)
   - Daily refresh at end-of-day
   - Dashboard always live with latest GL

---

## Questions Answered

**Q: Who writes the commentary now?**
A: The pipeline. It analyzes GL numbers and generates narrative automatically. CFO reviews in 5 minutes; adds strategic context if needed.

**Q: Will the narrative be generic/template-like?**
A: No. Each section is data-driven: "Revenue up 12% to NGN 85.2M" is specific to your GL. Commentary adapts to actual business performance.

**Q: Can CFO override auto-generated text?**
A: Yes, via optional CFO_Annotation.xlsx, which layers strategic context on top. But default is auto-generated numbers.

**Q: What if budget/covenant/prior data isn't available?**
A: Those sections are skipped (no fake data). Revenue, Cost, Profitability, Working Capital, Cash, Risk Flags still auto-generate from GL.

**Q: How does this work for lenders/auditors?**
A: Perfect. Commentary is 100% tied to GL data; auditors can trace every claim back to GL_Clean. No CFO interpretation = less audit risk.

