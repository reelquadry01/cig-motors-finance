from .base import IndustryConfig, IndustryMetric, RatioSpec

OILGAS = IndustryConfig(
    name="Oil & Gas / Energy",
    code="oilgas",
    available_models=[
        "three_statement",
        "variance",
        "management",
        "cash_liquidity",
        "ratios",
        "forecast",
        "valuation",
    ],
    key_ratios=[
        RatioSpec(
            name="Reserve Life Index",
            formula="proved_reserves / annual_production",
            unit="years",
            benchmark="10-15 years",
            category="reserves",
        ),
        RatioSpec(
            name="Finding & Development Cost",
            formula="(exploration_cost + development_cost) / reserves_added",
            unit="$/boe",
            benchmark="<$10/boe",
            category="cost",
        ),
        RatioSpec(
            name="Production Cost per BOE",
            formula="operating_costs / total_production_boe",
            unit="$/boe",
            benchmark="<$5/boe",
            category="cost",
        ),
        RatioSpec(
            name="DD&A Rate",
            formula="depletion_depreciation_amortization / gross_assets",
            unit="%",
            benchmark="8-12%",
            category="cost",
        ),
        RatioSpec(
            name="Netback per BOE",
            formula="(revenue - operating_costs - royalties) / production_boe",
            unit="$/boe",
            benchmark="Varies with commodity prices",
            category="profitability",
        ),
        RatioSpec(
            name="Reserve Replacement Ratio",
            formula="reserves_added / production",
            unit="x",
            benchmark="100%+",
            category="reserves",
        ),
        RatioSpec(
            name="Operating Margin",
            formula="operating_income / total_revenue",
            unit="%",
            benchmark="20-40%",
            category="profitability",
        ),
    ],
    revenue_groupings={
        "Crude Oil Sales": [
            "Light Crude Revenue",
            "Heavy Crude Revenue",
            "Condensate Sales",
        ],
        "Gas Sales": [
            "Natural Gas Revenue",
            "NGL Revenue",
            "LNG Revenue",
        ],
        "NGL Sales": [
            "Propane Sales",
            "Butane Sales",
            "Natural Gasoline",
        ],
        "Royalty Income": [
            "Royalty Revenue",
            "Override Payments",
            "Production Sharing",
        ],
    },
    cogs_structure={
        "Lifting Costs": [
            "Well Maintenance",
            "Artificial Lift",
            "Production Chemicals",
            "Water Disposal",
        ],
        "DD&A": [
            "Depletion",
            "Depreciation",
            "Amortization",
        ],
        "Transportation": [
            "Pipeline Fees",
            "Shipping Costs",
            "Terminal Fees",
        ],
        "General & Administrative": [
            "Corporate Overhead",
            "Regulatory Costs",
            "Insurance",
        ],
    },
    segment_types=[
        "Exploration & Production",
        "Refining & Marketing",
        "Integrated Gas",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Reserve Life",
            formula="proved_reserves / annual_production",
            unit="years",
            benchmark="10-15 years",
            description="Years of proved reserves at current production",
        ),
        IndustryMetric(
            name="F&D Cost",
            formula="(exploration_cost + development_cost) / reserves_added",
            unit="$/boe",
            benchmark="<$10/boe",
            description="Finding and Development cost per BOE",
        ),
        IndustryMetric(
            name="Production Cost/BOE",
            formula="operating_costs / total_production_boe",
            unit="$/boe",
            benchmark="<$5/boe",
            description="Operating cost per barrel of oil equivalent",
        ),
        IndustryMetric(
            name="Netback/BOE",
            formula="(revenue - operating_costs - royalties) / production_boe",
            unit="$/boe",
            benchmark="Varies with commodity prices",
            description="Netback per barrel of oil equivalent",
        ),
        IndustryMetric(
            name="Reserve Replacement",
            formula="reserves_added / production",
            unit="x",
            benchmark="100%+",
            description="Reserve Replacement Ratio",
        ),
        IndustryMetric(
            name="DD&A Rate",
            formula="depletion_depreciation_amortization / gross_assets",
            unit="%",
            benchmark="8-12%",
            description="DD&A as percentage of gross assets",
        ),
        IndustryMetric(
            name="Decommissioning Ratio",
            formula="decommissioning_provisions / total_assets",
            unit="%",
            benchmark="Varies by asset age",
            description="Decommissioning liability ratio",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with production of {production:,.0f} BOE. "
            "Reserve life index is {rli:.1f} years. "
            "F&D cost was ${fd_cost:,.0f}/boe and netback was ${netback:,.0f}/boe. "
            "Reserve replacement ratio was {rrr:.0f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Production {prod_direction} {prod_change:.1f}%. "
            "Realized price {price_direction} ${price_change:,.0f}/boe. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Oil Revenue",
            "Gas Revenue",
            "Royalty Income",
        ],
        "cogs": [
            "5000-5099",
            "Lifting Costs",
            "DD&A",
            "Transportation",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "G&A",
            "Exploration Costs",
        ],
    },
)