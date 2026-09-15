from .base import IndustryConfig, IndustryMetric, RatioSpec

MANUFACTURING = IndustryConfig(
    name="Manufacturing",
    code="manufacturing",
    available_models=[
        "three_statement",
        "variance",
        "management",
        "cash_liquidity",
        "ratios",
        "forecast",
        "audit",
    ],
    key_ratios=[
        RatioSpec(
            name="OEE",
            formula="availability * performance * quality",
            unit="%",
            benchmark="85%+ world-class",
            category="efficiency",
        ),
        RatioSpec(
            name="Capacity Utilization",
            formula="actual_output / maximum_output",
            unit="%",
            benchmark="80-90%",
            category="efficiency",
        ),
        RatioSpec(
            name="Yield",
            formula="good_units / total_units_produced",
            unit="%",
            benchmark="95%+",
            category="quality",
        ),
        RatioSpec(
            name="Scrap Rate",
            formula="scrap_cost / total_production_cost",
            unit="%",
            benchmark="<2%",
            category="quality",
        ),
        RatioSpec(
            name="Inventory Turnover",
            formula="cost_of_goods_sold / average_inventory",
            unit="x",
            benchmark="6-12x",
            category="efficiency",
        ),
        RatioSpec(
            name="Material Cost Ratio",
            formula="material_cost / total_revenue",
            unit="%",
            benchmark="30-50%",
            category="profitability",
        ),
    ],
    revenue_groupings={
        "Product Sales": [
            "Finished Goods Sales",
            "Semi-Finished Goods",
            "Component Sales",
        ],
        "Service Revenue": [
            "Maintenance Contracts",
            "Installation Services",
            "Technical Support",
        ],
        "Contract Revenue": [
            "OEM Contracts",
            "Private Label Manufacturing",
            "Toll Manufacturing",
        ],
    },
    cogs_structure={
        "Raw Materials": [
            "Primary Materials",
            "Secondary Materials",
            "Packaging Materials",
        ],
        "Direct Labor": [
            "Production Wages",
            "Overtime Premium",
            "Shift Differentials",
        ],
        "Manufacturing Overhead": [
            "Factory Rent",
            "Utilities",
            "Depreciation - Machinery",
            "Maintenance",
        ],
        "Freight In": [
            "Inbound Freight",
            "Customs & Duties",
            "Warehousing - Raw Materials",
        ],
    },
    segment_types=[
        "Products",
        "Services",
        "Contracts",
    ],
    industry_metrics=[
        IndustryMetric(
            name="OEE",
            formula="availability * performance * quality",
            unit="%",
            benchmark="85%+ world-class",
            description="Overall Equipment Effectiveness",
        ),
        IndustryMetric(
            name="Capacity Utilization",
            formula="actual_output / maximum_output",
            unit="%",
            benchmark="80-90%",
            description="Percentage of maximum output achieved",
        ),
        IndustryMetric(
            name="Yield",
            formula="good_units / total_units_produced",
            unit="%",
            benchmark="95%+",
            description="Percentage of good units produced",
        ),
        IndustryMetric(
            name="Scrap Rate",
            formula="scrap_cost / total_production_cost",
            unit="%",
            benchmark="<2%",
            description="Percentage of production cost lost to scrap",
        ),
        IndustryMetric(
            name="Standard Cost Variance",
            formula="(actual_cost - standard_cost) / standard_cost",
            unit="%",
            benchmark="Within ±5%",
            description="Variance from standard production costs",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} for the period, "
            "with product sales contributing ${product_rev:,.0f} "
            "(${product_pct:.1f}% of total). "
            "OEE was {oee:.1f}% with capacity utilization at {capacity:.1f}%. "
            "Scrap rate was {scrap:.2f}%. "
            "Inventory turnover was {inv_turn:.1f}x."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Volume {volume_direction} {volume_change:.0f} units. "
            "OEE {oee_direction} {oee_change:.1f} percentage points. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Sales Revenue",
            "Product Sales",
            "Service Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Cost of Goods Sold",
            "Direct Materials",
            "Direct Labor",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Manufacturing Overhead",
            "SG&A",
        ],
    },
)