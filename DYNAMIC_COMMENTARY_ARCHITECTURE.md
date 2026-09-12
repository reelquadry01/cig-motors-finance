# CIG Motors Dashboard — Dynamic Commentary Generation

## Philosophy Shift: From Manual Template to Automated Insight

Instead of asking the CFO to write narrative each month, the pipeline **analyzes the financial figures and generates commentary automatically**.

```
GL_Clean.xlsx
    ↓
[Statement_Mapping]
    ↓
[Financial Statements Calculated]
    ↓
[Ratio & Variance Analysis]
    ↓
[COMMENTARY GENERATION ENGINE]
    ├─→ Revenue Analysis (current, prior, budget, segment split)
    ├─→ Cost Analysis (COGS trend, G&A efficiency, depreciation)
    ├─→ Profitability (GP%, EBITDA, margins, trends)
    ├─→ Working Capital (receivables, payables, inventory days)
    ├─→ Cash Position (balance, movements, short-term liquidity)
    ├─→ Covenant Status (ratios vs thresholds, breaches flagged)
    ├─→ Risk Flags (anomalies, unusual movements, threshold breaches)
    └─→ Recommendations (what needs attention, what's working)
         ↓
    [dashboard_data.json]
         ↓
    Dashboard Narrative Tab (auto-populated)
```

---

## What Gets Generated Automatically

### **1. Revenue Commentary**
**Data inputs:**
- Current month revenue (by segment: Vehicles vs Spare Parts & After-Sales)
- Prior month/year revenue (if Prior_Period_Template provided)
- Budget revenue (if Budget_Template provided)
- Transaction count and average invoice size

**Generated narrative examples:**
- "Motor Vehicles revenue increased 12% month-on-month to NGN 85.2M, driven by GAC model sales (7 units) vs 6 units prior month. Spare Parts revenue flat at NGN 12.8M."
- "YoY comparison: Revenue up 18% vs 2024; primarily Spare Parts segment (+22%) while Motor Vehicles up 15%."
- "Actual revenue NGN 85.2M vs budget NGN 90M (variance: -5.3%, within tolerance)."
- "Revenue per transaction increased to NGN 2.4M (was 2.1M prior month), indicating higher-value sales mix."

**Flags triggered if:**
- Revenue down >10% vs prior month (red flag)
- Revenue variance >15% vs budget (amber flag)
- Revenue growing but transaction count declining (margin squeeze risk)
- Single customer >25% of revenue (concentration risk)

---

### **2. Cost Analysis Commentary**
**Data inputs:**
- COGS (absolute, % of revenue, trend)
- G&A expenses (absolute, as % of revenue, vs budget)
- Depreciation (fixed vs variable portion)
- Interest expense (vs covenant threshold if applicable)

**Generated narrative examples:**
- "COGS was NGN 68.5M (80.4% of revenue), up from 78.2% prior month. Gross profit margin declined to 19.6%. Primary driver: Motor Vehicles COGS-to-Revenue ratio increased (81% vs 79% prior), likely due to supply chain cost pressures on spare parts procurement."
- "G&A expenses were NGN 15.2M (17.8% of revenue), down from 19.2% prior month. Efficiency improved; staff costs stable, office & miscellaneous expenses reduced by NGN 1.4M."
- "Depreciation NGN 2.1M (unchanged), consistent with historical level. Annual depreciation budget tracking to plan."

**Flags triggered if:**
- COGS > 85% of revenue (profitability squeeze)
- G&A > 25% of revenue (overhead high)
- Interest expense trending up >5% (cost of debt rising)
- Depreciation spike (new asset capitalization detected)

---

### **3. Profitability Summary**
**Data inputs:**
- Revenue, COGS, Gross Profit → GP margin %
- Operating Expenses → EBITDA, EBITDA margin %
- Depreciation & Finance Costs → EBIT, PBT, PAT
- Comparison to prior period and budget

**Generated narrative examples:**
- "Gross profit NGN 17.2M, margin 20.2% (prior month 21.8%). EBITDA NGN 15.1M, margin 17.7%. Profit before tax NGN 12.8M after depreciation (2.1M) and interest (0.2M). Net profit NGN 11.2M (13.1% net margin)."
- "YoY: EBITDA up 14% despite flat revenue (margin expansion from cost control). Net profit up 22% YoY."
- "vs Budget: PBT variance +3% (profit ahead of forecast; primarily from COGS efficiency)."

**Flags triggered if:**
- Net margin < 5% (below policy)
- EBITDA declining while revenue stable (margin compression)
- Profit before tax negative (loss-making period)

---

### **4. Working Capital Analysis**
**Data inputs:**
- Receivables (absolute, days outstanding = DSO)
- Payables (absolute, days outstanding = DPO)
- Inventory (absolute, days outstanding = DIO)
- Cash Conversion Cycle (CCC = DSO + DIO - DPO)
- Prior period and policy limits

**Generated narrative examples:**
- "Days Sales Outstanding (DSO): 42 days, up from 38 days prior month. Indicates slower customer collections (N3.2M aged >45 days). Monitor for credit issues."
- "Days Payable Outstanding (DPO): 35 days, within policy target (30 days). Supplier payment terms normal."
- "Inventory: 52 days (down from 58 days), indicating faster turnover. Motor Vehicles stock NGN 78M (5 units), Spare Parts NGN 34M."
- "Cash Conversion Cycle: 59 days (operating cycle), up from 54 days prior month. Driven by slower receivables collection."

**Flags triggered if:**
- DSO > 60 days (credit collection issue)
- DIO > 90 days (slow-moving inventory)
- CCC > 90 days (working capital strain)
- DPO < 20 days (possible supplier pressure)

---

### **5. Cash Position & Liquidity**
**Data inputs:**
- Cash balance (NGN + USD accounts separated)
- Month-end position vs month-start
- Operating cash inflow (from receivables)
- Outflows (payables, capex, loan repayments)
- Current ratio, quick ratio vs policy

**Generated narrative examples:**
- "Cash position: NGN 24.8M + USD 2.4M (equiv. NGN 4.0M = NGN 28.8M total). Down NGN 3.2M from month-start (payables payments exceeded receivables collections)."
- "Current ratio: 1.8x (well above 1.5 policy minimum). Quick ratio: 1.2x. Liquidity position strong."
- "Cash runway: At current burn rate (NGN 3M/month), adequate to cover 9+ months of operations without new financing."

**Flags triggered if:**
- Cash < 30 days of operating expenses (liquidity risk)
- Current ratio < 1.2x (near policy breach)
- Sudden cash drop > 20% (investigate cause)

---

### **6. Covenant & Ratio Status**
**Data inputs:**
- Calculated ratios (Current Ratio, Gearing, DSCR, Interest Coverage, ROE, Profit Margin)
- Covenant thresholds (if Covenant_Template provided)
- Prior period ratios (trend)

**Generated narrative examples:**
- "Gearing (Debt/Equity): 1.2x vs covenant limit of 1.5x. Compliant. Trend: improving (was 1.3x prior month)."
- "Interest Coverage: 4.2x vs policy minimum of 2.5x. Strong; company can cover interest expense 4.2x over."
- "Return on Equity: 18% (annualized from current month). Above 10% policy target."
- "⚠️ Current Ratio warning: 1.5x approaching lower limit of 1.4x. Monitor liquidity next month."

**Flags triggered if:**
- Covenant breached (red flag, immediate notification)
- Covenant within 5% of breach (amber flag, watch)
- Multiple ratios declining (systemic issue)

---

### **7. Risk Flags & Anomalies**
**Data inputs:**
- All above data inputs
- Historical patterns
- Threshold deviations

**Generated automatically if detected:**
- "⚠️ Revenue declining 3 months in a row → investigate market conditions"
- "⚠️ COGS spiked 8% this month → check supplier invoices for price increases"
- "⚠️ Single customer (Customer XYZ) now 28% of revenue → concentration risk"
- "⚠️ Receivables aging: NGN 4.2M (18% of total) over 60 days → collection effort needed"
- "⚠️ Inventory NGN 112M (+15% vs prior month) → possible overstock of slow-moving vehicles"
- "⚠️ Payables payment cycle extended to 45 days → may signal cash flow pressure"

---

### **8. Things to Watch (Actionable Summary)**
**Generated as bullet-point summary for executive dashboard:**
- ✓ Revenue trending up (maintain momentum)
- ✓ Profitability margins stable (cost control working)
- ⚠️ Receivables collection slower (follow up with 3 overdue customers)
- ⚠️ Inventory builds (consider promotional activity to clear stock)
- ✓ Cash position adequate (no immediate financing needed)
- → Recommend: Review supplier contracts for cost inflation

---

## Commentary Generation Rules

### **For each narrative section:**

1. **Calculate the metric** (Revenue, COGS%, DSO, Current Ratio, etc.)
2. **Compare to context:**
   - Prior month (trend direction)
   - Prior year (growth %)
   - Budget (variance)
   - Policy limit (compliant? close? breached?)
3. **Describe the finding:** "X is Y%, up Z% vs prior, variance A% from budget"
4. **Explain the driver:** "Due to [reason]" (inferred from GL detail)
5. **Flag if significant:** Red/amber/green based on thresholds
6. **Recommend action:** If flag, suggest what to investigate

### **Tone:**
- Professional, factual, no editorializing
- Numbers-driven (show the math)
- Action-oriented (flag issues + suggest next steps)
- CFO-ready (suitable for board/lender communication)

---

## Implementation (Pipeline Component)

**File:** `generate_commentary.py` (part of pipeline)

**Input:**
- GL_Clean.xlsx (transactions)
- Statement_Mapping.xlsx (classifications)
- Budget_Template.xlsx (if provided)
- Covenant_Template.xlsx (if provided)
- Prior_Period_Template.xlsx (if provided)

**Output:**
```json
{
  "commentary": {
    "revenue": {
      "narrative": "Motor Vehicles revenue increased...",
      "current_month": 85200000,
      "prior_month": 76100000,
      "growth_pct": 12.0,
      "flags": []
    },
    "costs": {
      "narrative": "COGS was NGN 68.5M...",
      "cogs_pct_revenue": 80.4,
      "ga_pct_revenue": 17.8,
      "flags": ["margin_squeeze"]
    },
    "profitability": {
      "narrative": "Gross profit NGN 17.2M...",
      "gp_margin": 20.2,
      "ebitda_margin": 17.7,
      "net_margin": 13.1,
      "flags": []
    },
    "working_capital": {
      "narrative": "DSO 42 days, up from 38...",
      "dso": 42,
      "dpo": 35,
      "dio": 52,
      "ccc": 59,
      "flags": ["receivables_slow"]
    },
    "cash": {
      "narrative": "Cash position NGN 28.8M...",
      "cash_total": 28800000,
      "current_ratio": 1.8,
      "flags": []
    },
    "covenants": {
      "narrative": "Gearing 1.2x vs limit 1.5x...",
      "gearing": 1.2,
      "gearing_limit": 1.5,
      "interest_coverage": 4.2,
      "flags": ["current_ratio_watch"]
    },
    "risks": {
      "flags": ["receivables_aging", "inventory_buildup"],
      "narrative": "⚠️ Single customer concentration at 28%..."
    },
    "things_to_watch": [
      "✓ Revenue trending up",
      "⚠️ Receivables collection slower",
      "→ Recommend: Review supplier contracts"
    ]
  },
  "generated_at": "2025-12-31T23:59:59Z",
  "period": "2025-12"
}
```

---

## Dashboard Rendering

**Narrative Tab:** Full commentary sections + Things to Watch summary + Risk flags

**Dashboard Tab (KPI cards):**
- Revenue: NGN 85.2M ↑ 12% (vs prior) ↓ -5% (vs budget)
- Gross Profit: 20.2% (Policy: >20%) ✓
- DSO: 42 days (Policy: <45) ✓
- Gearing: 1.2x (Limit: <1.5) ✓
- Cash: NGN 28.8M ✓

**Things to Watch (sidebar):**
- ✓ Revenue trending up (maintain momentum)
- ⚠️ Receivables collection slower (follow up with 3 overdue customers)
- ⚠️ Inventory builds (consider promotional activity)
- → Recommend: Review supplier contracts

---

## CFO Review & Annotation (Optional)

If CFO wants to add context or override auto-generated commentary:

**Annotation Template** (optional, post-generation):
```json
{
  "period": "2025-12",
  "cffo_notes": {
    "revenue": "Market conditions improved due to Q4 promotional activity; expect normalization in Q1",
    "risks": "Customer XYZ concentration risk known to Board; mitigation plan in progress",
    "actions_agreed": "Approve capex for new service center; renegotiate supplier contracts by Jan 31"
  },
  "cffo_signature": "John Doe, CFO",
  "date": "2025-12-31",
  "board_approval": "Approved by Board Finance Committee, 2025-12-31"
}
```

This optional annotation layer adds CFO judgment/context without replacing auto-generated numbers.

---

## Benefits of Dynamic Commentary

| Aspect | Manual Template | Dynamic Generation |
|--------|-----------------|-------------------|
| **Consistency** | Varies by CFO mood | Always structured, same format |
| **Timeliness** | Delayed (CFO writes after close) | Instant (generated with GL_Clean) |
| **Accuracy** | Risk of typos, misstatement | Data-driven, verifiable |
| **Frequency** | Monthly burden | Automatic every refresh |
| **Audit trail** | Commentary divorced from numbers | Narrative tied directly to GL |
| **Lender confidence** | CFO's interpretation | Numbers speak for themselves |
| **Scalability** | One CFO per dashboard | Works for unlimited dashboards |

---

## Exception: Strategic Narrative

For **strategic insights** (not reflected in GL), CFO can still add annotations:
- "Market share gained from competitor ABC due to pricing strategy"
- "Expected headcount increase Q1 (hires in progress, impact next month)"
- "Supply chain normalization underway; margins to improve by Q2"

These go in **CFO_Annotation.xlsx** (optional, reviewed before board presentation), not in auto-generated narrative.

---

## Result

The dashboard narrative is **always fresh, always accurate, always tied to the numbers**. CFO reviews in 5 minutes, adds strategic context if needed, signs off. No manual write-up required.

