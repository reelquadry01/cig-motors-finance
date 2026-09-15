from .base import IndustryConfig, IndustryMetric, RatioSpec

SAAS = IndustryConfig(
    name="SaaS / Software",
    code="saas",
    available_models=[
        "three_statement",
        "management",
        "forecast",
        "ratios",
        "cash_liquidity",
    ],
    key_ratios=[
        RatioSpec(
            name="MRR",
            formula="sum(monthly_subscription_revenue)",
            unit="$",
            benchmark="Growing 10-20% MoM early stage",
            category="growth",
        ),
        RatioSpec(
            name="ARR",
            formula="mrr * 12",
            unit="$",
            benchmark="Growing 40-100%+ YoY",
            category="growth",
        ),
        RatioSpec(
            name="Churn Rate",
            formula="churned_customers / total_customers",
            unit="%",
            benchmark="<5% annual; <1% monthly",
            category="retention",
        ),
        RatioSpec(
            name="NRR",
            formula="(beginning_mrr + expansion - contraction - churn) / beginning_mrr",
            unit="%",
            benchmark="110%+ best-in-class",
            category="retention",
        ),
        RatioSpec(
            name="LTV",
            formula="arpa * gross_margin / churn_rate",
            unit="$",
            benchmark="3x+ CAC",
            category="unit_economics",
        ),
        RatioSpec(
            name="CAC",
            formula="(sales_cost + marketing_cost) / new_customers",
            unit="$",
            benchmark="< LTV/3",
            category="unit_economics",
        ),
        RatioSpec(
            name="LTV:CAC",
            formula="ltv / cac",
            unit="x",
            benchmark="3x+",
            category="unit_economics",
        ),
        RatioSpec(
            name="Rule of 40",
            formula="revenue_growth_rate + profit_margin",
            unit="%",
            benchmark="40%+",
            category="growth",
        ),
    ],
    revenue_groupings={
        "Subscription": [
            "Monthly Subscription Revenue",
            "Annual Subscription Revenue",
            "Platform Fee",
        ],
        "Usage": [
            "API Usage Revenue",
            "Overage Charges",
            "Usage-Based Billing",
        ],
        "Professional Services": [
            "Implementation Services",
            "Training Revenue",
            "Custom Development",
        ],
    },
    cogs_structure={
        "Hosting": [
            "Cloud Infrastructure",
            "CDN Costs",
            "Data Storage",
        ],
        "Customer Support": [
            "Support Staff Costs",
            "Support Tools",
            "Outsourced Support",
        ],
        "Software Licenses": [
            "Third-Party Licenses",
            "Open Source Support",
            "API Costs",
        ],
        "Amortised Dev Costs": [
            "Capitalized Development",
            "Amortization",
        ],
    },
    segment_types=[
        "Subscriptions",
        "Services",
        "Usage-Based",
    ],
    industry_metrics=[
        IndustryMetric(
            name="MRR",
            formula="sum(monthly_subscription_revenue)",
            unit="$",
            benchmark="Growing 10-20% MoM early stage",
            description="Monthly Recurring Revenue",
        ),
        IndustryMetric(
            name="ARR",
            formula="mrr * 12",
            unit="$",
            benchmark="Growing 40-100%+ YoY",
            description="Annual Recurring Revenue",
        ),
        IndustryMetric(
            name="Churn",
            formula="churned_customers / total_customers",
            unit="%",
            benchmark="<5% annual; <1% monthly",
            description="Customer churn rate",
        ),
        IndustryMetric(
            name="NRR",
            formula="(beginning_mrr + expansion - contraction - churn) / beginning_mrr",
            unit="%",
            benchmark="110%+ best-in-class",
            description="Net Revenue Retention",
        ),
        IndustryMetric(
            name="LTV:CAC",
            formula="ltv / cac",
            unit="x",
            benchmark="3x+",
            description="Lifetime Value to Customer Acquisition Cost ratio",
        ),
        IndustryMetric(
            name="Rule of 40",
            formula="revenue_growth_rate + profit_margin",
            unit="%",
            benchmark="40%+",
            description="Growth rate + profit margin",
        ),
        IndustryMetric(
            name="CAC Payback",
            formula="cac / (arpa * gross_margin)",
            unit="months",
            benchmark="<18 months",
            description="Months to recover customer acquisition cost",
        ),
    ],
    commentary_templates={
        "management": (
            "ARR reached ${arr:,.0f} with MRR of ${mrr:,.0f}. "
            "Net Revenue Retention was {nrr:.1f}% and gross churn was {churn:.2f}%. "
            "LTV:CAC ratio was {ltv_cac:.1f}x with CAC payback of {payback:.0f} months. "
            "Rule of 40 score: {rule_40:.0f}%."
        ),
        "variance": (
            "MRR ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "New MRR: ${new_mrr:,.0f}, Churned: ${churned_mrr:,.0f}, Expansion: ${expansion_mrr:,.0f}. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Subscription Revenue",
            "SaaS Revenue",
            "Recurring Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Cost of Revenue",
            "Hosting Costs",
            "Customer Support",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "R&D",
            "Sales & Marketing",
            "G&A",
        ],
    },
)