from .registry import ReportModel, SheetSpec

MODEL_MAP: dict[str, ReportModel] = {}


def register_model(model: ReportModel):
    MODEL_MAP[model.id] = model


def get_model(model_id: str) -> ReportModel:
    return MODEL_MAP.get(model_id)


def list_models(industry_code: str = None) -> list[dict]:
    from ..industries import get_industry
    if industry_code:
        ind = get_industry(industry_code)
        models = [m for m in MODEL_MAP.values() if m.id in ind.available_models]
    else:
        models = list(MODEL_MAP.values())
    return [{"id": m.id, "name": m.name, "description": m.description} for m in models]


# Register all models by importing their modules
from . import three_statement, variance, forecast, management, cash_liquidity, audit, ratio_analysis, valuation
