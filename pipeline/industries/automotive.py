from .base import IndustryConfig, IndustryMetric, RatioSpec

AUTOMOTIVE = IndustryConfig(
    name="Automotive / Dealership",
    code="automotive",
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
            name="Gross Profit per Unit (GPU)",
            formula="gross_profit / units_sold",
            unit="$",
            benchmark="$3,500 - $5,000 new; $1,500 - $2,500 used",
            category="profitability",
        ),
        RatioSpec(
            name="Floor Stock Turn",
            formula="cost_of_goods_sold / average_floor_plan",
            unit="x",
            benchmark="8-12x annually",
            category="efficiency",
        ),
        RatioSpec(
            name="Days' Supply",
            formula="(inventory / cost_of_goods_sold) * 365",
            unit="days",
            benchmark="30-45 days",
            category="efficiency",
        ),
        RatioSpec(
            name="Fixed Absorption Rate",
            formula="(parts_labor_revenue + service_revenue) / fixed_overhead",
            unit="%",
            benchmark="100%+",
            category="profitability",
        ),
        RatioSpec(
            name="Net Return on Sales",
            formula="net_income / total_revenue",
            unit="%",
            benchmark="2-4%",
            category="profitability",
        ),
        RatioSpec(
            name="Asset Utilization",
            formula="total_revenue / total_assets",
            unit="x",
            benchmark="2-3x",
            category="efficiency",
        ),
    ],
    revenue_groupings={
        "New Vehicle Sales": [
            "New Vehicle Sales",
            "New Vehicle Gross Profit",
            "New Vehicle Discounts & Allowances",
        ],
        "Used Vehicle Sales": [
            "Used Vehicle Sales",
            "Used Vehicle Gross Profit",
            "Used Vehicle Reconditioning",
        ],
        "Parts & Accessories": [
            "Parts Sales",
            "Accessories Sales",
            "Parts Gross Profit",
        ],
        "Service & Labor": [
            "Labor Sales",
            "Service Gross Profit",
            "Warranty Labor",
        ],
        "F&I Income": [
            "Finance & Insurance Income",
            "F&I Product Sales",
            "Reserve Income",
        ],
        "Warranty Income": [
            "Manufacturer Warranty",
            "Extended Warranty Claims",
            "Recall Reimbursement",
        ],
    },
    cogs_structure={
        "Vehicle Acquisition": [
            "New Vehicle Cost",
            "Used Vehicle Cost",
            "Floor Plan Interest",
        ],
        "Parts Cost": [
            "Parts Cost of Sales",
            "Sublet Parts",
        ],
        "Direct Labor": [
            "Technician Wages",
            "Sublet Labor",
        ],
        "Reconditioning": [
            "Reconditioning Materials",
            "Reconditioning Labor",
        ],
        "Freight & Delivery": [
            "Freight Charges",
            "Delivery Costs",
            "Prep Fees",
        ],
    },
    segment_types=[
        "New Vehicles",
        "Used Vehicles",
        "Parts",
        "Service",
        "F&I",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Gross Profit per Unit (GPU)",
            formula="gross_profit / units_sold",
            unit="$",
            benchmark="$3,500 - $5,000 new; $1,500 - $2,500 used",
            description="Average gross profit earned per vehicle sold",
        ),
        IndustryMetric(
            name="Floor Stock Turn",
            formula="cost_of_goods_sold / average_floor_plan",
            unit="x",
            benchmark="8-12x annually",
            description="How quickly inventory is sold and replenished",
        ),
        IndustryMetric(
            name="PVR Income",
            formula="per_vehicleRevenue / units_sold",
            unit="$",
            benchmark="$1,200 - $1,800",
            description="Per vehicle revenue including F&I and accessories",
        ),
        IndustryMetric(
            name="Service Proficiency",
            formula="service_gross_profit / service_revenue",
            unit="%",
            benchmark="60-70%",
            description="Service department profitability ratio",
        ),
        IndustryMetric(
            name="Absorption Rate",
            formula="(parts_revenue + labor_revenue) / fixed_overhead",
            unit="%",
            benchmark="100%+",
            description="Percentage of fixed costs covered by parts and service",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} for the period, "
            "with new vehicles contributing ${new_vehicle_rev:,.0f} "
            "(${new_vehicle_pct:.1f}% of total). "
            "GPU was ${gpu:,.0f} on new and ${used_gpu:,.0f} on used. "
            "F&I per unit came in at ${fi_per_unit:,.0f}. "
            "Service absorption was {absorption:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Volume {volume_direction} {volume_change:.0f} units. "
            "GPU ${gpu_direction} ${gpu_change:,.0f}. "
            "F&I ${fi_direction} ${fi_change:,.0f} per unit. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Sales Revenue",
            "Gross Sales",
            "Net Sales",
        ],
        "cogs": [
            "5000-5099",
            "Cost of Goods Sold",
            "Vehicle Cost",
            "Parts Cost",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "SG&A",
            "Selling Expenses",
            "General & Administrative",
        ],
    },
)
