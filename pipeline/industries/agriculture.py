from .base import IndustryConfig, IndustryMetric, RatioSpec

AGRICULTURE = IndustryConfig(
    name="Agriculture / Agribusiness",
    code="agriculture",
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
            name="Yield per Hectare",
            formula="total_yield / hectares_cultivated",
            unit="tonnes/ha",
            benchmark="Varies by crop",
            category="productivity",
        ),
        RatioSpec(
            name="Cost per Unit",
            formula="total_production_cost / total_yield",
            unit="$/tonne",
            benchmark="Varies by crop",
            category="cost",
        ),
        RatioSpec(
            name="Biological Asset Turnover",
            formula="revenue / average_biological_assets",
            unit="x",
            benchmark="1.5-2.5x",
            category="efficiency",
        ),
        RatioSpec(
            name="Harvest Efficiency",
            formula="actual_yield / potential_yield",
            unit="%",
            benchmark="80-95%",
            category="productivity",
        ),
        RatioSpec(
            name="Land Productivity",
            formula="gross_revenue / total_land_area",
            unit="$/ha",
            benchmark="Varies by crop & region",
            category="productivity",
        ),
        RatioSpec(
            name="Government Subsidy Ratio",
            formula="government_subsidies / total_revenue",
            unit="%",
            benchmark="<30%",
            category="revenue",
        ),
    ],
    revenue_groupings={
        "Crop Sales": [
            "Grain Sales",
            "Fruit & Vegetable Sales",
            "Cash Crop Revenue",
        ],
        "Livestock Sales": [
            "Cattle Sales",
            "Poultry Sales",
            "Dairy Revenue",
        ],
        "Government Subsidies": [
            "Direct Subsidies",
            "Price Support",
            "Crop Insurance",
        ],
        "Contract Farming": [
            "Outgrower Payments",
            "Contract Revenue",
            "Processing Contracts",
        ],
    },
    cogs_structure={
        "Seeds & Fertilizer": [
            "Seed Costs",
            "Fertilizer",
            "Crop Protection",
        ],
        "Labor": [
            "Permanent Staff",
            "Seasonal Workers",
            "Contract Labor",
        ],
        "Equipment": [
            "Machinery Depreciation",
            "Fuel & Lubricants",
            "Parts & Maintenance",
        ],
        "Land Preparation": [
            "Tillage",
            "Irrigation",
            "Land Clearing",
        ],
        "Harvesting": [
            "Harvesting Costs",
            "Threshing",
            "Post-Harvest Handling",
        ],
    },
    segment_types=[
        "Crops",
        "Livestock",
        "Processing",
        "Contract Farming",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Yield/Hectare",
            formula="total_yield / hectares_cultivated",
            unit="tonnes/ha",
            benchmark="Varies by crop",
            description="Crop yield per hectare",
        ),
        IndustryMetric(
            name="Cost/Unit",
            formula="total_production_cost / total_yield",
            unit="$/tonne",
            benchmark="Varies by crop",
            description="Production cost per unit",
        ),
        IndustryMetric(
            name="Biological Asset Turnover",
            formula="revenue / average_biological_assets",
            unit="x",
            benchmark="1.5-2.5x",
            description="Turnover of biological assets",
        ),
        IndustryMetric(
            name="Harvest Efficiency",
            formula="actual_yield / potential_yield",
            unit="%",
            benchmark="80-95%",
            description="Actual vs potential yield",
        ),
        IndustryMetric(
            name="Land Productivity",
            formula="gross_revenue / total_land_area",
            unit="$/ha",
            benchmark="Varies by crop & region",
            description="Revenue per hectare of land",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with crop sales contributing "
            "${crop_rev:,.0f} ({crop_pct:.1f}%). "
            "Yield was {yield_per_ha:.1f} tonnes/ha at cost of ${cost_per_unit:,.0f}/tonne. "
            "Harvest efficiency was {harvest_eff:.1f}% and land productivity was "
            "${land_prod:,.0f}/ha."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Yield {yield_direction} {yield_change:.1f} tonnes/ha. "
            "Price ${price_direction} ${price_change:,.0f}/tonne. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Crop Sales",
            "Livestock Sales",
            "Subsidy Income",
        ],
        "cogs": [
            "5000-5099",
            "Production Costs",
            "Seeds & Fertilizer",
            "Labor",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Administrative",
            "Selling Costs",
        ],
    },
)