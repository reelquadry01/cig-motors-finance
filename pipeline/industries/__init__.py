from .automotive import AUTOMOTIVE
from .manufacturing import MANUFACTURING
from .saas import SAAS
from .banking import BANKING
from .hospitality import HOSPITALITY
from .services import SERVICES
from .retail import RETAIL
from .nonprofit import NONPROFIT
from .oilgas import OILGAS
from .realestate import REAL_ESTATE
from .healthcare import HEALTHCARE
from .education import EDUCATION
from .agriculture import AGRICULTURE
from .telecom import TELECOM
from .construction import CONSTRUCTION
from .transport import TRANSPORT
from .base import IndustryConfig, IndustryMetric, RatioSpec

INDUSTRY_MAP: dict[str, IndustryConfig] = {
    AUTOMOTIVE.code: AUTOMOTIVE,
    MANUFACTURING.code: MANUFACTURING,
    SAAS.code: SAAS,
    BANKING.code: BANKING,
    HOSPITALITY.code: HOSPITALITY,
    SERVICES.code: SERVICES,
    RETAIL.code: RETAIL,
    NONPROFIT.code: NONPROFIT,
    OILGAS.code: OILGAS,
    REAL_ESTATE.code: REAL_ESTATE,
    HEALTHCARE.code: HEALTHCARE,
    EDUCATION.code: EDUCATION,
    AGRICULTURE.code: AGRICULTURE,
    TELECOM.code: TELECOM,
    CONSTRUCTION.code: CONSTRUCTION,
    TRANSPORT.code: TRANSPORT,
}


def get_industry(code: str, default: IndustryConfig | None = None) -> IndustryConfig | None:
    return INDUSTRY_MAP.get(code, default)


def list_industries() -> list[dict[str, str]]:
    return [{"code": cfg.code, "name": cfg.name} for cfg in INDUSTRY_MAP.values()]
