from .base import IndustryConfig, IndustryMetric, RatioSpec

EDUCATION = IndustryConfig(
    name="Education / Academic",
    code="education",
    available_models=[
        "three_statement",
        "management",
        "variance",
        "cash_liquidity",
        "ratios",
    ],
    key_ratios=[
        RatioSpec(
            name="Tuition Revenue per Student",
            formula="tuition_revenue / total_students",
            unit="$",
            benchmark="Varies by institution type",
            category="revenue",
        ),
        RatioSpec(
            name="Student Retention Rate",
            formula="students_returning / total_students",
            unit="%",
            benchmark="80-90%",
            category="operations",
        ),
        RatioSpec(
            name="Operating Margin",
            formula="operating_income / total_revenue",
            unit="%",
            benchmark="3-8%",
            category="profitability",
        ),
        RatioSpec(
            name="Research Funding Ratio",
            formula="research_revenue / total_revenue",
            unit="%",
            benchmark="10-30% for research universities",
            category="revenue",
        ),
        RatioSpec(
            name="Endowment Return",
            formula="investment_return / endowment_value",
            unit="%",
            benchmark="7-10% long-term average",
            category="investment",
        ),
        RatioSpec(
            name="Staff Cost Ratio",
            formula="staff_costs / total_revenue",
            unit="%",
            benchmark="50-65%",
            category="efficiency",
        ),
    ],
    revenue_groupings={
        "Tuition Fees": [
            "Undergraduate Tuition",
            "Postgraduate Tuition",
            "International Student Fees",
        ],
        "Government Grants": [
            "Federal Grants",
            "State Funding",
            "Research Council Grants",
        ],
        "Research Funding": [
            "Research Grants",
            "Industry Partnerships",
            "Clinical Trial Funding",
        ],
        "Commercial Income": [
            "Conference Revenue",
            "Licensing Income",
            "Consulting",
            "Facility Hire",
        ],
    },
    cogs_structure={
        "Staff Costs": [
            "Academic Staff Salaries",
            "Administrative Staff",
            "Research Staff",
            "Benefits",
        ],
        "Campus Operations": [
            "Facilities Maintenance",
            "Utilities",
            "Grounds & Custodial",
        ],
        "Learning Resources": [
            "Library Resources",
            "Lab Supplies",
            "IT & Learning Systems",
        ],
        "Student Services": [
            "Student Support",
            "Career Services",
            "Health Services",
        ],
    },
    segment_types=[
        "Undergraduate",
        "Postgraduate",
        "Research",
        "Commercial",
    ],
    industry_metrics=[
        IndustryMetric(
            name="Revenue/Student",
            formula="tuition_revenue / total_students",
            unit="$",
            benchmark="Varies by institution type",
            description="Tuition revenue per student",
        ),
        IndustryMetric(
            name="Retention Rate",
            formula="students_returning / total_students",
            unit="%",
            benchmark="80-90%",
            description="Student retention rate",
        ),
        IndustryMetric(
            name="Operating Margin",
            formula="operating_income / total_revenue",
            unit="%",
            benchmark="3-8%",
            description="Operating margin",
        ),
        IndustryMetric(
            name="Research Funding",
            formula="research_revenue / total_revenue",
            unit="%",
            benchmark="10-30% for research universities",
            description="Research funding as percentage of revenue",
        ),
        IndustryMetric(
            name="Endowment Return",
            formula="investment_return / endowment_value",
            unit="%",
            benchmark="7-10% long-term average",
            description="Endowment investment return",
        ),
    ],
    commentary_templates={
        "management": (
            "Total revenue was ${total_revenue:,.0f} with tuition contributing "
            "${tuition_rev:,.0f} ({tuition_pct:.1f}%). "
            "Enrollment stood at {enrollment:,.0f} students with retention of {retention:.1f}%. "
            "Research funding was ${research:,.0f} ({research_pct:.1f}% of total). "
            "Operating margin was {op_margin:.1f}%."
        ),
        "variance": (
            "Revenue ${direction} ${abs_change:,.0f} ({pct_change:+.1f}%) "
            "vs prior period. "
            "Enrollment {enroll_direction} {enroll_change:.0f} students. "
            "Tuition ${tuition_direction} ${tuition_change:,.0f}. "
            "Primary drivers: {primary_drivers}."
        ),
    },
    chart_of_accounts_hints={
        "revenue": [
            "4000-4099",
            "Tuition Revenue",
            "Government Grants",
            "Research Income",
        ],
        "cogs": [
            "5000-5099",
            "Direct Costs",
            "Academic Costs",
            "Research Costs",
        ],
        "operating_expenses": [
            "6000-6099",
            "Operating Expenses",
            "Staff Costs",
            "Campus Operations",
        ],
    },
)