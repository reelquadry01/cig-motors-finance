from .base import IndustryConfig, IndustryMetric, RatioSpec

HEALTHCARE = IndustryConfig(
    name="Healthcare / Medical",
    code="healthcare",
    available_models=[
        "three_statement",
        "variance",
        "management",
        "cash_liquidity",
        "ratios",
    ],
    key_ratios=[
        RatioSpec(
            name="Net Patient Revenue",
            formula="total_patient_revenue - contractual_adjustments",
            unit="$",
            benchmark="Growing with volume",
            category="revenue",
        ),
        RatioSpec(
            name="Average Revenue per Patient",
            formula="net_patient_revenue / total_patient_days",
            unit="$",
            benchmark="Varies by acuity",
            category="revenue",
        ),
        RatioSpec(
            name="Occupancy Rate",
            formula="occupied_beds / total_beds",
            unit="%",
            benchmark="80-90%",
            category="operations",
        ),
        RatioSpec(
            name="ALOS",
            formula="total_patient_days / discharges",
            unit="days",
            benchmark="Varies by facility",
            category="operations",
        ),
        RatioSpec(
            name="Bad Debt Ratio",
            formula="bad_debt_expense / net_patient_revenue",
            unit="%",
            benchmark="<5%",
            category="revenue",
        ),
        RatioSpec(
            name="Operating Margin",
            formula="operating_income / total_revenue",
            unit="%",
            benchmark="3-8%",
            category="profitability",
        ),
        RatioSpec(
            name="Staff Cost Ratio",
            formula="staff_costs / total_revenue",
            unit="%",
            benchmark="45-55%",
            category="efficiency",
        ),
        RatioSpec(
            name="Days in A/R",
            formula="(accounts_receivable / net_patient_revenue) * 365",
            unit="days",
            benchmark="40-55 days",
            category="revenue",
        ),
    ],
    revenue_groupings={
        "Patient Services": [
            "Inpatient Revenue",
            "Outpatient Revenue",
            "Emergency Revenue",
            "Surgical Revenue",
        ],
        "Insurance Reimbursement": [
            "Private Insurance",
            "Medicare",
            "Medicaid",
            "Managed Care",
        ],
        "Government Programmes": [
            "Federal Programmes",
            "State Programmes",
            "Public Health",
        ],
        "Research Grants": [
            "NIH Grants",
            "Industry Research",
            "Clinical Trials",
        ],
    },
    cogs_structure={
        "Staff Costs": [
            "Physician Salaries",
            "Nursing Costs",
            "Allied Health",
            "Support Staff",
        ],
        "Medical Supplies": [
            "Surgical Supplies",
            "Diagnostic Supplies",
            "Implants",
        ],
        "Pharmaceutical Costs": [
            "Drug Costs",
            "IV Solutions",
            "Pharmacy Operations",
        ],
        "Equipment Depreciation": [
            "Medical Equipment",
            "IT Systems",
            "Facility Depreciation",
        ],
    },
    segment_types=[
        "Inpatient",
        "Outpatient",
        "Emergency",
        "Ancillary",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Net Patient Revenue",
            formula="total_patient_revenue - contractual_adjustments",
            unit="$",
            benchmark="Growing with volume",
            description="Net revenue from patient services",
        ),
        IndustryMetric(
            name="Occupancy",
            formula="occupied_beds / total_beds",
            unit="%",
            benchmark="80-90%",
            description="Bed Occupancy Rate",
        ),
        IndustryMetric(
            name="ALOS",
            formula="total_patient_days / discharges",
            unit="days",
            benchmark="Varies by facility",
            description="Average Length of Stay",
        ),
        IndustryMetric(
            name="Bad Debt Ratio",
            formula="bad_debt_expense / net_patient_revenue",
            unit="%",
            benchmark="<5%",
            description="Bad debt as percentage of net patient revenue",
        ),
        IndustryMetric(
            name="Staff Cost Ratio",
            formula="staff_costs / total_revenue",
            unit="%",
            benchmark="45-55%",
            description="Staff costs as percentage of revenue",
        ),
        IndustryMetric(
            name="Case Mix Index",
            formula="sum(diagnostic_related_group_weights) / total_cases",
            unit="",
            benchmark="Varies by facility mix",
            description="Average case mix index",
        ),
    ],
    commentary_templates={
        "management": (
            "Net patient revenue was ${net_patient_rev:,.0f} with occupancy at {occupancy:.1f}%. "
            "ALOS was {alos:.1f} days and bad debt ratio was {bad_debt:.1f}%. "
            "Staff cost ratio was {staff_ratio:.1f}% and operating margin was {op_margin:.1f}%."
        ),
        "variance": (
            "Net patient revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Census {census_direction} {census_change:.1f}%. "
            "ALOS {alos_direction} {alos_change:.1f} days. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Patient Revenue",
            "Insurance Revenue",
            "Government Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Direct Costs",
            "Medical Supplies",
            "Pharmacy",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Staff Costs",
            "Administrative",
        ],
    },
)