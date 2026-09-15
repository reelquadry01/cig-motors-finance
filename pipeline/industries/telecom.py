from .base import IndustryConfig, IndustryMetric, RatioSpec

TELECOM = IndustryConfig(
    name="Telecommunications",
    code="telecom",
    available_models=[
        "three_statement",
        "management",
        "variance",
        "cash_liquidity",
        "ratios",
        "forecast",
    ],
    key_ratios=[
        RatioSpec(
            name="ARPU",
            formula="total_subscription_revenue / average_subscribers",
            unit="$",
            benchmark="Varies by market",
            category="revenue",
        ),
        RatioSpec(
            name="Churn Rate",
            formula="churned_subscribers / total_subscribers",
            unit="%",
            benchmark="<2% monthly",
            category="retention",
        ),
        RatioSpec(
            name="Subscriber Growth",
            formula="(current_subscribers - prior_subscribers) / prior_subscribers",
            unit="%",
            benchmark="Positive and growing",
            category="growth",
        ),
        RatioSpec(
            name="Cost per Acquisition",
            formula="sales_marketing_cost / new_subscribers",
            unit="$",
            benchmark="<12 months ARPU",
            category="unit_economics",
        ),
        RatioSpec(
            name="Network CAPEX Ratio",
            formula="network_capex / total_revenue",
            unit="%",
            benchmark="15-20%",
            category="investment",
        ),
        RatioSpec(
            name="EBITDA Margin",
            formula="ebitda / total_revenue",
            unit="%",
            benchmark="35-45%",
            category="profitability",
        ),
        RatioSpec(
            name="Revenue per Employee",
            formula="total_revenue / total_employees",
            unit="$",
            benchmark="$200k-$500k",
            category="productivity",
        ),
    ],
    revenue_groupings={
        "Subscription": [
            "Mobile Subscription",
            "Fixed Line Subscription",
            "Broadband Subscription",
        ],
        "Equipment Sales": [
            "Handset Sales",
            "Device Sales",
            "Accessory Sales",
        ],
        "Interconnect": [
            "Interconnect Revenue",
            "Roaming Revenue",
            "Wholesale Voice",
        ],
        "Data & VAS": [
            "Data Revenue",
            "Value Added Services",
            "Digital Content",
        ],
    },
    cogs_structure={
        "Network Operations": [
            "Network Maintenance",
            "Power & Cooling",
            "Tower Leases",
        ],
        "Content Costs": [
            "Content Acquisition",
            "Licensing",
            "Streaming Costs",
        ],
        "Commission": [
            "Dealer Commission",
            "Agent Fees",
            "Channel Costs",
        ],
        "Equipment Cost": [
            "Device Cost",
            "SIM Card Cost",
            "Installation",
        ],
    },
    segment_types=[
        "Mobile",
        "Fixed Line",
        "Enterprise",
        "Wholesale",
    ],
    industry_metrics=[
        IndustryMetric(
            name="ARPU",
            formula="total_subscription_revenue / average_subscribers",
            unit="$",
            benchmark="Varies by market",
            description="Average Revenue Per User",
        ),
        IndustryMetric(
            name="Churn",
            formula="churned_subscribers / total_subscribers",
            unit="%",
            benchmark="<2% monthly",
            description="Subscriber churn rate",
        ),
        IndustryMetric(
            name="Subscriber Growth",
            formula="(current_subscribers - prior_subscribers) / prior_subscribers",
            unit="%",
            benchmark="Positive and growing",
            description="Subscriber growth rate",
        ),
        IndustryMetric(
            name="CPA",
            formula="sales_marketing_cost / new_subscribers",
            unit="$",
            benchmark="<12 months ARPU",
            description="Cost Per Acquisition",
        ),
        IndustryMetric(
            name="Network CAPEX Ratio",
            formula="network_capex / total_revenue",
            unit="%",
            benchmark="15-20%",
            description="Network capital expenditure as percentage of revenue",
        ),
        IndustryMetric(
            name="Revenue/Employee",
            formula="total_revenue / total_employees",
            unit="$",
            benchmark="$200k-$500k",
            description="Revenue per employee",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with ARPU of ${arpu:,.0f}. "
            "Subscriber base reached {subscribers:,.0f} with churn of {churn:.2f}%. "
            "EBITDA margin was {ebitda_margin:.1f}% and network CAPEX ratio was {capex_ratio:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "ARPU ${arpu_direction} ${arpu_change:,.0f}. "
            "Subscribers {sub_direction} {sub_change:,.0f}. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Subscription Revenue",
            "Equipment Revenue",
            "Interconnect Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Network Costs",
            "Content Costs",
            "Equipment Costs",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Sales & Marketing",
            "G&A",
        ],
    },
)