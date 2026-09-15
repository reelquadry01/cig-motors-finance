"""Dynamic Excel template generator."""
from ..models import get_model
from ..industries import get_industry


def generate_report(model_id: str, data: dict, industry_code: str, settings: dict) -> bytes:
    """Generate an Excel report for the given model and industry."""
    model = get_model(model_id)
    if not model:
        raise ValueError(f"Unknown model: {model_id}")
    builder = _get_builder(model_id)
    return builder(data, industry_code, settings)


def _get_builder(model_id: str):
    from ..models.three_statement import build_three_statement_xlsx
    from ..models.variance import build_variance_xlsx
    from ..models.forecast import build_forecast_xlsx
    from ..models.management import build_management_xlsx
    from ..models.cash_liquidity import build_cash_liquidity_xlsx
    from ..models.audit import build_audit_xlsx
    from ..models.ratio_analysis import build_ratios_xlsx
    from ..models.valuation import build_valuation_xlsx
    builders = {
        "three_statement": build_three_statement_xlsx,
        "variance": build_variance_xlsx,
        "forecast": build_forecast_xlsx,
        "management": build_management_xlsx,
        "cash_liquidity": build_cash_liquidity_xlsx,
        "audit": build_audit_xlsx,
        "ratios": build_ratios_xlsx,
        "valuation": build_valuation_xlsx,
    }
    return builders.get(model_id)
