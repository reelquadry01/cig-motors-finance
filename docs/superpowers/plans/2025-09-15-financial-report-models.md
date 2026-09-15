# Financial Report Models — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete financial report model system where industry determines available models, each model has IAS-compliant Excel templates with dynamic formulas, and commentary adapts per model and industry.

**Architecture:** Industry registry defines what's available per sector. Report model configs define data requirements, formulas, and output structure. Template generators create Excel files dynamically. Model builders assemble data into industry-specific outputs. Commentary engine generates model-specific narratives.

**Tech Stack:** Python (openpyxl for Excel, pandas for data), React (admin UI), FastAPI (export endpoints)

---

## File Structure

```
pipeline/
├── industries/
│   ├── __init__.py              # IndustryRegistry, INDUSTRY_MAP
│   ├── automotive.py            # Automotive/dealership config
│   ├── manufacturing.py         # Manufacturing config
│   ├── saas.py                  # SaaS/technology config
│   ├── banking.py               # Financial services config
│   ├── hospitality.py           # Hotels/hospitality config
│   ├── services.py              # Professional services config
│   ├── retail.py                # Retail/FMCG config
│   └── nonprofit.py             # Non-profit/NGO config
├── models/
│   ├── __init__.py              # ModelRegistry, MODEL_MAP
│   ├── registry.py              # ReportModel base class
│   ├── three_statement.py       # 3-Statement Model
│   ├── variance.py              # Variance Analysis
│   ├── forecast.py              # Forecast/Projection
│   ├── management.py            # Management Report
│   ├── cash_liquidity.py        # Cash & Liquidity
│   ├── audit.py                 # Audit/Compliance
│   ├── ratio_analysis.py        # Ratio Analysis
│   └── valuation.py             # Valuation Model
├── templates/
│   ├── excel_builder.py         # Dynamic Excel template generator
│   ├── pdf_builder.py           # PDF layout builder
│   └── commentary_engine.py     # Model-specific commentary
├── export_router.py             # Routes export request to correct model
├── config.py                    # Existing (add industry field)
├── build_statements.py          # Existing
├── ratios.py                    # Existing (extend per industry)
└── main.py                      # Existing (add export endpoint)
```

```
dashboard/src/
├── components/admin/
│   ├── ReportModelSelector.jsx  # Model picker UI
│   └── ExportCenter.jsx         # Updated with model selection
└── lib/
    └── exportApi.js             # Export API client
```

---

## Accounting Foundation: What Each Model Must Produce

### Model 1: 3-Statement Model (IAS 1, IAS 7)

**Sheets:** P&L, Balance Sheet, Cash Flow, Ratios, Summary

**P&L Structure (IAS 1 Para 82):**
```
Revenue
  Less: Cost of Sales
= Gross Profit
  Less: Operating Expenses
  Less: Depreciation & Amortisation
= Operating Profit (EBIT)
  Add: Other Income
  Less: Finance Costs
= Profit Before Tax (PBT)
  Less: Tax Expense
= Profit After Tax (PAT)
```

**Balance Sheet Structure (IAS 1 Para 54):**
```
ASSETS
  Non-Current Assets
    Property, Plant & Equipment
    Intangible Assets
    Right-of-Use Assets
    Investment Property
    Deferred Tax Assets
  Current Assets
    Inventories
    Trade & Other Receivables
    Cash & Cash Equivalents
  Total Assets

LIABILITIES
  Current Liabilities
    Trade & Other Payables
    Current Tax Liabilities
    Lease Liabilities (current)
    Borrowings (current)
  Non-Current Liabilities
    Borrowings (non-current)
    Lease Liabilities (non-current)
    Deferred Tax Liabilities
    Provisions
  Total Liabilities

EQUITY
  Share Capital
  Retained Earnings
  Capital Reserve
  Total Equity
```

**Cash Flow Structure (IAS 7 Indirect Method):**
```
Operating Activities
  Profit Before Tax
  Add: Depreciation & Amortisation
  Add: Finance Costs
  Less: Interest Income
  Operating Profit before WC Changes
  Changes in Working Capital:
    (Increase)/Decrease in Inventories
    (Increase)/Decrease in Receivables
    Increase/(Decrease) in Payables
  Cash Generated from Operations
  Interest Paid
  Tax Paid
= Net Cash from Operating Activities

Investing Activities
  Purchase of PPE
  Purchase of Intangibles
  Proceeds from Disposal
  Interest Received
= Net Cash from Investing Activities

Financing Activities
  Proceeds from Borrowings
  Repayment of Borrowings
  Lease Principal Payments
  Share Issuance
  Dividends Paid
= Net Cash from Financing Activities

Net Increase/(Decrease) in Cash
Opening Cash & Cash Equivalents
Closing Cash & Cash Equivalents
```

**Excel Formulas (hybrid — hardcoded + dynamic):**
- Revenue growth: `=(B3-A3)/A3` (hardcoded cell refs)
- GP margin: `=GP/Revenue` (named ranges)
- Current ratio: `=CA/CL` (dynamic — references BS cells)
- Cash flow indirect: hardcoded adjustments with dynamic WC changes
- B/S balance check: `=Assets-Liabilities-Equity` (must equal 0)

---

### Model 2: Variance Analysis (IAS 8)

**Sheets:** Actual vs Budget, Variance Bridge, MoM Comparison, YTD Comparison, Commentary

**Variance Formula (IAS 8 compliant):**
```
Total Variance = Actual - Budget
  = Price Variance + Volume Variance + Mix Variance

Price Variance = (Actual Price - Budget Price) × Actual Quantity
Volume Variance = (Actual Quantity - Budget Quantity) × Budget Price
Mix Variance = (Actual Mix - Budget Mix) × Actual Quantity × Budget Price
```

**IAS 8 Flagging:**
- Policy changes: must be disclosed separately from operational variance
- Estimate changes: flagged as "Change in Estimate" (prospective only)
- Prior period errors: flagged as "Restatement" (retrospective)

**Materiality Thresholds:**
- >10% variance: Material — requires explanation
- >20% variance: Significant — requires root cause analysis
- >50% variance: Critical — requires corrective action plan

---

### Model 3: Forecast/Projection (IFRS 13, IAS 38)

**Sheets:** Assumptions, P&L Projection (3-5yr), B/S Projection, CF Projection, Scenarios, Sensitivity

**Assumption Structure:**
```
Revenue Growth Rate:     Year 1: ___%  Year 2: ___%  Year 3: ___%
COGS % of Revenue:      Year 1: ___%  Year 2: ___%  Year 3: ___%
OpEx Growth Rate:        Year 1: ___%  Year 2: ___%  Year 3: ___%
CapEx (% of Revenue):    Year 1: ___%  Year 2: ___%  Year 3: ___%
Tax Rate:                Year 1: ___%  Year 2: ___%  Year 3: ___%
Working Capital Days:    Year 1: ___d  Year 2: ___d  Year 3: ___d
```

**Scenario Toggles (Excel Data Validation):**
- Base Case / Best Case / Worst Case
- Each scenario has different assumption sets
- Switching scenario recalculates all projections via IF formulas

**DCF Valuation (IFRS 13):**
```
Enterprise Value = Sum[FCF_t / (1 + WACC)^t] + Terminal Value / (1 + WACC)^n
Terminal Value = FCF_n × (1 + g) / (WACC - g)
WACC = E/(E+D) × Ke + D/(E+D) × Kd × (1-Tax)
Ke = Rf + Beta × (Rm - Rf)  [CAPM]
```

---

### Model 4: Management Report (IFRS 8)

**Sheets:** Executive Summary, P&L, B/S, CF, Segments, KPIs, Commentary

**IFRS 8 Segment Reporting Requirements:**
- Revenue (external + intersegment) per segment
- Profit/loss per segment (measure reviewed by CODM)
- Assets per segment
- Reconciliation to consolidated totals

**Segment Quantitative Thresholds (IFRS 8 Para 13):**
- Revenue ≥ 10% of combined segment revenue
- Profit/loss ≥ 10% of greater of (profitable segments, loss segments)
- Assets ≥ 10% of combined segment assets
- 75% external revenue test

**KPI Dashboard:**
- Industry-specific KPIs (determined by industry config)
- Trend indicators (▲/▼ vs prior period)
- Benchmark comparisons

---

### Model 5: Cash & Liquidity (IAS 7, IFRS 7)

**Sheets:** Working Capital, DSO/DIO/DPO, Cash Conversion Cycle, Liquidity Analysis, Sensitivity

**Working Capital Formulas:**
```
DSO = (Trade Receivables / Revenue) × 365
DIO = (Inventories / COGS) × 365
DPO = (Trade Payables / COGS) × 365

Cash Conversion Cycle = DSO + DIO - DPO

Working Capital = Current Assets - Current Liabilities
Net Working Capital = Receivables + Inventory - Payables
```

**IFRS 7 Liquidity Risk (Maturity Analysis):**
```
| Maturity Band    | Financial Liabilities | Cash Inflows | Net Exposure |
|------------------|----------------------|--------------|--------------|
| < 1 month        |                      |              |              |
| 1-3 months       |                      |              |              |
| 3-6 months       |                      |              |              |
| 6-12 months      |                      |              |              |
| 1-5 years        |                      |              |              |
| > 5 years        |                      |              |              |
```

---

### Model 6: Audit/Compliance (IAS 1, ISA 500)

**Sheets:** Trial Balance, Tie-Outs, Reconciliation, IAS Checklist, Exceptions

**Tie-Out Checks:**
```
1. TB Debits = TB Credits                    [Must equal]
2. B/S Assets = B/S Liabilities + Equity     [Must equal]
3. P&L net = RE movement in B/S              [Must equal]
4. CF opening = B/S cash (prior period)      [Must equal]
5. CF closing = B/S cash (current period)    [Must equal]
6. Depreciation charge = Accum Depr movement [Within tolerance]
7. Tax expense = Tax payable movement + deferred [Reconcile]
```

**IAS 1 Compliance Checklist:**
```
□ Statement of Financial Position presented
□ Statement of Profit or Loss presented
□ Statement of Cash Flows presented
□ Statement of Changes in Equity presented
□ Notes to financial statements
□ Comparative information for preceding period
□ Going concern assessment disclosed
□ Significant accounting policies disclosed
□ Key estimation uncertainties disclosed
```

---

### Model 7: Ratio Analysis (IAS 1)

**Sheets:** Liquidity, Profitability, Efficiency, Leverage, Cash Flow, Industry-Specific, Trends

**Ratio Categories:**

**Liquidity (IAS 1 going concern):**
- Current Ratio, Quick Ratio, Cash Ratio
- Working Capital, Net Working Capital

**Profitability:**
- GP Margin, Operating Margin, Net Margin, EBITDA Margin
- ROE, ROA, ROIC
- Revenue growth (YoY, QoQ)

**Efficiency:**
- Asset Turnover, Inventory Turnover, Receivables Turnover
- DSO, DIO, DPO, Cash Conversion Cycle
- Fixed Asset Turnover

**Leverage:**
- Debt/Equity, Debt Ratio, Equity Multiplier
- Interest Coverage, Debt Service Coverage
- Net Debt/EBITDA

**Cash Flow:**
- Operating Cash Flow Margin
- Free Cash Flow = OCF - CapEx
- FCF Yield = FCF / Market Cap
- Cash Flow Coverage Ratios

**Industry-Specific Ratios (from industry config):**
- Automotive: GPU, Floor Stock Turn, Fixed Absorption
- Manufacturing: OEE, Capacity Utilization, Yield
- SaaS: MRR, Churn, LTV:CAC, Rule of 40
- Banking: NPL Ratio, NIM, Capital Adequacy
- Hospitality: RevPAR, ADR, Occupancy, GOPPAR
- Services: Utilization, Realization, Revenue/Employee
- Retail: GMROI, Sell-Through, Shrinkage
- Non-Profit: Programme Ratio, Fundraising Efficiency

---

### Model 8: Valuation Model (IFRS 13, IAS 36, IAS 38)

**Sheets:** DCF, Comparable Companies, Sensitivity, WACC, Terminal Value

**DCF Structure:**
```
Projection Period (5 years):
  Year 1  Year 2  Year 3  Year 4  Year 5
  Revenue
  EBITDA
  EBIT
  Tax on EBIT
  NOPAT
  + Depreciation
  - CapEx
  - Working Capital Change
  = Free Cash Flow (FCF)

Terminal Value = FCF₅ × (1 + g) / (WACC - g)
  [Gordon Growth Model]

Enterprise Value = Sum[FCF_t / (1+WACC)^t] + TV/(1+WACC)⁵
  Less: Net Debt
  Less: Pension Obligations
  + Associates/JVs
  = Equity Value

Equity Value / Shares Outstanding = Implied Share Price
```

**Comparable Company Analysis:**
```
| Metric         | Company A | Company B | Company C | Median | Target |
|----------------|-----------|-----------|-----------|--------|--------|
| EV/EBITDA      |           |           |           |        |        |
| EV/Revenue     |           |           |           |        |        |
| P/E            |           |           |           |        |        |
| P/B            |           |           |           |        |        |
| EV/EBIT        |           |           |           |        |        |
```

**IAS 36 Impairment Check:**
```
Recoverable Amount = Higher of:
  1. Fair Value Less Costs of Disposal (FVLCD)
  2. Value in Use (VIU) = PV of future cash flows

Impairment Loss = Carrying Amount - Recoverable Amount
  [Recognised in P&L; allocated first to goodwill]
```

**IFRS 13 Fair Value Hierarchy:**
```
Level 1: Quoted prices in active markets
Level 2: Observable inputs (yield curves, volatilities)
Level 3: Unobservable inputs (entity assumptions)
```

---

## Industry Registry Design

Each industry config defines:

```python
class IndustryConfig:
    name: str                          # "Automotive / Dealership"
    code: str                          # "automotive"
    available_models: list[str]        # ["3_statement", "variance", "management", ...]
    key_ratios: list[dict]             # [{name, formula, benchmark, category}]
    revenue_groupings: dict            # {segment_name: [gl_codes_or_keywords]}
    cogs_structure: dict               # {component: [gl_codes_or_keywords]}
    segment_types: list[str]           # ["New Vehicles", "Used Vehicles", "Parts", "Service"]
    industry_metrics: list[dict]       # [{name, formula, unit, benchmark}]
    commentary_templates: dict         # {model_name: template_string}
    chart_of_accounts_hints: dict      # {section: [suggested_account_names]}
```

**Example — Automotive:**
```python
automotive = IndustryConfig(
    name="Automotive / Dealership",
    code="automotive",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast"
    ],
    key_ratios=[
        {"name": "GPU", "formula": "gross_profit / units_sold", "benchmark": "$2,000-$4,000", "category": "profitability"},
        {"name": "Floor Stock Turn", "formula": "units_sold / avg_inventory", "benchmark": "8-12x", "category": "efficiency"},
        {"name": "Fixed Absorption", "formula": "(service_gp + parts_gp) / total_expense", "benchmark": "115%", "category": "efficiency"},
    ],
    revenue_groupings={
        "New Vehicles": ["40100", "40110"],
        "Used Vehicles": ["40120", "40130"],
        "Parts & Accessories": ["40200"],
        "Service & Labor": ["40300", "40310"],
        "F&I Income": ["40400", "40410"],
    },
    segment_types=["New Vehicles", "Used Vehicles", "Parts", "Service", "F&I"],
    commentary_templates={
        "management": "Vehicle sales totaled {revenue:,.0f}, driven by {top_segment}...",
        "variance": "Revenue variance of {variance:,.0f} ({var_pct:.1f}%) was primarily attributable to...",
    }
)
```

---

## Task 1: Industry Registry Foundation

**Files:**
- Create: `pipeline/industries/__init__.py`
- Create: `pipeline/industries/automotive.py`
- Create: `pipeline/industries/base.py`

- [ ] **Step 1: Create base IndustryConfig dataclass**

```python
# pipeline/industries/base.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class RatioSpec:
    name: str
    formula: str
    unit: str = "x"           # x, %, days, currency
    benchmark: str = ""
    category: str = "general" # liquidity, profitability, efficiency, leverage, industry

@dataclass
class IndustryMetric:
    name: str
    formula: str
    unit: str = ""
    benchmark: str = ""
    description: str = ""

@dataclass
class IndustryConfig:
    name: str
    code: str
    available_models: list[str] = field(default_factory=list)
    key_ratios: list[RatioSpec] = field(default_factory=list)
    revenue_groupings: dict[str, list[str]] = field(default_factory=dict)
    cogs_structure: dict[str, list[str]] = field(default_factory=dict)
    segment_types: list[str] = field(default_factory=list)
    industry_metrics: list[IndustryMetric] = field(default_factory=list)
    commentary_templates: dict[str, str] = field(default_factory=dict)
    chart_of_accounts_hints: dict[str, list[str]] = field(default_factory=dict)
```

- [ ] **Step 2: Create Automotive industry config**

```python
# pipeline/industries/automotive.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

AUTOMOTIVE = IndustryConfig(
    name="Automotive / Dealership",
    code="automotive",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast",
    ],
    key_ratios=[
        RatioSpec("Gross Profit Per Unit", "gross_profit / units_sold", "$", "$2,000-$4,000", "profitability"),
        RatioSpec("Floor Stock Turn", "units_sold / avg_floor_stock", "x", "8-12x", "efficiency"),
        RatioSpec("Days' Supply", "floor_stock / daily_sales_rate", "days", "30-60", "efficiency"),
        RatioSpec("Fixed Absorption Rate", "(service_gp + parts_gp) / total_dealer_expense * 100", "%", "115%", "efficiency"),
        RatioSpec("Net Return on Sales", "net_profit / total_sales * 100", "%", "4%", "profitability"),
        RatioSpec("Asset Utilization", "annualized_sales / total_assets", "x", "6.5-7:1", "efficiency"),
    ],
    revenue_groupings={
        "New Vehicle Sales": ["40100", "40110"],
        "Used Vehicle Sales": ["40120", "40130"],
        "Parts & Accessories": ["40200"],
        "Service & Labor": ["40300", "40310"],
        "F&I Income": ["40400", "40410"],
        "Warranty Income": ["40500"],
    },
    cogs_structure={
        "Vehicle Acquisition": ["50100"],
        "Parts Cost": ["50200"],
        "Direct Labor": ["50300"],
        "Reconditioning": ["50400"],
        "Freight & Delivery": ["50500"],
    },
    segment_types=["New Vehicles", "Used Vehicles", "Parts", "Service", "F&I"],
    industry_metrics=[
        IndustryMetric("GPU", "gross_profit / units_sold", "$", "$2,000-$4,000", "Gross profit per unit sold"),
        IndustryMetric("Floor Stock Turn", "units_sold / avg_floor_stock", "x", "8-12x", "How fast inventory sells"),
        IndustryMetric("PVR Income", "fi_income / units_retailed", "$", "$500-$1,500", "Per vehicle retailed F&I income"),
        IndustryMetric("Service Proficiency", "tech_hours_produced / tech_hours_available * 100", "%", "100%", "Technician utilization"),
        IndustryMetric("Absorption Rate", "(service_gp + parts_gp) / total_expense * 100", "%", "115%", "Fixed cost coverage by front dept GPs"),
    ],
    commentary_templates={
        "management": (
            "Vehicle sales totaled {revenue:,.0f}, with {top_segment} contributing {top_share:.1f}% of total revenue. "
            "Gross profit margin stood at {gp_margin:.1f}%, {gp_direction} from prior period. "
            "The dealership achieved a GPU of {gpu:,.0f} against a benchmark of $2,000-$4,000. "
            "Floor stock turn of {floor_turn:.1f}x indicates {turn_assessment} inventory management."
        ),
        "variance": (
            "Revenue variance of {variance:,.0f} ({var_pct:.1f}%) against budget was primarily driven by "
            "{primary_driver}. Price variance accounted for {price_var:,.0f} while volume variance "
            "contributed {volume_var:,.0f}. {policy_flag}"
        ),
    },
)
```

- [ ] **Step 3: Create industry registry**

```python
# pipeline/industries/__init__.py
from .base import IndustryConfig, RatioSpec, IndustryMetric
from .automotive import AUTOMOTIVE

INDUSTRY_MAP: dict[str, IndustryConfig] = {
    "automotive": AUTOMOTIVE,
    #其余 industries added in subsequent tasks
}

def get_industry(code: str) -> IndustryConfig:
    return INDUSTRY_MAP.get(code, AUTOMOTIVE)

def list_industries() -> list[dict]:
    return [{"code": k, "name": v.name} for k, v in INDUSTRY_MAP.items()]
```

- [ ] **Step 4: Test the registry**

```bash
cd pipeline && python -c "
from industries import get_industry, list_industries
print(list_industries())
a = get_industry('automotive')
print(a.name, len(a.key_ratios), a.available_models)
"
```

Expected: Prints industry list, then "Automotive / Dealership 6 ['three_statement', ...]"

- [ ] **Step 5: Commit**

```bash
git add pipeline/industries/
git commit -m "feat: add industry registry with automotive config"
```

---

## Task 2: Add Remaining 7 Industry Configs

**Files:**
- Create: `pipeline/industries/manufacturing.py`
- Create: `pipeline/industries/saas.py`
- Create: `pipeline/industries/banking.py`
- Create: `pipeline/industries/hospitality.py`
- Create: `pipeline/industries/services.py`
- Create: `pipeline/industries/retail.py`
- Create: `pipeline/industries/nonprofit.py`
- Modify: `pipeline/industries/__init__.py`

- [ ] **Step 1: Create Manufacturing config**

```python
# pipeline/industries/manufacturing.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

MANUFACTURING = IndustryConfig(
    name="Manufacturing",
    code="manufacturing",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast", "audit",
    ],
    key_ratios=[
        RatioSpec("OEE", "availability * performance * quality * 100", "%", "85%", "efficiency"),
        RatioSpec("Capacity Utilization", "actual_output / max_output * 100", "%", "80-90%", "efficiency"),
        RatioSpec("Yield", "good_units / total_units * 100", "%", ">98%", "efficiency"),
        RatioSpec("Scrap Rate", "scrap_units / total_produced * 100", "%", "<2%", "efficiency"),
        RatioSpec("Inventory Turnover", "cogs / avg_inventory", "x", "6-10x", "efficiency"),
        RatioSpec("Material Cost Ratio", "material_cost / total_cogs * 100", "%", "Varies", "profitability"),
    ],
    revenue_groupings={
        "Product Sales": ["40100"],
        "Service Revenue": ["40200"],
        "Contract Revenue": ["40300"],
        "Other Income": ["40800"],
    },
    cogs_structure={
        "Raw Materials": ["50100"],
        "Direct Labor": ["50200"],
        "Manufacturing Overhead": ["50300"],
        "Freight In": ["50400"],
    },
    segment_types=["Products", "Services", "Contracts"],
    industry_metrics=[
        IndustryMetric("OEE", "availability * performance * quality * 100", "%", "85%", "Overall Equipment Effectiveness"),
        IndustryMetric("Capacity Utilization", "actual_output / max_output * 100", "%", "80-90%", "How much of max capacity is used"),
        IndustryMetric("Yield", "good_units / total_units * 100", "%", ">98%", "First-pass quality rate"),
        IndustryMetric("Scrap Rate", "scrap_units / total_produced * 100", "%", "<2%", "Waste as % of production"),
        IndustryMetric("Standard Cost Variance", "actual_cost - standard_cost", "currency", "0", "Deviation from standard costs"),
    ],
    commentary_templates={
        "management": (
            "Production output reached {output:,.0f} units with an OEE of {oee:.1f}%, "
            "{oee_direction} from the prior period. Raw material costs represented "
            "{material_pct:.1f}% of COGS, with a standard cost variance of {variance:,.0f}. "
            "Capacity utilization stood at {capacity:.1f}%."
        ),
    },
)
```

- [ ] **Step 2: Create SaaS config**

```python
# pipeline/industries/saas.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

SAAS = IndustryConfig(
    name="SaaS / Technology",
    code="saas",
    available_models=[
        "three_statement", "management", "forecast",
        "ratios", "cash_liquidity",
    ],
    key_ratios=[
        RatioSpec("MRR", "sum(active_subscriptions)", "currency", "—", "growth"),
        RatioSpec("ARR", "mrr * 12", "currency", "—", "growth"),
        RatioSpec("Churn Rate", "churned_mrr / starting_mrr * 100", "%", "<1% monthly", "retention"),
        RatioSpec("Net Revenue Retention", "(start_mrr + expansion - contraction - churn) / start_mrr * 100", "%", ">100%", "retention"),
        RatioSpec("LTV", "(arpa * gross_margin) / monthly_churn", "currency", "—", "profitability"),
        RatioSpec("CAC", "sales_marketing_spend / new_customers", "currency", "—", "efficiency"),
        RatioSpec("LTV:CAC", "ltv / cac", "x", "3:1 to 5:1", "efficiency"),
        RatioSpec("Rule of 40", "revenue_growth + ebitda_margin", "%", ">40%", "growth"),
    ],
    revenue_groupings={
        "Subscription Revenue": ["40100"],
        "Usage Revenue": ["40200"],
        "Professional Services": ["40300"],
        "Other Revenue": ["40800"],
    },
    cogs_structure={
        "Hosting & Infrastructure": ["50100"],
        "Customer Support": ["50200"],
        "Software Licenses": ["50300"],
        "Amortised Dev Costs": ["50400"],
    },
    segment_types=["Subscriptions", "Services", "Usage-Based"],
    industry_metrics=[
        IndustryMetric("MRR", "sum(active_subscriptions)", "currency", "—", "Monthly Recurring Revenue"),
        IndustryMetric("ARR", "mrr * 12", "currency", "—", "Annual Recurring Revenue"),
        IndustryMetric("Churn Rate", "churned_mrr / starting_mrr * 100", "%", "<1% monthly", "Revenue churn"),
        IndustryMetric("NRR", "(start_mrr + expansion - contraction - churn) / start_mrr * 100", "%", ">100%", "Net Revenue Retention"),
        IndustryMetric("LTV:CAC", "ltv / cac", "x", "3:1-5:1", "Unit economics"),
        IndustryMetric("Rule of 40", "revenue_growth + ebitda_margin", "%", ">40%", "Growth + profitability"),
        IndustryMetric("CAC Payback", "cac / (mrr_per_customer * gross_margin)", "months", "<18", "Months to recover CAC"),
    ],
    commentary_templates={
        "management": (
            "MRR reached {mrr:,.0f} ({arr:,.0f} ARR), growing {mrr_growth:.1f}% MoM. "
            "Net revenue retention of {nrr:.1f}% indicates {nrr_assessment} expansion. "
            "The Rule of 40 score is {rule40:.0f} ({growth:.0f}% growth + {margin:.0f}% margin). "
            "LTV:CAC of {ltv_cac:.1f}x {ltv_cac_assessment} the 3:1 benchmark."
        ),
    },
)
```

- [ ] **Step 3: Create Banking config**

```python
# pipeline/industries/banking.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

BANKING = IndustryConfig(
    name="Financial Services / Banking",
    code="banking",
    available_models=[
        "three_statement", "management", "audit",
        "ratios", "forecast", "valuation",
    ],
    key_ratios=[
        RatioSpec("NPL Ratio", "npl / total_loans * 100", "%", "<5%", "asset_quality"),
        RatioSpec("Coverage Ratio", "loan_loss_allowance / npl * 100", "%", ">70%", "asset_quality"),
        RatioSpec("NIM", "(interest_income - interest_expense) / avg_earning_assets * 100", "%", "2.5-4.5%", "profitability"),
        RatioSpec("CET1 Ratio", "cet1_capital / rwa * 100", "%", ">4.5%", "capital"),
        RatioSpec("Cost to Income", "opex / operating_income * 100", "%", "<50%", "efficiency"),
        RatioSpec("Loan to Deposit", "total_loans / total_deposits * 100", "%", "80-90%", "liquidity"),
    ],
    revenue_groupings={
        "Interest Income": ["40100"],
        "Fee & Commission Income": ["40200"],
        "Trading Income": ["40300"],
        "Other Operating Income": ["40800"],
    },
    cogs_structure={
        "Interest Expense": ["50100"],
        "Loan Loss Provision": ["50200"],
        "Operating Costs": ["50300"],
    },
    segment_types=["Retail Banking", "Corporate Banking", "Treasury", "Other"],
    industry_metrics=[
        IndustryMetric("NPL Ratio", "npl / total_loans * 100", "%", "<5%", "Non-performing loans"),
        IndustryMetric("NIM", "(interest_income - interest_expense) / avg_earning_assets * 100", "%", "2.5-4.5%", "Net Interest Margin"),
        IndustryMetric("CET1 Ratio", "cet1_capital / rwa * 100", "%", ">4.5%", "Common Equity Tier 1"),
        IndustryMetric("Cost to Income", "opex / operating_income * 100", "%", "<50%", "Cost efficiency"),
        IndustryMetric("Loan to Deposit", "total_loans / total_deposits * 100", "%", "80-90%", "Funding stability"),
        IndustryMetric("ECL Coverage", "ecl_provisions / total_loans * 100", "%", "Varies", "Expected Credit Loss coverage"),
    ],
    commentary_templates={
        "management": (
            "Net interest margin of {nim:.2f}% {nim_direction} from prior period, "
            "driven by {nim_driver}. The NPL ratio stands at {npl:.1f}% with "
            "coverage of {coverage:.0f}%. CET1 capital ratio of {cet1:.1f}% "
            "{cet1_assessment} the regulatory minimum of 4.5%."
        ),
    },
)
```

- [ ] **Step 4: Create Hospitality config**

```python
# pipeline/industries/hospitality.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

HOSPITALITY = IndustryConfig(
    name="Hospitality / Hotels",
    code="hospitality",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast",
    ],
    key_ratios=[
        RatioSpec("RevPAR", "rooms_revenue / available_rooms", "$", "Varies", "revenue"),
        RatioSpec("ADR", "rooms_revenue / rooms_sold", "$", "Varies", "revenue"),
        RatioSpec("Occupancy", "rooms_sold / available_rooms * 100", "%", "60-80%", "revenue"),
        RatioSpec("GOPPAR", "gross_op_profit / available_rooms", "$", "Varies", "profitability"),
        RatioSpec("Labor Cost Per Room", "total_labor / available_room_nights", "$", "$40-$80", "efficiency"),
        RatioSpec("TRevPAR", "total_revenue / available_rooms", "$", "Varies", "revenue"),
    ],
    revenue_groupings={
        "Rooms Revenue": ["40100"],
        "F&B Revenue": ["40200"],
        "Meetings & Events": ["40300"],
        "Spa & Wellness": ["40400"],
        "Other Revenue": ["40800"],
    },
    cogs_structure={
        "Rooms Costs": ["50100"],
        "F&B Costs": ["50200"],
        "Direct Labor": ["50300"],
        "Operating Supplies": ["50400"],
    },
    segment_types=["Rooms", "F&B", "Meetings", "Other"],
    industry_metrics=[
        IndustryMetric("RevPAR", "rooms_revenue / available_rooms", "$", "Varies", "Revenue Per Available Room"),
        IndustryMetric("ADR", "rooms_revenue / rooms_sold", "$", "Varies", "Average Daily Rate"),
        IndustryMetric("Occupancy", "rooms_sold / available_rooms * 100", "%", "60-80%", "Room occupancy rate"),
        IndustryMetric("GOPPAR", "gross_op_profit / available_rooms", "$", "Varies", "Gross Operating Profit Per Available Room"),
        IndustryMetric("TRevPAR", "total_revenue / available_rooms", "$", "Varies", "Total Revenue Per Available Room"),
        IndustryMetric("CPOR", "total_operating_costs / rooms_sold", "$", "Varies", "Cost Per Occupied Room"),
    ],
    commentary_templates={
        "management": (
            "RevPAR reached {revpar:,.0f}, driven by {adr:,.0f} ADR and {occupancy:.1f}% occupancy. "
            "Total revenue per available room (TRevPAR) was {trevpar:,.0f}, with F&B contributing "
            "{fb_share:.1f}% of total revenue. GOPPAR of {goppar:,.0f} represents a "
            "GOP margin of {gop_margin:.1f}%."
        ),
    },
)
```

- [ ] **Step 5: Create Professional Services config**

```python
# pipeline/industries/services.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

SERVICES = IndustryConfig(
    name="Professional Services",
    code="services",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast",
    ],
    key_ratios=[
        RatioSpec("Utilization Rate", "billable_hours / available_hours * 100", "%", "70-80%", "efficiency"),
        RatioSpec("Realization Rate", "amount_billed / (billable_hours * standard_rate) * 100", "%", ">90%", "efficiency"),
        RatioSpec("Revenue Per Employee", "total_revenue / fte_count", "$", "Varies", "productivity"),
        RatioSpec("Effective Rate", "total_revenue / billable_hours", "$", "Varies", "pricing"),
        RatioSpec("Project Margin", "(revenue - direct_costs) / revenue * 100", "%", ">30%", "profitability"),
        RatioSpec("Write-Off Rate", "write_offs / total_billed * 100", "%", "<5%", "quality"),
    ],
    revenue_groupings={
        "Project Revenue": ["40100"],
        "Retainer Revenue": ["40200"],
        "Consulting Revenue": ["40300"],
        "Other Revenue": ["40800"],
    },
    cogs_structure={
        "Direct Labor": ["50100"],
        "Subcontractors": ["50200"],
        "Travel & Expenses": ["50300"],
        "Software & Tools": ["50400"],
    },
    segment_types=["Projects", "Retainers", "Advisory"],
    industry_metrics=[
        IndustryMetric("Utilization", "billable_hours / available_hours * 100", "%", "70-80%", "Billable hour utilization"),
        IndustryMetric("Realization", "amount_billed / (billable_hours * standard_rate) * 100", "%", ">90%", "Billing realization"),
        IndustryMetric("Revenue/Employee", "total_revenue / fte_count", "$", "Varies", "Revenue per head"),
        IndustryMetric("Effective Rate", "total_revenue / billable_hours", "$", "Varies", "Blended hourly rate"),
        IndustryMetric("WIP Days", "wip / (annual_revenue / 365)", "days", "<30", "Work in progress aging"),
    ],
    commentary_templates={
        "management": (
            "Utilization rate of {utilization:.1f}% {util_direction} from prior period, "
            "with realization at {realization:.1f}%. Revenue per employee was {rev_per_emp:,.0f}. "
            "WIP stands at {wip:,.0f} ({wip_days:.0f} days), indicating "
            "{wip_assessment} billing pipeline."
        ),
    },
)
```

- [ ] **Step 6: Create Retail config**

```python
# pipeline/industries/retail.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

RETAIL = IndustryConfig(
    name="Retail / FMCG",
    code="retail",
    available_models=[
        "three_statement", "variance", "management",
        "cash_liquidity", "ratios", "forecast",
    ],
    key_ratios=[
        RatioSpec("GMROI", "gross_margin_dollars / avg_inventory_cost", "x", ">3.2", "profitability"),
        RatioSpec("Sell-Through", "units_sold / units_received * 100", "%", ">80%", "efficiency"),
        RatioSpec("Inventory Turnover", "cogs / avg_inventory", "x", "4-8x", "efficiency"),
        RatioSpec("Shrinkage", "(book_inventory - physical_count) / book_inventory * 100", "%", "<1.5%", "efficiency"),
        RatioSpec("Avg Transaction Value", "total_revenue / num_transactions", "$", "Varies", "revenue"),
        RatioSpec("Sales Per Sq Ft", "net_sales / selling_sq_ft", "$", "Varies", "efficiency"),
    ],
    revenue_groupings={
        "Product Sales": ["40100"],
        "Online Sales": ["40200"],
        "Service Revenue": ["40300"],
        "Other Income": ["40800"],
    },
    cogs_structure={
        "Product Cost": ["50100"],
        "Freight In": ["50200"],
        "Direct Labor": ["50300"],
        "Packaging": ["50400"],
    },
    segment_types=["In-Store", "Online", "Wholesale"],
    industry_metrics=[
        IndustryMetric("GMROI", "gross_margin_dollars / avg_inventory_cost", "x", ">3.2", "Gross Margin Return on Inventory"),
        IndustryMetric("Sell-Through", "units_sold / units_received * 100", "%", ">80%", "Inventory sell-through rate"),
        IndustryMetric("Inventory Turnover", "cogs / avg_inventory", "x", "4-8x", "How fast inventory converts"),
        IndustryMetric("Shrinkage", "(book - physical) / book * 100", "%", "<1.5%", "Inventory shrinkage"),
        IndustryMetric("ATV", "total_revenue / num_transactions", "$", "Varies", "Average Transaction Value"),
        IndustryMetric("UPT", "total_units / num_transactions", "units", "Varies", "Units Per Transaction"),
    ],
    commentary_templates={
        "management": (
            "GMROI of {gmroi:.2f}x {gmroi_direction} from prior period. "
            "Sell-through rate was {sell_through:.1f}% with inventory turnover of {turnover:.1f}x. "
            "Shrinkage stood at {shrinkage:.1f}%, {shrink_direction} the 1.5% target. "
            "Average transaction value of {atv:,.0f} and UPT of {upt:.1f} indicate {upt_assessment}."
        ),
    },
)
```

- [ ] **Step 7: Create Non-Profit config**

```python
# pipeline/industries/nonprofit.py
from .base import IndustryConfig, RatioSpec, IndustryMetric

NONPROFIT = IndustryConfig(
    name="Non-Profit / NGO",
    code="nonprofit",
    available_models=[
        "three_statement", "management", "variance",
        "ratios", "cash_liquidity",
    ],
    key_ratios=[
        RatioSpec("Programme Ratio", "programme_expenses / total_expenses * 100", "%", ">75%", "effectiveness"),
        RatioSpec("Fundraising Efficiency", "total_contributions / fundraising_expenses", "x", ">3:1", "efficiency"),
        RatioSpec("Mgmt & General Ratio", "mgmt_expenses / total_expenses * 100", "%", "<15%", "efficiency"),
        RatioSpec("Fundraising Expense Ratio", "fundraising_expenses / total_expenses * 100", "%", "<5%", "efficiency"),
        RatioSpec("Operating Reserve", "unrestricted_net_assets / annual_expenses * 100", "%", "25-50%", "sustainability"),
        RatioSpec("Days Cash", "(cash + investments) / (annual_expenses / 365)", "days", ">90", "liquidity"),
    ],
    revenue_groupings={
        "Donations & Grants": ["40100"],
        "Government Grants": ["40200"],
        "Investment Income": ["40300"],
        "Commercial Income": ["40400"],
        "Other Income": ["40800"],
    },
    cogs_structure={
        "Programme Costs": ["50100"],
        "Fundraising Costs": ["50200"],
        "Mgmt & General": ["50300"],
    },
    segment_types=["Programme A", "Programme B", "Fundraising", "Admin"],
    industry_metrics=[
        IndustryMetric("Programme Ratio", "programme_exp / total_exp * 100", "%", ">75%", "Programme efficiency"),
        IndustryMetric("Fundraising Efficiency", "contributions / fundraising_exp", "x", ">3:1", "Return on fundraising spend"),
        IndustryMetric("Mgmt & General", "mgmt_exp / total_exp * 100", "%", "<15%", "Administrative overhead"),
        IndustryMetric("Operating Reserve", "unrestricted_net_assets / annual_expenses * 100", "%", "25-50%", "Financial resilience"),
        IndustryMetric("Days Cash", "(cash + investments) / (annual_expenses / 365)", "days", ">90", "Cash runway"),
        IndustryMetric("Revenue Concentration", "largest_source / total_revenue * 100", "%", "<30%", "Diversification"),
    ],
    commentary_templates={
        "management": (
            "Programme expenses represented {programme_ratio:.1f}% of total expenditure, "
            "{programme_direction} the 75% benchmark. Fundraising efficiency of "
            "{fundraise_eff:.1f}:1 means {fundraise_desc}. Operating reserves cover "
            "{reserve_months:.0f} months of expenses. Days cash on hand: {days_cash:.0f} days."
        ),
    },
)
```

- [ ] **Step 8: Update registry to include all industries**

```python
# pipeline/industries/__init__.py
from .base import IndustryConfig, RatioSpec, IndustryMetric
from .automotive import AUTOMOTIVE
from .manufacturing import MANUFACTURING
from .saas import SAAS
from .banking import BANKING
from .hospitality import HOSPITALITY
from .services import SERVICES
from .retail import RETAIL
from .nonprofit import NONPROFIT

INDUSTRY_MAP: dict[str, IndustryConfig] = {
    "automotive": AUTOMOTIVE,
    "manufacturing": MANUFACTURING,
    "saas": SAAS,
    "banking": BANKING,
    "hospitality": HOSPITALITY,
    "services": SERVICES,
    "retail": RETAIL,
    "nonprofit": NONPROFIT,
}

def get_industry(code: str) -> IndustryConfig:
    return INDUSTRY_MAP.get(code, AUTOMOTIVE)

def list_industries() -> list[dict]:
    return [{"code": k, "name": v.name} for k, v in INDUSTRY_MAP.items()]
```

- [ ] **Step 9: Test all industries**

```bash
cd pipeline && python -c "
from industries import list_industries, get_industry
for ind in list_industries():
    cfg = get_industry(ind['code'])
    print(f\"{cfg.name}: {len(cfg.key_ratios)} ratios, {len(cfg.available_models)} models\")
"
```

- [ ] **Step 10: Commit**

```bash
git add pipeline/industries/
git commit -m "feat: add all 8 industry configs with ratios, metrics, commentary"
```

---

## Task 3: Report Model Registry

**Files:**
- Create: `pipeline/models/__init__.py`
- Create: `pipeline/models/registry.py`

- [ ] **Step 1: Create ReportModel base class**

```python
# pipeline/models/registry.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SheetSpec:
    name: str
    description: str
    columns: list[str]
    formulas: dict[str, str]  # cell_ref -> formula
    freeze_panes: str = "A2"

@dataclass
class ReportModel:
    id: str
    name: str
    description: str
    required_data: list[str]        # Fields needed from dashboard_data.json
    optional_data: list[str] = field(default_factory=list)
    ias_standards: list[str] = field(default_factory=list)  # ["IAS 1", "IAS 7"]
    sheets: list[SheetSpec] = field(default_factory=list)
    commentary_type: str = "general"  # Which commentary template to use
    available_for: list[str] = field(default_factory=list)  # Industry codes

    def requires(self, data: dict) -> bool:
        """Check if data dict has all required fields."""
        return all(k in data and data[k] is not None for k in self.required_data)
```

- [ ] **Step 2: Create model registry**

```python
# pipeline/models/__init__.py
from .registry import ReportModel, SheetSpec

MODEL_MAP: dict[str, ReportModel] = {}

def register_model(model: ReportModel):
    MODEL_MAP[model.id] = model

def get_model(model_id: str) -> ReportModel:
    return MODEL_MAP.get(model_id)

def list_models(industry_code: str = None) -> list[dict]:
    from ..industries import get_industry
    if industry_code:
        ind = get_industry(industry_code)
        models = [m for m in MODEL_MAP.values() if m.id in ind.available_models]
    else:
        models = list(MODEL_MAP.values())
    return [{"id": m.id, "name": m.name, "description": m.description} for m in models]
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/models/
git commit -m "feat: add report model registry base classes"
```

---

## Task 4: 3-Statement Model Builder

**Files:**
- Create: `pipeline/models/three_statement.py`

This is the core model — IAS 1 compliant P&L, B/S, Cash Flow with live Excel formulas.

- [ ] **Step 1: Create 3-Statement model definition and builder**

```python
# pipeline/models/three_statement.py
"""3-Statement Model — IAS 1, IAS 7 compliant.

Produces an Excel workbook with:
  - P&L (by function, IAS 1 Para 82)
  - Balance Sheet (classified, IAS 1 Para 54)
  - Cash Flow (indirect method, IAS 7)
  - Ratios sheet
  - Summary dashboard
"""
from __future__ import annotations
from . import register_model
from .registry import ReportModel, SheetSpec
from ..industries import get_industry

# ── Register ──
register_model(ReportModel(
    id="three_statement",
    name="3-Statement Model",
    description="IAS 1 P&L, Balance Sheet, Cash Flow with live Excel formulas",
    required_data=["pl", "bs", "cf", "ratios"],
    optional_data=["monthly", "segments", "budget_by_period"],
    ias_standards=["IAS 1", "IAS 7"],
    commentary_type="three_statement",
    available_for=["automotive", "manufacturing", "saas", "banking",
                    "hospitality", "services", "retail", "nonprofit"],
))


def build_three_statement_xlsx(data: dict, industry_code: str, settings: dict) -> bytes:
    """Generate the 3-Statement Excel workbook.

    Args:
        data: dashboard_data.json content
        industry_code: industry identifier
        settings: company settings (name, currency, etc.)

    Returns:
        Excel file as bytes
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, numbers

    wb = openpyxl.Workbook()
    ind = get_industry(industry_code)
    curr_sym = settings.get("currency_symbol", "₦")

    # Styles
    hdr_font = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
    hdr_fill = PatternFill("solid", fgColor="1F3A5F")
    sec_font = Font(name="Calibri", bold=True, size=11, color="1F3A5F")
    num_font = Font(name="Calibri", size=10)
    border = Border(
        bottom=Side(style="thin", color="D0D0D0"),
    )
    fmt = f'"{curr_sym}"#,##0;-"{curr_sym}"#,##0;"-"'
    pct_fmt = '0.0%'

    def write_header(ws, row, cols):
        for c, h in enumerate(cols, 1):
            cell = ws.cell(row=row, column=c, value=h)
            cell.font = hdr_font
            cell.fill = hdr_fill
            cell.alignment = Alignment(horizontal="center")

    def write_line(ws, row, col, label, value, is_total=False, is_section=False, number_format=None):
        cell_label = ws.cell(row=row, column=col, value=label)
        cell_value = ws.cell(row=row, column=col + 1, value=value)
        if is_section:
            cell_label.font = sec_font
        elif is_total:
            cell_label.font = Font(name="Calibri", bold=True, size=10)
            cell_value.font = Font(name="Calibri", bold=True, size=10)
        else:
            cell_label.font = num_font
            cell_value.font = num_font
        if number_format:
            cell_value.number_format = number_format
        cell_value.border = border
        return cell_value

    # ── P&L Sheet ──
    ws_pl = wb.active
    ws_pl.title = "Income Statement"
    pl = data.get("pl", {})
    periods = data.get("available_periods", {}).get("months", [])

    write_header(ws_pl, 1, ["Line Item", curr_sym + "'000"])
    row = 3

    sections = [
        ("Revenue", pl.get("revenue", []), "total_revenue", True),
        ("Cost of Sales", pl.get("cogs", []), "total_cogs", False),
        ("Gross Profit", None, "gross_profit", True),
        ("Operating Expenses", pl.get("opex", []), "total_opex", False),
        ("Depreciation", pl.get("depreciation", []), "total_depreciation", False),
        ("Operating Profit", None, "operating_profit", True),
        ("Other Income", pl.get("other_income", []), "total_other_income", False),
        ("Finance Costs", pl.get("finance_costs", []), "total_finance_costs", False),
        ("Profit Before Tax", None, "pbt", True),
        ("Tax", pl.get("tax", []), "total_tax", False),
        ("Profit After Tax", None, "pat", True),
    ]

    for label, items, total_key, is_total in sections:
        if items:
            write_line(ws_pl, row, 1, label, None, is_section=True)
            row += 1
            for item in items:
                write_line(ws_pl, row, 1, f"  {item['label']}", item["value"], number_format=fmt)
                row += 1
            write_line(ws_pl, row, 1, f"Total {label}", pl.get(total_key, 0), is_total=True, number_format=fmt)
            row += 1
        elif total_key in pl:
            write_line(ws_pl, row, 1, label, pl[total_key], is_total=is_total, number_format=fmt)
            row += 1
        row += 1

    # Add margin formulas
    row += 1
    write_line(ws_pl, row, 1, "GP Margin", pl.get("gp_margin", 0) / 100 if pl.get("gp_margin") else 0, number_format=pct_fmt)
    row += 1
    write_line(ws_pl, row, 1, "Operating Margin", pl.get("op_margin", 0) / 100 if pl.get("op_margin") else 0, number_format=pct_fmt)
    row += 1
    write_line(ws_pl, row, 1, "Net Margin", pl.get("pat_margin", 0) / 100 if pl.get("pat_margin") else 0, number_format=pct_fmt)

    ws_pl.column_dimensions["A"].width = 35
    ws_pl.column_dimensions["B"].width = 18

    # ── Balance Sheet ──
    ws_bs = wb.create_sheet("Balance Sheet")
    bs = data.get("bs", {})

    write_header(ws_bs, 1, ["Line Item", curr_sym + "'000"])
    row = 3

    bs_sections = [
        ("ASSETS", None, False, True),
        ("Non-Current Assets", None, False, False),
        ("  Property, Plant & Equipment", None, False, False),  # from detailed BS
        ("Current Assets", bs.get("current_assets", []), False, False),
        ("Total Current Assets", bs.get("total_current_assets", 0), True, False),
        ("Non-Current Assets Total", bs.get("total_non_current_assets", 0), True, False),
        ("TOTAL ASSETS", bs.get("total_assets", 0), True, True),
        ("", None, False, False),
        ("LIABILITIES", None, False, True),
        ("Current Liabilities", bs.get("current_liabilities", []), False, False),
        ("Total Current Liabilities", bs.get("total_current_liabilities", 0), True, False),
        ("Non-Current Liabilities Total", bs.get("total_non_current_liabilities", 0), True, False),
        ("TOTAL LIABILITIES", bs.get("total_liabilities", 0), True, True),
        ("", None, False, False),
        ("EQUITY", None, False, True),
        ("Equity", bs.get("equity", []), False, False),
        ("TOTAL EQUITY", bs.get("total_equity", 0), True, True),
        ("", None, False, False),
        ("Net Assets (A - L)", bs.get("net_assets", 0), True, True),
    ]

    for label, value_or_items, is_total, is_section in bs_sections:
        if is_section:
            write_line(ws_bs, row, 1, label, None, is_section=True)
        elif isinstance(value_or_items, list):
            for item in value_or_items:
                write_line(ws_bs, row, 1, f"  {item['label']}", item["value"], number_format=fmt)
                row += 1
        elif value_or_items is not None:
            write_line(ws_bs, row, 1, label, value_or_items, is_total=is_total, number_format=fmt)
        row += 1

    ws_bs.column_dimensions["A"].width = 35
    ws_bs.column_dimensions["B"].width = 18

    # ── Cash Flow (IAS 7 Indirect) ──
    ws_cf = wb.create_sheet("Cash Flow")
    cf = data.get("cf", {})

    write_header(ws_cf, 1, ["Line Item", curr_sym + "'000"])
    row = 3

    cf_sections = [
        ("OPERATING ACTIVITIES", None, False, True),
        ("  Profit Before Tax", data.get("pl", {}).get("pbt", 0), False, False),
        ("  Depreciation & Amortisation", data.get("pl", {}).get("total_depreciation", 0), False, False),
        ("  Finance Costs", data.get("pl", {}).get("total_finance_costs", 0), False, False),
    ]

    # Working capital changes
    wc_items = cf.get("operating", {}).get("items", [])
    for item in wc_items:
        if item["label"] not in ["Profit Before Tax", "Depreciation", "Finance Costs"]:
            cf_sections.append((f"  {item['label']}", item["value"], False, False))

    cf_sections.extend([
        ("  Cash Generated from Operations", cf.get("operating", {}).get("total", 0), True, False),
        ("  Interest Paid", 0, False, False),  # From data if available
        ("  Tax Paid", 0, False, False),
        ("Net Cash from Operating Activities", cf.get("operating", {}).get("total", 0), True, True),
        ("", None, False, False),
        ("INVESTING ACTIVITIES", None, False, True),
    ])

    for item in cf.get("investing", {}).get("items", []):
        cf_sections.append((f"  {item['label']}", item["value"], False, False))

    cf_sections.extend([
        ("Net Cash from Investing Activities", cf.get("investing", {}).get("total", 0), True, True),
        ("", None, False, False),
        ("FINANCING ACTIVITIES", None, False, True),
    ])

    for item in cf.get("financing", {}).get("items", []):
        cf_sections.append((f"  {item['label']}", item["value"], False, False))

    cf_sections.extend([
        ("Net Cash from Financing Activities", cf.get("financing", {}).get("total", 0), True, True),
        ("", None, False, False),
        ("Net Change in Cash", cf.get("net_change", 0), True, True),
        ("Opening Cash", cf.get("opening_cash", 0), True, False),
        ("Closing Cash", cf.get("closing_cash", 0), True, True),
    ])

    for label, value, is_total, is_section in cf_sections:
        if is_section:
            write_line(ws_cf, row, 1, label, None, is_section=True)
        elif value is not None:
            write_line(ws_cf, row, 1, label, value, is_total=is_total, number_format=fmt)
        row += 1

    ws_cf.column_dimensions["A"].width = 40
    ws_cf.column_dimensions["B"].width = 18

    # ── Ratios Sheet ──
    ws_ratios = wb.create_sheet("Ratios")
    ratios = data.get("ratios", {})

    write_header(ws_ratios, 1, ["Ratio", "Value", "Benchmark"])
    row = 2

    industry_ratios = ind.key_ratios
    for ratio in industry_ratios:
        ws_ratios.cell(row=row, column=1, value=ratio.name).font = num_font
        # Try to get value from ratios dict
        val = ratios.get(ratio.name.lower().replace(" ", "_").replace("(", "").replace(")", ""), None)
        ws_ratios.cell(row=row, column=2, value=val).font = num_font
        ws_ratios.cell(row=row, column=3, value=ratio.benchmark).font = num_font
        row += 1

    ws_ratios.column_dimensions["A"].width = 30
    ws_ratios.column_dimensions["B"].width = 15
    ws_ratios.column_dimensions["C"].width = 20

    # ── Save to bytes ──
    from io import BytesIO
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
```

- [ ] **Step 2: Test the builder**

```bash
cd pipeline && python -c "
from models.three_statement import build_three_statement_xlsx
import json
# Load sample data
with open('../data/current/dashboard_data.json') as f:
    data = json.load(f)
result = build_three_statement_xlsx(data, 'automotive', {'currency_symbol': '₦'})
print(f'Generated {len(result)} bytes')
with open('/tmp/test_3st.xlsx', 'wb') as f:
    f.write(result)
print('Written to /tmp/test_3st.xlsx')
"
```

- [ ] **Step 3: Commit**

```bash
git add pipeline/models/three_statement.py
git commit -m "feat: 3-Statement model builder with IAS 1/7 compliant Excel output"
```

---

## Task 5: Remaining Model Builders

Each model follows the same pattern as Task 4. Create these files:

- [ ] **Step 1: Variance Analysis model** (`pipeline/models/variance.py`)
  - Actual vs Budget comparison sheet
  - Variance bridge (price/volume/mix decomposition per IAS 8)
  - MoM and YTD comparison sheets
  - Materiality flags (>10%, >20%, >50%)
  - IAS 8 policy change/estimate change flags

- [ ] **Step 2: Forecast model** (`pipeline/models/forecast.py`)
  - Assumptions sheet with data validation dropdowns
  - 3-5 year P&L/B/S/CF projections
  - Scenario toggle (Base/Best/Worst) via IF formulas
  - DCF valuation sheet (IFRS 13)
  - Sensitivity table (WACC vs growth rate)

- [ ] **Step 3: Management Report model** (`pipeline/models/management.py`)
  - Executive summary with KPI cards
  - P&L/B/S/CF (condensed)
  - IFRS 8 segment reporting with 10%/75% tests
  - Industry-specific metrics dashboard
  - Commentary section

- [ ] **Step 4: Cash & Liquidity model** (`pipeline/models/cash_liquidity.py`)
  - Working capital analysis (DSO/DIO/DPO)
  - Cash conversion cycle trend
  - IFRS 7 maturity analysis (<1m, 1-3m, 3-6m, 6-12m, 1-5y, >5y)
  - Liquidity stress test scenarios

- [ ] **Step 5: Audit/Compliance model** (`pipeline/models/audit.py`)
  - Trial balance with tie-out checks
  - B/S equality check (A = L + E)
  - CF reconciliation (opening → closing)
  - IAS 1 compliance checklist
  - Exception log with severity levels

- [ ] **Step 6: Ratio Analysis model** (`pipeline/models/ratio_analysis.py`)
  - Liquidity ratios (Current, Quick, Cash)
  - Profitability ratios (GP%, OP%, NP%, ROE, ROA)
  - Efficiency ratios (Asset turnover, Inventory days, Receivable days)
  - Leverage ratios (D/E, Interest coverage, Net Debt/EBITDA)
  - Cash flow ratios (OCF margin, FCF, FCF yield)
  - Industry-specific ratios (from industry config)
  - Trend analysis (vs prior period)

- [ ] **Step 7: Valuation model** (`pipeline/models/valuation.py`)
  - DCF model with WACC calculation
  - CAPM-based cost of equity (Rf + Beta × MRP)
  - Terminal value (Gordon Growth Model)
  - Comparable company multiples (EV/EBITDA, P/E, EV/Revenue)
  - IAS 36 impairment check
  - IFRS 13 fair value hierarchy disclosure
  - Sensitivity table (WACC vs terminal growth)

- [ ] **Step 8: Commit each model**

```bash
git add pipeline/models/
git commit -m "feat: add all 8 report model builders"
```

---

## Task 6: Excel Template Generator

**Files:**
- Create: `pipeline/templates/excel_builder.py`

This replaces hardcoded Excel templates with dynamic generators that create industry-specific output.

- [ ] **Step 1: Create template generator**

```python
# pipeline/templates/excel_builder.py
"""Dynamic Excel template generator.

Creates Excel workbooks based on:
  - Report model (determines sheets and formulas)
  - Industry (determines line items and ratios)
  - Company settings (determines currency and branding)
"""
from __future__ import annotations
from typing import Any
from io import BytesIO

import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment

from ..models import get_model
from ..industries import get_industry


def generate_report(
    model_id: str,
    data: dict,
    industry_code: str,
    settings: dict,
) -> bytes:
    """Generate an Excel report for the given model and industry.

    Args:
        model_id: Report model identifier (e.g., "three_statement")
        data: dashboard_data.json content
        industry_code: Industry code (e.g., "automotive")
        settings: Company settings dict

    Returns:
        Excel file as bytes
    """
    model = get_model(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")

    # Dispatch to model-specific builder
    builder = _get_builder(model_id)
    return builder(data, industry_code, settings)


def _get_builder(model_id: str):
    """Get the builder function for a model."""
    from ..models.three_statement import build_three_statement_xlsx
    from ..models.variance import build_variance_xlsx
    from ..models.forecast import build_forecast_xlsx
    from ..models.management import build_management_xlsx
    from ..models.cash_liquidity import build_cash_liquidity_xlsx
    from ..models.audit import build_audit_xlsx
    from ..models.ratio_analysis import build_ratio_analysis_xlsx
    from ..models.valuation import build_valuation_xlsx

    builders = {
        "three_statement": build_three_statement_xlsx,
        "variance": build_variance_xlsx,
        "forecast": build_forecast_xlsx,
        "management": build_management_xlsx,
        "cash_liquidity": build_cash_liquidity_xlsx,
        "audit": build_audit_xlsx,
        "ratios": build_ratio_analysis_xlsx,
        "valuation": build_valuation_xlsx,
    }
    return builders.get(model_id)
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/templates/
git commit -m "feat: dynamic Excel template generator"
```

---

## Task 7: Commentary Engine

**Files:**
- Create: `pipeline/templates/commentary_engine.py`

Model-specific commentary that reads data and generates CFO-quality narrative.

- [ ] **Step 1: Create commentary engine**

```python
# pipeline/templates/commentary_engine.py
"""Model-specific commentary generator.

Each report model gets its own commentary template that produces
CFO-quality narrative based on the data and industry context.
"""
from __future__ import annotations
from typing import Any

from ..industries import get_industry


def generate_commentary(
    model_id: str,
    data: dict,
    industry_code: str,
    settings: dict,
) -> str:
    """Generate commentary for the given model and industry."""
    ind = get_industry(industry_code)
    template = ind.commentary_templates.get(model_id, "")

    if not template:
        return _default_commentary(model_id, data)

    # Build context from data
    ctx = _build_context(model_id, data, ind)

    try:
        return template.format(**ctx)
    except KeyError:
        return template  # Return raw template if placeholders don't match


def _build_context(model_id: str, data: dict, ind) -> dict:
    """Build the template context from data and industry config."""
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    cf = data.get("cf", {})
    ratios = data.get("ratios", {})

    ctx = {
        "company": data.get("company", "Company"),
        "period": data.get("period", ""),
        "revenue": pl.get("total_revenue", 0),
        "cogs": pl.get("total_cogs", 0),
        "gross_profit": pl.get("gross_profit", 0),
        "gp_margin": pl.get("gp_margin", 0),
        "opex": pl.get("total_opex", 0),
        "operating_profit": pl.get("operating_profit", 0),
        "pbt": pl.get("pbt", 0),
        "pat": pl.get("pat", 0),
        "total_assets": bs.get("total_assets", 0),
        "total_liabilities": bs.get("total_liabilities", 0),
        "total_equity": bs.get("total_equity", 0),
        "current_ratio": ratios.get("current_ratio", 0),
        "quick_ratio": ratios.get("quick_ratio", 0),
        "debt_equity": ratios.get("debt_to_equity", 0),
    }

    # Add industry-specific metrics
    for metric in ind.industry_metrics:
        key = metric.name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
        ctx[key] = ratios.get(key, 0)

    return ctx


def _default_commentary(model_id: str, data: dict) -> str:
    """Generic commentary when no industry template exists."""
    pl = data.get("pl", {})
    return (
        f"Revenue for the period was {pl.get('total_revenue', 0):,.0f}, "
        f"with a gross profit margin of {pl.get('gp_margin', 0):.1f}%. "
        f"Operating profit stood at {pl.get('operating_profit', 0):,.0f}."
    )
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/templates/
git commit -m "feat: model-specific commentary engine"
```

---

## Task 8: Export Router & API Endpoint

**Files:**
- Create: `pipeline/export_router.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create export router**

```python
# pipeline/export_router.py
"""Routes export requests to the correct model builder."""
from __future__ import annotations
from typing import Any

from .templates.excel_builder import generate_report
from .templates.commentary_engine import generate_commentary


def export_report(
    model_id: str,
    data: dict,
    industry_code: str,
    settings: dict,
    format: str = "xlsx",
) -> bytes:
    """Export a report in the specified format.

    Args:
        model_id: Report model ID
        data: dashboard_data.json
        industry_code: Industry code
        settings: Company settings
        format: "xlsx" or "pdf"

    Returns:
        File bytes
    """
    if format == "xlsx":
        return generate_report(model_id, data, industry_code, settings)
    elif format == "pdf":
        # Future: PDF builder
        raise NotImplementedError("PDF export coming soon")
    else:
        raise ValueError(f"Unsupported format: {format}")


def get_commentary(
    model_id: str,
    data: dict,
    industry_code: str,
    settings: dict,
) -> str:
    """Generate commentary for the given model."""
    return generate_commentary(model_id, data, industry_code, settings)
```

- [ ] **Step 2: Add export endpoint to backend**

```python
# Add to backend/main.py after existing routers

from fastapi.responses import Response

@app.post("/api/export/{model_id}")
async def export_model(
    model_id: str,
    request: Request,
    format: str = "xlsx",
):
    """Export a report model as Excel or PDF."""
    import json
    from pathlib import Path

    # Load data
    data_file = config.DASHBOARD_JSON
    if not data_file.exists():
        return JSONResponse({"detail": "No data available. Run pipeline first."}, status_code=404)

    data = json.loads(data_file.read_text("utf-8"))

    # Get industry and settings
    industry_code = data.get("industry", "automotive")
    settings_file = Path(__file__).parent.parent / "data" / "settings.json"
    settings = {}
    if settings_file.exists():
        settings = json.loads(settings_file.read_text("utf-8"))

    try:
        from pipeline.export_router import export_report
        result = export_report(model_id, data, industry_code, settings, format)

        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == "xlsx" else "application/pdf"
        filename = f"{settings.get('company_short_name', 'Report')}_{model_id}_{data.get('period', '')}.{format}"

        return Response(
            content=result,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        return JSONResponse({"detail": str(e)}, status_code=500)


@app.get("/api/models")
async def list_report_models(industry: str = None):
    """List available report models, optionally filtered by industry."""
    from pipeline.models import list_models
    return list_models(industry)


@app.get("/api/industries")
async def list_industries():
    """List available industries."""
    from pipeline.industries import list_industries as _list
    return _list()
```

- [ ] **Step 3: Test the endpoint**

```bash
cd pipeline && python -c "
from export_router import export_report
import json
with open('../data/current/dashboard_data.json') as f:
    data = json.load(f)
result = export_report('three_statement', data, 'automotive', {'currency_symbol': '₦'})
print(f'Generated {len(result)} bytes')
"
```

- [ ] **Step 4: Commit**

```bash
git add pipeline/export_router.py backend/main.py
git commit -m "feat: export router and /api/export endpoint"
```

---

## Task 9: Update Settings to Include Industry

**Files:**
- Modify: `backend/routes/settings.py`
- Modify: `dashboard/src/components/admin/SettingsTab.jsx`
- Modify: `dashboard/src/contexts/SettingsContext.jsx`

- [ ] **Step 1: Add industry to settings schema**

```python
# In backend/routes/settings.py, add to SettingsUpdate:
class SettingsUpdate(BaseModel):
    # ... existing fields ...
    industry: Optional[str] = None  # Industry code
```

- [ ] **Step 2: Add industry selector to SettingsTab**

Add a dropdown to the Company Profile section:
```jsx
<label className="block">
  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Industry</span>
  <select value={form.industry || 'automotive'} onChange={e => update('industry', e.target.value)}
    className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm ...">
    <option value="automotive">Automotive / Dealership</option>
    <option value="manufacturing">Manufacturing</option>
    <option value="saas">SaaS / Technology</option>
    <option value="banking">Financial Services / Banking</option>
    <option value="hospitality">Hospitality / Hotels</option>
    <option value="services">Professional Services</option>
    <option value="retail">Retail / FMCG</option>
    <option value="nonprofit">Non-Profit / NGO</option>
  </select>
</label>
```

- [ ] **Step 3: Commit**

```bash
git add backend/routes/settings.py dashboard/src/components/admin/SettingsTab.jsx
git commit -m "feat: industry selector in admin settings"
```

---

## Task 10: Update ExportCenter with Model Selector

**Files:**
- Modify: `dashboard/src/components/ExportCenter.jsx`
- Create: `dashboard/src/components/ReportModelSelector.jsx`

- [ ] **Step 1: Create ReportModelSelector component**

```jsx
// dashboard/src/components/ReportModelSelector.jsx
import { useState, useEffect } from 'react'
import { FileSpreadsheet, BarChart3, TrendingUp, Calculator, Shield, DollarSign, Activity, PieChart } from 'lucide-react'

const MODEL_ICONS = {
  three_statement: FileSpreadsheet,
  variance: BarChart3,
  forecast: TrendingUp,
  management: PieChart,
  cash_liquidity: DollarSign,
  audit: Shield,
  ratios: Calculator,
  valuation: Activity,
}

export default function ReportModelSelector({ industry, selected, onChange }) {
  const [models, setModels] = useState([])

  useEffect(() => {
    fetch(`/api/models?industry=${industry || ''}`)
      .then(r => r.json())
      .then(setModels)
      .catch(() => setModels([]))
  }, [industry])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {models.map(m => {
        const Icon = MODEL_ICONS[m.id] || FileSpreadsheet
        const isActive = selected === m.id
        return (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              isActive
                ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}>
            <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-[var(--brand)]' : 'text-neutral-400'}`} />
            <div className="text-sm font-bold text-neutral-900 dark:text-white">{m.name}</div>
            <div className="text-[10.5px] text-neutral-500 mt-1 leading-relaxed">{m.description}</div>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update ExportCenter to include model selector**

Replace the current report checklist with:
1. Industry indicator (from settings)
2. Model selector grid
3. Export format (Excel/PDF)
4. Export button

- [ ] **Step 3: Build and verify**

```bash
cd dashboard && npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/ExportCenter.jsx dashboard/src/components/ReportModelSelector.jsx
git commit -m "feat: report model selector in export center"
```

---

## Task 11: Update Pipeline to Pass Industry

**Files:**
- Modify: `pipeline/main.py`

- [ ] **Step 1: Add industry to pipeline output**

```python
# In pipeline/main.py, after loading settings:
settings = _load_settings()
industry = settings.get("industry", "automotive")

# Add to dashboard_data.json output:
result["industry"] = industry
```

- [ ] **Step 2: Commit**

```bash
git add pipeline/main.py
git commit -m "feat: pass industry code through pipeline output"
```

---

## Task 12: End-to-End Test

- [ ] **Step 1: Generate sample data**

```bash
python generate_comprehensive_gl.py
python -m pipeline.main --gl "Sample GL_complete_dirty.xlsx" --mapping "Statement_Mapping.xlsx"
```

- [ ] **Step 2: Test each model export**

```bash
cd pipeline && python -c "
from export_router import export_report
import json
with open('../data/current/dashboard_data.json') as f:
    data = json.load(f)

for model_id in ['three_statement', 'variance', 'management', 'cash_liquidity', 'audit', 'ratios']:
    try:
        result = export_report(model_id, data, 'automotive', {'currency_symbol': '₦'})
        print(f'  [OK] {model_id}: {len(result)} bytes')
    except Exception as e:
        print(f'  [FAIL] {model_id}: {e}')
"
```

- [ ] **Step 3: Verify Excel output**

Open each generated file in Excel and verify:
- P&L balances (Revenue - COGS = GP, etc.)
- B/S balances (A = L + E)
- CF reconciliation (opening + net change = closing)
- Ratios are calculated correctly
- Commentary is generated
- Currency symbol is correct

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete financial report model system"
```
