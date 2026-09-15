from .base import IndustryConfig, IndustryMetric, RatioSpec

TRANSPORT = IndustryConfig(
    name="Transportation / Logistics",
    code="transport",
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
            name="Revenue per Tonne-Km",
            formula="freight_revenue / total_tonne_km",
            unit="$/tkm",
            benchmark="Varies by mode",
            category="revenue",
        ),
        RatioSpec(
            name="Load Factor",
            formula="actual_tonne_km / available_tonne_km",
            unit="%",
            benchmark="75-90%",
            category="efficiency",
        ),
        RatioSpec(
            name="Fuel Cost Ratio",
            formula="fuel_cost / total_revenue",
            unit="%",
            benchmark="20-35%",
            category="cost",
        ),
        RatioSpec(
            name="Fleet Utilization",
            formula="vehicle_hours_in_use / total_vehicle_hours",
            unit="%",
            benchmark="80-90%",
            category="efficiency",
        ),
        RatioSpec(
            name="Cost per Mile",
            formula="total_operating_cost / total_miles",
            unit="$/mile",
            benchmark="Varies by vehicle type",
            category="cost",
        ),
        RatioSpec(
            name="Operating Margin",
            formula="operating_income / total_revenue",
            unit="%",
            benchmark="8-15%",
            category="profitability",
        ),
    ],
    revenue_groupings={
        "Freight Revenue": [
            "Full Truckload",
            "Less Than Truckload",
            "Intermodal",
        ],
        "Passenger Revenue": [
            "Ticket Sales",
            "Season Passes",
            "Corporate Accounts",
        ],
        "Charter Revenue": [
            "Vehicle Charter",
            "Route Contracts",
            "Dedicated Fleets",
        ],
        "Ancillary": [
            "Insurance Revenue",
            "Packaging Services",
            "Warehousing Revenue",
        ],
    },
    cogs_structure={
        "Fuel": [
            "Diesel",
            "Gasoline",
            "LNG",
        ],
        "Staff Costs": [
            "Driver Wages",
            "Warehouse Staff",
            "Dispatch & Planning",
        ],
        "Maintenance": [
            "Vehicle Maintenance",
            "Tire Costs",
            "Preventive Maintenance",
        ],
        "Leases": [
            "Vehicle Leases",
            "Warehouse Leases",
            "Equipment Leases",
        ],
        "Insurance": [
            "Vehicle Insurance",
            "Cargo Insurance",
            "Liability Insurance",
        ],
    },
    segment_types=[
        "Air Freight",
        "Sea Freight",
        "Road Transport",
        "Warehousing",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Revenue/Tonne-Km",
            formula="freight_revenue / total_tonne_km",
            unit="$/tkm",
            benchmark="Varies by mode",
            description="Revenue per tonne-kilometer",
        ),
        IndustryMetric(
            name="Load Factor",
            formula="actual_tonne_km / available_tonne_km",
            unit="%",
            benchmark="75-90%",
            description="Load factor percentage",
        ),
        IndustryMetric(
            name="Fuel Cost Ratio",
            formula="fuel_cost / total_revenue",
            unit="%",
            benchmark="20-35%",
            description="Fuel cost as percentage of revenue",
        ),
        IndustryMetric(
            name="Fleet Utilization",
            formula="vehicle_hours_in_use / total_vehicle_hours",
            unit="%",
            benchmark="80-90%",
            description="Fleet utilization rate",
        ),
        IndustryMetric(
            name="Cost/Mile",
            formula="total_operating_cost / total_miles",
            unit="$/mile",
            benchmark="Varies by vehicle type",
            description="Operating cost per mile",
        ),
    ],
    commentary_templates={
        "management": (
            "Revenue totaled ${total_revenue:,.0f} with freight contributing "
            "${freight_rev:,.0f} ({freight_pct:.1f}%). "
            "Load factor was {load_factor:.1f}% and fleet utilization was {fleet_util:.1f}%. "
            "Fuel cost ratio was {fuel_ratio:.1f}% and operating margin was {op_margin:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Volume {volume_direction} {volume_change:.1f}%. "
            "Yield {yield_direction} ${yield_change:,.0f}/tkm. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Freight Revenue",
            "Passenger Revenue",
            "Ancillary Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Fuel Costs",
            "Staff Costs",
            "Maintenance",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Depreciation",
            "Insurance",
        ],
    },
)