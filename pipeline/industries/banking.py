from .base import IndustryConfig, IndustryMetric, RatioSpec

BANKING = IndustryConfig(
    name="Banking / Financial Services",
    code="banking",
    available_models=[
        "three_statement",
        "management",
        "audit",
        "ratios",
        "forecast",
        "valuation",
    ],
    key_ratios=[
        RatioSpec(
            name="NPL Ratio",
            formula="non_performing_loans / total_loans",
            unit="%",
            benchmark="<3%",
            category="asset_quality",
        ),
        RatioSpec(
            name="Coverage Ratio",
            formula="loan_loss_provisions / non_performing_loans",
            unit="%",
            benchmark="70-100%+",
            category="asset_quality",
        ),
        RatioSpec(
            name="NIM",
            formula="net_interest_income / earning_assets",
            unit="%",
            benchmark="3-4%",
            category="profitability",
        ),
        RatioSpec(
            name="CET1 Ratio",
            formula="cet1_capital / risk_weighted_assets",
            unit="%",
            benchmark="12%+ regulatory min ~10%",
            category="capital",
        ),
        RatioSpec(
            name="Cost to Income",
            formula="operating_expenses / operating_income",
            unit="%",
            benchmark="<50%",
            category="efficiency",
        ),
        RatioSpec(
            name="Loan to Deposit",
            formula="total_loans / total_deposits",
            unit="%",
            benchmark="80-90%",
            category="liquidity",
        ),
    ],
    revenue_groupings={
        "Interest Income": [
            "Loan Interest Income",
            "Securities Income",
            "Interest on Balances",
        ],
        "Fee & Commission": [
            "Account Fees",
            "Transaction Fees",
            "Advisory Fees",
            "Card Fees",
        ],
        "Trading Income": [
            "Trading Revenue",
            "FICC Revenue",
            "Equities Revenue",
        ],
    },
    cogs_structure={
        "Interest Expense": [
            "Deposit Interest",
            "Borrowing Costs",
            "Bond Coupon Payments",
        ],
        "Loan Loss Provision": [
            "ECL - Stage 1",
            "ECL - Stage 2",
            "ECL - Stage 3",
            "Write-offs",
        ],
        "Operating Costs": [
            "Staff Costs",
            "Technology Costs",
            "Regulatory Costs",
            "Premises",
        ],
    },
    segment_types=[
        "Retail Banking",
        "Corporate Banking",
        "Treasury",
    ],
    industry_metrics=[
        IndustryMetric(
            name="NPL Ratio",
            formula="non_performing_loans / total_loans",
            unit="%",
            benchmark="<3%",
            description="Non-performing loan ratio",
        ),
        IndustryMetric(
            name="NIM",
            formula="net_interest_income / earning_assets",
            unit="%",
            benchmark="3-4%",
            description="Net Interest Margin",
        ),
        IndustryMetric(
            name="CET1",
            formula="cet1_capital / risk_weighted_assets",
            unit="%",
            benchmark="12%+",
            description="Common Equity Tier 1 Capital Ratio",
        ),
        IndustryMetric(
            name="Cost to Income",
            formula="operating_expenses / operating_income",
            unit="%",
            benchmark="<50%",
            description="Cost to Income Ratio",
        ),
        IndustryMetric(
            name="Loan to Deposit",
            formula="total_loans / total_deposits",
            unit="%",
            benchmark="80-90%",
            description="Loan to Deposit Ratio",
        ),
        IndustryMetric(
            name="ECL Coverage",
            formula="expected_credit_loss_provisions / total_loans",
            unit="%",
            benchmark="1-2%",
            description="Expected Credit Loss Coverage",
        ),
    ],
    commentary_templates={
        "management": (
            "Net interest income was ${nii:,.0f} with NIM of {nim:.2f}%. "
            "NPL ratio stood at {npl:.2f}% with coverage of {coverage:.1f}%. "
            "CET1 ratio was {cet1:.1f}% and cost to income was {cost_income:.1f}%. "
            "Loan to deposit ratio was {ltd:.1f}%."
        ),
        "variance": (
            "Net interest income ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "NIM {nim_direction} {nim_change:.2f} bps. "
            "NPL ratio {npl_direction} {npl_change:.2f} bps. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Interest Income",
            "Fee Income",
            "Trading Income",
        ],
        "cogs": [
            "5000-5099",
            "Interest Expense",
            "Loan Loss Provisions",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Staff Costs",
            "Regulatory Costs",
        ],
    },
)