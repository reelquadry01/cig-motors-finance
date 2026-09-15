from dataclasses import dataclass, field


@dataclass
class SheetSpec:
    name: str                  # "Income Statement"
    description: str           # "IAS 1 compliant P&L"
    columns: list[str]         # Column headers
    formulas: dict[str, str]   # cell_ref -> formula string
    freeze_panes: str = "A2"


@dataclass
class ReportModel:
    id: str                    # "three_statement"
    name: str                  # "3-Statement Model"
    description: str           # Human-readable description
    required_data: list[str]   # Fields needed from dashboard_data.json
    optional_data: list[str]   # Optional fields
    ias_standards: list[str]   # ["IAS 1", "IAS 7"]
    sheets: list[SheetSpec]    # Excel sheet specifications
    commentary_type: str       # Which commentary template to use
    available_for: list[str]   # Industry codes ["automotive", ...]
