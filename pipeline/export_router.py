"""Routes export requests to the correct model builder."""
from .templates.excel_builder import generate_report
from .templates.commentary_engine import generate_commentary


def export_report(model_id: str, data: dict, industry_code: str, settings: dict, format: str = "xlsx") -> bytes:
    if format == "xlsx":
        return generate_report(model_id, data, industry_code, settings)
    elif format == "pdf":
        raise NotImplementedError("PDF export coming soon")
    else:
        raise ValueError(f"Unsupported format: {format}")


def get_commentary(model_id: str, data: dict, industry_code: str, settings: dict) -> str:
    return generate_commentary(model_id, data, industry_code, settings)
