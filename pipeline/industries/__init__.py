from .automotive import AUTOMOTIVE
from .base import IndustryConfig, IndustryMetric, RatioSpec

INDUSTRY_MAP: dict[str, IndustryConfig] = {
    AUTOMOTIVE.code: AUTOMOTIVE,
}


def get_industry(code: str, default: IndustryConfig | None = None) -> IndustryConfig | None:
    return INDUSTRY_MAP.get(code, default)


def list_industries() -> list[dict[str, str]]:
    return [{"code": cfg.code, "name": cfg.name} for cfg in INDUSTRY_MAP.values()]
