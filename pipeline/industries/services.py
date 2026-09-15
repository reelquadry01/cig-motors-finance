from .base import IndustryConfig, IndustryMetric, RatioSpec

SERVICES = IndustryConfig(
    name="Professional Services",
    code="services",
    available_models=[
        "three_statement",
        "variance",
        "management",
        "cash_liquidity",
        "ratios",
        "forecast",
    ],
    key_ratios=[
        RatioSpec(
            name="Utilization Rate",
            formula="billable_hours / total_available_hours",
            unit="%",
            benchmark="75-85%",
            category="efficiency",
        ),
        RatioSpec(
            name="Realization Rate",
            formula="billed_revenue / standard_revenue",
            unit="%",
            benchmark="85-95%",
            category="profitability",
        ),
        RatioSpec(
            name="Revenue Per Employee",
            formula="total_revenue / headcount",
            unit="$",
            benchmark="Varies by service type",
            category="productivity",
        ),
        RatioSpec(
            name="Effective Rate",
            formula="billed_revenue / billable_hours",
            unit="$/hr",
            benchmark="Varies by level",
            category="pricing",
        ),
        RatioSpec(
            name="Project Margin",
            formula="(revenue - project_cost) / revenue",
            unit="%",
            benchmark="25-40%",
            category="profitability",
        ),
        RatioSpec(
            name="Write-Off Rate",
            formula="write_offs / total_billed",
            unit="%",
            benchmark="<5%",
            category="quality",
        ),
    ],
    revenue_groupings={
        "Project": [
            "Fixed-Fee Projects",
            "Time & Materials Projects",
            "Milestone Billing",
        ],
        "Retainer": [
            "Monthly Retainers",
            "Annual Retainers",
            "Advisory Retainers",
        ],
        "Consulting": [
            "Strategy Consulting",
            "Implementation Consulting",
            "Managed Services",
        ],
    },
    cogs_structure={
        "Direct Labor": [
            "Consultant Compensation",
            "Partner Compensation",
            "Bonus & Incentives",
        ],
        "Subcontractors": [
            "Subcontractor Fees",
            "Specialist Consultants",
            "Contract Staff",
        ],
        "Travel & Expenses": [
            "Client Travel",
            "Accommodation",
            "Meals & Entertainment",
        ],
        "Software & Tools": [
            "Project Management Tools",
            "Analytics Software",
            "Licensing",
        ],
    },
    segment_types=[
        "Projects",
        "Retainers",
        "Advisory",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Utilization",
            formula="billable_hours / total_available_hours",
            unit="%",
            benchmark="75-85%",
            description="Billable hours as percentage of available hours",
        ),
        IndustryMetric(
            name="Realization",
            formula="billed_revenue / standard_revenue",
            unit="%",
            benchmark="85-95%",
            description="Revenue realized vs standard rates",
        ),
        IndustryMetric(
            name="Revenue/Employee",
            formula="total_revenue / headcount",
            unit="$",
            benchmark="Varies by service type",
            description="Revenue per employee",
        ),
        IndustryMetric(
            name="Effective Rate",
            formula="billed_revenue / billable_hours",
            unit="$/hr",
            benchmark="Varies by level",
            description="Effective hourly billing rate",
        ),
        IndustryMetric(
            name="WIP Days",
            formula="(unbilled_revenue / total_revenue) * 365",
            unit="days",
            benchmark="30-60 days",
            description="Work-in-Progress days outstanding",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with utilization at {utilization:.1f}%. "
            "Realization rate was {realization:.1f}% and effective rate was ${eff_rate:,.0f}/hr. "
            "Revenue per employee was ${rev_per_emp:,.0f}. "
            "Project margin averaged {proj_margin:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Utilization {util_direction} {util_change:.1f} percentage points. "
            "Effective rate ${eff_rate_change:+,.0f}. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Service Revenue",
            "Consulting Revenue",
            "Project Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Cost of Services",
            "Direct Labor",
            "Subcontractor Costs",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Overhead",
            "G&A",
        ],
    },
)