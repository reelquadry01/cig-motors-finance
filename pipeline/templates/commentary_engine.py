"""Model-specific commentary generator."""
from ..industries import get_industry


def generate_commentary(model_id: str, data: dict, industry_code: str, settings: dict) -> str:
    """Generate commentary for the given model and industry."""
    ind = get_industry(industry_code)
    template = ind.commentary_templates.get(model_id, "")
    if not template:
        return _default_commentary(model_id, data)
    ctx = _build_context(model_id, data, ind)
    try:
        return template.format(**ctx)
    except KeyError:
        return template


def _build_context(model_id: str, data: dict, ind) -> dict:
    pl = data.get("pl", {})
    bs = data.get("bs", {})
    ratios = data.get("ratios", {})
    ctx = {
        "company": data.get("company", "Company"),
        "period": data.get("period", ""),
        "revenue": pl.get("total_revenue", 0),
        "gross_profit": pl.get("gross_profit", 0),
        "gp_margin": pl.get("gp_margin", 0),
        "operating_profit": pl.get("operating_profit", 0),
        "pbt": pl.get("pbt", 0),
        "pat": pl.get("pat", 0),
    }
    for metric in ind.industry_metrics:
        key = metric.name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
        ctx[key] = ratios.get(key, 0)
    return ctx


def _default_commentary(model_id: str, data: dict) -> str:
    pl = data.get("pl", {})
    return f"Revenue: {pl.get('total_revenue', 0):,.0f}. GP margin: {pl.get('gp_margin', 0):.1f}%."
