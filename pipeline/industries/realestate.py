from .base import IndustryConfig, IndustryMetric, RatioSpec

REAL_ESTATE = IndustryConfig(
    name="Real Estate / REIT",
    code="realestate",
    available_models=[
        "three_statement",
        "management",
        "ratios",
        "forecast",
        "valuation",
    ],
    key_ratios=[
        RatioSpec(
            name="NAV per Share",
            formula="(total_assets - total_liabilities) / shares_outstanding",
            unit="$",
            benchmark="Varies by portfolio",
            category="valuation",
        ),
        RatioSpec(
            name="NOI",
            formula="rental_revenue - operating_expenses",
            unit="$",
            benchmark="Positive and growing",
            category="profitability",
        ),
        RatioSpec(
            name="Occupancy Rate",
            formula="occupied_area / total_leasable_area",
            unit="%",
            benchmark="90-95%",
            category="operations",
        ),
        RatioSpec(
            name="WALE",
            formula="weighted_average_lease_expiry",
            unit="years",
            benchmark="5-10 years",
            category="operations",
        ),
        RatioSpec(
            name="Property Yield",
            formula="net_property_income / property_value",
            unit="%",
            benchmark="4-7%",
            category="valuation",
        ),
        RatioSpec(
            name="Distribution Yield",
            formula="distributions_per_share / share_price",
            unit="%",
            benchmark="4-6%",
            category="income",
        ),
        RatioSpec(
            name="Debt-to-Asset",
            formula="total_debt / total_assets",
            unit="%",
            benchmark="<50%",
            category="leverage",
        ),
        RatioSpec(
            name="Interest Cover",
            formula="ebit / interest_expense",
            unit="x",
            benchmark="3x+",
            category="leverage",
        ),
        RatioSpec(
            name="Same-Store NOI Growth",
            formula="(current_period_noi - prior_period_noi) / prior_period_noi",
            unit="%",
            benchmark="3-5% annual",
            category="growth",
        ),
    ],
    revenue_groupings={
        "Rental Income": [
            "Office Rent",
            "Retail Rent",
            "Industrial Rent",
            "Residential Rent",
        ],
        "Property Management Fees": [
            "Management Fees",
            "Leasing Commissions",
            "Tenant Reimbursements",
        ],
        "Development Profits": [
            "Property Development Gains",
            "Joint Venture Income",
            "Disposal Gains",
        ],
    },
    cogs_structure={
        "Property Operating Expenses": [
            "Utilities",
            "Repairs & Maintenance",
            "Cleaning & Security",
        ],
        "Property Taxes": [
            "Real Estate Tax",
            "Assessment Fees",
        ],
        "Management Fees": [
            "Internal Management Costs",
            "External Management Fees",
        ],
    },
    segment_types=[
        "Office",
        "Retail",
        "Industrial",
        "Residential",
    ],
    industry_metrics=[
        IndustryMetric(
            name="NAV/Share",
            formula="(total_assets - total_liabilities) / shares_outstanding",
            unit="$",
            benchmark="Varies by portfolio",
            description="Net Asset Value per Share",
        ),
        IndustryMetric(
            name="NOI",
            formula="rental_revenue - operating_expenses",
            unit="$",
            benchmark="Positive and growing",
            description="Net Operating Income",
        ),
        IndustryMetric(
            name="Occupancy",
            formula="occupied_area / total_leasable_area",
            unit="%",
            benchmark="90-95%",
            description="Occupancy Rate",
        ),
        IndustryMetric(
            name="WALE",
            formula="weighted_average_lease_expiry",
            unit="years",
            benchmark="5-10 years",
            description="Weighted Average Lease Expiry",
        ),
        IndustryMetric(
            name="Property Yield",
            formula="net_property_income / property_value",
            unit="%",
            benchmark="4-7%",
            description="Property Yield",
        ),
        IndustryMetric(
            name="Distribution Yield",
            formula="distributions_per_share / share_price",
            unit="%",
            benchmark="4-6%",
            description="Distribution Yield",
        ),
        IndustryMetric(
            name="Same-Store Growth",
            formula="(current_period_noi - prior_period_noi) / prior_period_noi",
            unit="%",
            benchmark="3-5% annual",
            description="Same-Store NOI Growth",
        ),
    ],
    commentary_templates={
        "management": (
            "NAV per share was ${nav_per_share:,.2f} with NOI of ${noi:,.0f}. "
            "Occupancy was {occupancy:.1f}% with WALE of {wale:.1f} years. "
            "Property yield was {prop_yield:.1f}% and distribution yield was {dist_yield:.1f}%. "
            "Debt-to-asset ratio was {debt_ratio:.1f}%."
        ),
        "variance": (
            "NOI ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Occupancy {occ_direction} {occ_change:.1f} percentage points. "
            "Same-store growth {ssg_direction} {ssg_change:.1f}%. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Rental Revenue",
            "Property Income",
            "Management Fees",
        ],
        "cogs": [
            "5000-5099",
            "Property Operating Costs",
            "Direct Costs",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Property Taxes",
            "Management Fees",
        ],
    },
)