from .base import IndustryConfig, IndustryMetric, RatioSpec

HOSPITALITY = IndustryConfig(
    name="Hospitality / Hotels",
    code="hospitality",
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
            name="RevPAR",
            formula="total_room_revenue / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            category="revenue",
        ),
        RatioSpec(
            name="ADR",
            formula="total_room_revenue / rooms_sold",
            unit="$",
            benchmark="Varies by market tier",
            category="revenue",
        ),
        RatioSpec(
            name="Occupancy",
            formula="rooms_sold / available_rooms",
            unit="%",
            benchmark="70-85% STR benchmarked",
            category="revenue",
        ),
        RatioSpec(
            name="GOPPAR",
            formula="gross_operating_profit / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            category="profitability",
        ),
        RatioSpec(
            name="Labor Cost Per Room",
            formula="total_labor_cost / rooms_sold",
            unit="$",
            benchmark="<40% of rooms revenue",
            category="efficiency",
        ),
        RatioSpec(
            name="TRevPAR",
            formula="total_revenue / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            category="revenue",
        ),
    ],
    revenue_groupings={
        "Rooms": [
            "Room Revenue",
            "Suite Revenue",
            "Long-Stay Revenue",
        ],
        "F&B": [
            "Restaurant Revenue",
            "Bar Revenue",
            "Room Service",
            "Catering",
        ],
        "Meetings & Events": [
            "Conference Revenue",
            "Banquet Revenue",
            "AV Equipment",
        ],
        "Spa & Wellness": [
            "Spa Revenue",
            "Wellness Programs",
            "Fitness Center",
        ],
    },
    cogs_structure={
        "Rooms Costs": [
            "Room Supplies",
            "Laundry",
            "Housekeeping Labor",
        ],
        "F&B Costs": [
            "Food Cost",
            "Beverage Cost",
            "Kitchen Labor",
        ],
        "Direct Labor": [
            "Front Desk Labor",
            "Concierge",
            "Bell Staff",
        ],
        "Operating Supplies": [
            "Guest Supplies",
            "Cleaning Supplies",
            "Amenities",
        ],
    },
    segment_types=[
        "Rooms",
        "F&B",
        "Meetings",
        "Other",
    ],
    industry_metrics=[
        IndustryMetric(
            name="RevPAR",
            formula="total_room_revenue / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            description="Revenue per Available Room",
        ),
        IndustryMetric(
            name="ADR",
            formula="total_room_revenue / rooms_sold",
            unit="$",
            benchmark="Varies by market tier",
            description="Average Daily Rate",
        ),
        IndustryMetric(
            name="Occupancy",
            formula="rooms_sold / available_rooms",
            unit="%",
            benchmark="70-85% STR benchmarked",
            description="Room Occupancy Rate",
        ),
        IndustryMetric(
            name="GOPPAR",
            formula="gross_operating_profit / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            description="Gross Operating Profit per Available Room",
        ),
        IndustryMetric(
            name="TRevPAR",
            formula="total_revenue / available_rooms",
            unit="$",
            benchmark="Varies by market tier",
            description="Total Revenue per Available Room",
        ),
        IndustryMetric(
            name="CPOR",
            formula="total_rooms_cost / rooms_sold",
            unit="$",
            benchmark="<40% of ADR",
            description="Cost per Occupied Room",
        ),
    ],
    commentary_templates={
        "management": (
            "Total revenue was ${total_revenue:,.0f} with RevPAR of ${revpar:,.0f}. "
            "ADR was ${adr:,.0f} at {occupancy:.1f}% occupancy. "
            "GOPPAR came in at ${goppar:,.0f}. "
            "F&B contributed ${fb_rev:,.0f} ({fb_pct:.1f}% of total)."
        ),
        "variance": (
            "RevPAR ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "ADR {adr_direction} ${adr_change:,.0f}. "
            "Occupancy {occ_direction} {occ_change:.1f} percentage points. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Room Revenue",
            "F&B Revenue",
            "Events Revenue",
        ],
        "cogs": [
            "5000-5099",
            "Rooms Cost",
            "F&B Cost",
            "Direct Labor",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Undistributed Operating Expenses",
            "Admin & General",
        ],
    },
)