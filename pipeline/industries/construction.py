from .base import IndustryConfig, IndustryMetric, RatioSpec

CONSTRUCTION = IndustryConfig(
    name="Construction / Engineering",
    code="construction",
    available_models=[
        "three_statement",
        "variance",
        "management",
        "cash_liquidity",
        "ratios",
        "audit",
    ],
    key_ratios=[
        RatioSpec(
            name="Percentage Complete",
            formula="costs_incurred / total_expected_costs",
            unit="%",
            benchmark="On schedule",
            category="operations",
        ),
        RatioSpec(
            name="Retention Ratio",
            formula="retentions_held / total_contract_value",
            unit="%",
            benchmark="5-10%",
            category="revenue",
        ),
        RatioSpec(
            name="Contract Margin",
            formula="(contract_revenue - contract_cost) / contract_revenue",
            unit="%",
            benchmark="10-25%",
            category="profitability",
        ),
        RatioSpec(
            name="Work-in-Progress Days",
            formula="(wip / annual_revenue) * 365",
            unit="days",
            benchmark="60-120 days",
            category="efficiency",
        ),
        RatioSpec(
            name="Revenue per Employee",
            formula="total_revenue / headcount",
            unit="$",
            benchmark="$150k-$300k",
            category="productivity",
        ),
        RatioSpec(
            name="Claims Ratio",
            formula="claims_value / total_contract_value",
            unit="%",
            benchmark="<5%",
            category="risk",
        ),
    ],
    revenue_groupings={
        "Contract Revenue": [
            "Fixed Price Contracts",
            "Cost Plus Contracts",
            "Time & Materials",
        ],
        "Variation Orders": [
            "Client Variations",
            "Scope Changes",
            "Price Adjustments",
        ],
        "Claims": [
            "Delay Claims",
            "Acceleration Claims",
            "Disruption Claims",
        ],
    },
    cogs_structure={
        "Direct Materials": [
            "Structural Materials",
            "Electrical Materials",
            "Plumbing Materials",
        ],
        "Direct Labor": [
            "Site Labor",
            "Supervision",
            "Specialist Trades",
        ],
        "Subcontractors": [
            "Trade Subcontractors",
            "Plant Hire",
            "Specialist Services",
        ],
        "Plant & Equipment": [
            "Equipment Rental",
            "Equipment Purchase",
            "Maintenance",
        ],
    },
    segment_types=[
        "Residential",
        "Commercial",
        "Infrastructure",
        "Industrial",
    ],
    industry_metrics=[
        IndustryMetric(
            name="% Complete",
            formula="costs_incurred / total_expected_costs",
            unit="%",
            benchmark="On schedule",
            description="Percentage of contract completion",
        ),
        IndustryMetric(
            name="Retention Ratio",
            formula="retentions_held / total_contract_value",
            unit="%",
            benchmark="5-10%",
            description="Retention amount as percentage of contract value",
        ),
        IndustryMetric(
            name="Contract Margin",
            formula="(contract_revenue - contract_cost) / contract_revenue",
            unit="%",
            benchmark="10-25%",
            description="Contract gross margin",
        ),
        IndustryMetric(
            name="WIP Days",
            formula="(wip / annual_revenue) * 365",
            unit="days",
            benchmark="60-120 days",
            description="Work-in-Progress days",
        ),
        IndustryMetric(
            name="Claims Ratio",
            formula="claims_value / total_contract_value",
            unit="%",
            benchmark="<5%",
            description="Claims as percentage of contract value",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with contract margin of {margin:.1f}%. "
            "WIP days were {wip_days:.0f} and retention ratio was {retention:.1f}%. "
            "Claims ratio was {claims:.1f}% and revenue per employee was ${rev_per_emp:,.0f}."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Contract margin {margin_direction} {margin_change:.1f} percentage points. "
            "WIP days {wip_direction} {wip_change:.0f} days. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Contract Revenue",
            "Variation Revenue",
            "Claims Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Direct Costs",
            "Materials",
            "Labor",
            "Subcontractors",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Head Office Costs",
            "Tendering Costs",
        ],
    },
)