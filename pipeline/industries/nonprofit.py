from .base import IndustryConfig, IndustryMetric, RatioSpec

NONPROFIT = IndustryConfig(
    name="Nonprofit / NGO",
    code="nonprofit",
    available_models=[
        "three_statement",
        "management",
        "variance",
        "ratios",
        "cash_liquidity",
    ],
    key_ratios=[
        RatioSpec(
            name="Programme Ratio",
            formula="programme_expenses / total_expenses",
            unit="%",
            benchmark="75%+",
            category="efficiency",
        ),
        RatioSpec(
            name="Fundraising Efficiency",
            formula="fundraising_revenue / fundraising_expenses",
            unit="x",
            benchmark="3-5x",
            category="fundraising",
        ),
        RatioSpec(
            name="Mgmt & General Ratio",
            formula="management_general_expenses / total_expenses",
            unit="%",
            benchmark="<15%",
            category="efficiency",
        ),
        RatioSpec(
            name="Fundraising Expense Ratio",
            formula="fundraising_expenses / total_expenses",
            unit="%",
            benchmark="<10%",
            category="fundraising",
        ),
        RatioSpec(
            name="Operating Reserve",
            formula="unrestricted_net_assets / annual_operating_expenses",
            unit="months",
            benchmark="3-6 months",
            category="liquidity",
        ),
        RatioSpec(
            name="Days Cash",
            formula="unrestricted_cash / (annual_operating_expenses / 365)",
            unit="days",
            benchmark="90-180 days",
            category="liquidity",
        ),
    ],
    revenue_groupings={
        "Donations & Grants": [
            "Individual Donations",
            "Corporate Donations",
            "Foundation Grants",
            "Major Gifts",
        ],
        "Government Grants": [
            "Federal Grants",
            "State Grants",
            "Local Government Funding",
        ],
        "Investment Income": [
            "Interest Income",
            "Dividend Income",
            "Investment Returns",
        ],
        "Commercial Income": [
            "Programme Fees",
            "Merchandise Sales",
            "Licensing Income",
        ],
    },
    cogs_structure={
        "Programme Costs": [
            "Direct Programme Expenses",
            "Field Operations",
            "Programme Staff",
            "Programme Materials",
        ],
        "Fundraising Costs": [
            "Fundraising Staff",
            "Events & Campaigns",
            "Donor Management",
            "Marketing & Outreach",
        ],
        "Mgmt & General": [
            "Administration",
            "Finance & Legal",
            "IT & Systems",
            "Governance",
        ],
    },
    segment_types=[
        "Programme A",
        "Programme B",
        "Fundraising",
        "Admin",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Programme Ratio",
            formula="programme_expenses / total_expenses",
            unit="%",
            benchmark="75%+",
            description="Percentage of expenses on programmes",
        ),
        IndustryMetric(
            name="Fundraising Efficiency",
            formula="fundraising_revenue / fundraising_expenses",
            unit="x",
            benchmark="3-5x",
            description="Revenue raised per dollar spent on fundraising",
        ),
        IndustryMetric(
            name="Mgmt & General",
            formula="management_general_expenses / total_expenses",
            unit="%",
            benchmark="<15%",
            description="Management and general expense ratio",
        ),
        IndustryMetric(
            name="Operating Reserve",
            formula="unrestricted_net_assets / annual_operating_expenses",
            unit="months",
            benchmark="3-6 months",
            description="Months of operating reserve",
        ),
        IndustryMetric(
            name="Days Cash",
            formula="unrestricted_cash / (annual_operating_expenses / 365)",
            unit="days",
            benchmark="90-180 days",
            description="Days of cash on hand",
        ),
        IndustryMetric(
            name="Revenue Concentration",
            formula="largest_revenue_source / total_revenue",
            unit="%",
            benchmark="<50%",
            description="Dependency on largest revenue source",
        ),
    ],
    commentary_templates={
        "management": (
            "Total revenue was ${total_revenue:,.0f}, with donations & grants "
            "contributing ${donations:,.0f} ({donations_pct:.1f}%). "
            "Programme ratio was {programme_ratio:.1f}% and fundraising efficiency was "
            "{fundraising_eff:.1f}x. Operating reserve is {reserve:.1f} months."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Donations {donations_direction} ${donations_change:,.0f}. "
            "Programme spending {programme_direction} {programme_change:.1f}%. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Donations",
            "Grants",
            "Programme Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Programme Expenses",
            "Direct Costs",
        ],
        "operating_expenses": [
            "6000-6099",
            "Support Services",
            "Fundraising",
            "Management & General",
        ],
    },
)