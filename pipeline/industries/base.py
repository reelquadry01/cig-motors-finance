from dataclasses import dataclass, field


@dataclass
class RatioSpec:
    name: str
    formula: str
    unit: str = "x"
    benchmark: str = ""
    category: str = "general"


@dataclass
class IndustryMetric:
    name: str
    formula: str
    unit: str = ""
    benchmark: str = ""
    description: str = ""


@dataclass
class IndustryConfig:
    name: str
    code: str
    available_models: list[str]
    key_ratios: list[RatioSpec]
    revenue_groupings: dict[str, list[str]]
    cogs_structure: dict[str, list[str]]
    segment_types: list[str]
    industry_metrics: list[IndustryMetric]
    commentary_templates: dict[str, str]
    chart_of_accounts_hints: dict[str, list[str]] = field(default_factory=dict)
