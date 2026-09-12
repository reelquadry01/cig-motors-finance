"""Formatting and utility helpers for the finance pipeline."""


def fmt_millions(value: float) -> float:
    """Convert raw NGN to millions, rounded to 1 decimal."""
    return round(value / 1_000_000, 1)


def fmt_pct(value: float) -> str:
    """Format a ratio as percentage string."""
    return f"{value:.1f}%"


def fmt_ratio(value: float) -> str:
    """Format a ratio with x suffix."""
    return f"{value:.2f}x"


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division returning default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator
