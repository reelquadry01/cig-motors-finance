from .base import IndustryConfig, IndustryMetric, RatioSpec

RETAIL = IndustryConfig(
    name="Retail / Consumer",
    code="retail",
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
            name="GMROI",
            formula="gross_margin / average_inventory_cost",
            unit="x",
            benchmark="3-4x",
            category="profitability",
        ),
        RatioSpec(
            name="Sell-Through",
            formula="units_sold / (units_sold + ending_inventory)",
            unit="%",
            benchmark="70-80%",
            category="efficiency",
        ),
        RatioSpec(
            name="Inventory Turnover",
            formula="cost_of_goods_sold / average_inventory",
            unit="x",
            benchmark="4-8x",
            category="efficiency",
        ),
        RatioSpec(
            name="Shrinkage",
            formula="shrinkage_loss / total_sales",
            unit="%",
            benchmark="<2%",
            category="loss_prevention",
        ),
        RatioSpec(
            name="Avg Transaction Value",
            formula="total_revenue / total_transactions",
            unit="$",
            benchmark="Varies by category",
            category="revenue",
        ),
        RatioSpec(
            name="Sales Per Sq Ft",
            formula="total_revenue / selling_area_sq_ft",
            unit="$",
            benchmark="Varies by format",
            category="productivity",
        ),
    ],
    revenue_groupings={
        "Product Sales": [
            "In-Store Sales",
            "Online Product Sales",
            "Wholesale Sales",
        ],
        "Online Sales": [
            "E-commerce Revenue",
            "Marketplace Revenue",
            "Digital Products",
        ],
        "Service Revenue": [
            "Installation Services",
            "Extended Warranties",
            "Assembly Services",
        ],
    },
    cogs_structure={
        "Product Cost": [
            "Purchase Cost",
            "Inbound Freight",
            "Customs & Duties",
        ],
        "Freight In": [
            "Freight Charges",
            "Warehousing",
            "Distribution",
        ],
        "Direct Labor": [
            "Sales Staff Wages",
            "Commission",
        ],
        "Packaging": [
            "Retail Packaging",
            "Shipping Materials",
        ],
    },
    segment_types=[
        "In-Store",
        "Online",
        "Wholesale",
    ],
    industry_metrics=[
        IndustryMetric(
            name="GMROI",
            formula="gross_margin / average_inventory_cost",
            unit="x",
            benchmark="3-4x",
            description="Gross Margin Return on Investment",
        ),
        IndustryMetric(
            name="Sell-Through",
            formula="units_sold / (units_sold + ending_inventory)",
            unit="%",
            benchmark="70-80%",
            description="Percentage of inventory sold",
        ),
        IndustryMetric(
            name="Inventory Turnover",
            formula="cost_of_goods_sold / average_inventory",
            unit="x",
            benchmark="4-8x",
            description="How quickly inventory turns over",
        ),
        IndustryMetric(
            name="Shrinkage",
            formula="shrinkage_loss / total_sales",
            unit="%",
            benchmark="<2%",
            description="Inventory shrinkage rate",
        ),
        IndustryMetric(
            name="ATV",
            formula="total_revenue / total_transactions",
            unit="$",
            benchmark="Varies by category",
            description="Average Transaction Value",
        ),
        IndustryMetric(
            name="UPT",
            formula="total_units_sold / total_transactions",
            unit="units",
            benchmark="Varies by category",
            description="Units per Transaction",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with gross margin of {gross_margin:.1f}%. "
            "GMROI was {gmroi:.1f}x and inventory turnover was {inv_turn:.1f}x. "
            "ATV was ${atv:,.0f} with UPT of {upt:.1f}. "
            "Sell-through rate was {sell_through:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Traffic {traffic_direction} {traffic_change:.1f}%. "
            "Conversion {conversion_direction} {conversion_change:.1f} percentage points. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Sales Revenue",
            "Product Sales",
            "Online Sales",
        ],
        "cogs": [
            "5000-5099",
            "Cost of Goods Sold",
            "Purchase Cost",
            "Freight In",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Rent",
            "Staff Costs",
            "Marketing",
        ],
    },
)