"""Generate starter templates for the finance pipeline.

Creates Excel files with realistic sample data:
  - GL_Template.xlsx          — 20+ rows covering all account types
  - Statement_Mapping_Template.xlsx — mapping for the GL accounts
  - Budget_Template.xlsx      — 3-month budget data

Usage:
    python generate_templates.py
"""
from __future__ import annotations
from pathlib import Path
from datetime import date
import random

import openpyxl
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment

OUT_DIR = Path(__file__).resolve().parent / "templates"

# ── Styling ──
HEADER_FONT = Font(name="Calibri", bold=True, size=11, color="FFFFFF")
HEADER_FILL = PatternFill("solid", fgColor="1F3A5F")
DATA_FONT = Font(name="Calibri", size=10)
THIN_BORDER = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin"),
)
MONEY_FMT = '#,##0.00;-#,##0.00;"-"'
INT_FMT = '#,##0;-#,##0;"-"'


def style_header(ws, headers: list[str]):
    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.border = THIN_BORDER
        cell.alignment = Alignment(horizontal="center")


def style_data(ws, max_row: int, max_col: int, money_cols: list[int] = None):
    money_cols = money_cols or []
    for r in range(2, max_row + 1):
        for c in range(1, max_col + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = DATA_FONT
            cell.border = THIN_BORDER
            if c in money_cols:
                cell.number_format = MONEY_FMT


# ═══════════════════════════════════════════════════════════════════════
# GL Template — covers every statement section
# ═══════════════════════════════════════════════════════════════════════
GL_ROWS = [
    # (GL_Code, GL_Account, Desc_Status, Doc_Date, Source, Reference, Narration, Debit, Credit)
    # ── Revenue ──
    ("40100", "Vehicle Sales", "Posted", date(2025, 1, 15), "Sales", "INV-001", "Cash sale — Toyota Hilux", 0, 12_500_000),
    ("40100", "Vehicle Sales", "Posted", date(2025, 1, 20), "Sales", "INV-002", "Credit sale — Honda Civic", 0, 8_750_000),
    ("40200", "Spare Parts Sales", "Posted", date(2025, 1, 18), "Sales", "INV-003", "Counter sale — brake pads, filters", 0, 2_340_000),
    ("40300", "Labour Income", "Posted", date(2025, 1, 22), "Service", "SVC-001", "Service — major overhaul", 0, 1_850_000),
    ("40400", "Warranty Income", "Posted", date(2025, 1, 25), "Service", "SVC-002", "Extended warranty revenue", 0, 620_000),
    # ── COGS ──
    ("50100", "Vehicle Cost", "Posted", date(2025, 1, 15), "Purchase", "PO-001", "Toyota Hilux wholesale cost", 7_500_000, 0),
    ("50100", "Vehicle Cost", "Posted", date(2025, 1, 20), "Purchase", "PO-002", "Honda Civic wholesale cost", 5_250_000, 0),
    ("50200", "Parts Cost", "Posted", date(2025, 1, 18), "Purchase", "PO-003", "Brake pads, filters", 1_170_000, 0),
    ("50300", "Technician Wages", "Posted", date(2025, 1, 31), "Payroll", "PAY-001", "Workshop staff — January", 950_000, 0),
    # ── Operating Expenses ──
    ("60100", "Staff Salaries", "Posted", date(2025, 1, 31), "Payroll", "PAY-002", "Office & management salaries", 2_800_000, 0),
    ("60200", "Rent", "Posted", date(2025, 1, 5), "Bank", "DD-001", "Showroom rent — January", 1_200_000, 0),
    ("60300", "Utilities", "Posted", date(2025, 1, 10), "Bank", "DD-002", "Electricity & water", 380_000, 0),
    ("60400", "Marketing", "Posted", date(2025, 1, 12), "Bank", "TRF-001", "Social media ads", 450_000, 0),
    ("60500", "Insurance", "Posted", date(2025, 1, 8), "Bank", "DD-003", "Comprehensive motor insurance", 320_000, 0),
    ("60600", "Office Supplies", "Posted", date(2025, 1, 14), "Petty Cash", "PC-001", "Printer toner, paper", 45_000, 0),
    # ── Depreciation ──
    ("64510", "Depreciation - Buildings", "Posted", date(2025, 1, 31), "Adjusting", "ADJ-001", "Monthly depreciation — building", 125_000, 0),
    ("64520", "Depreciation - Equipment", "Posted", date(2025, 1, 31), "Adjusting", "ADJ-002", "Monthly depreciation — tools", 85_000, 0),
    # ── Other Income ──
    ("70100", "Interest Income", "Posted", date(2025, 1, 31), "Bank", "INT-001", "Fixed deposit interest", 0, 280_000),
    # ── Finance Costs ──
    ("71100", "Bank Charges", "Posted", date(2025, 1, 31), "Bank", "CHG-001", "Transaction fees", 18_000, 0),
    ("71200", "Loan Interest", "Posted", date(2025, 1, 31), "Bank", "DD-004", "Vehicle financing interest", 320_000, 0),
    # ── Tax ──
    ("80100", "Company Income Tax", "Posted", date(2025, 1, 31), "Adjusting", "ADJ-003", "Monthly tax provision", 1_450_000, 0),
    # ── Assets ──
    ("10130", "Bank - Zenith", "Posted", date(2025, 1, 15), "Sales", "INV-001", "Receipt — Hilux sale", 12_500_000, 0),
    ("11000", "Accounts Receivable", "Posted", date(2025, 1, 20), "Sales", "INV-002", "Honda Civic on credit", 8_750_000, 0),
    ("12000", "Inventory - Vehicles", "Posted", date(2025, 1, 15), "Purchase", "PO-001", "Hilux stock in", 7_500_000, 0),
    ("12000", "Inventory - Vehicles", "Posted", date(2025, 1, 20), "Purchase", "PO-002", "Civic stock in", 5_250_000, 0),
    # ── Liabilities ──
    ("20000", "Accounts Payable", "Posted", date(2025, 1, 15), "Purchase", "PO-001", "Supplier — Toyota Nigeria", 0, 7_500_000),
    ("20000", "Accounts Payable", "Posted", date(2025, 1, 20), "Purchase", "PO-002", "Supplier — Honda Nigeria", 0, 5_250_000),
    # ── Equity ──
    ("30100", "Share Capital", "Posted", date(2025, 1, 1), "Opening", "OP-001", "Opening balance", 0, 50_000_000),
]


def generate_gl_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "GL_Clean"
    headers = ["Transaction_ID", "GL_Code", "GL_Account", "Desc_Status", "Doc_Date",
               "Source", "Reference", "Narration", "Debit", "Credit", "Net"]
    style_header(ws, headers)

    for i, row in enumerate(GL_ROWS, start=1):
        code, acct, status, doc_date, source, ref, narr, dr, cr = row
        net = dr - cr
        ws.cell(row=i+1, column=1, value=f"TXN-{i:05d}")
        ws.cell(row=i+1, column=2, value=code)
        ws.cell(row=i+1, column=3, value=acct)
        ws.cell(row=i+1, column=4, value=status)
        ws.cell(row=i+1, column=5, value=doc_date)
        ws.cell(row=i+1, column=6, value=source)
        ws.cell(row=i+1, column=7, value=ref)
        ws.cell(row=i+1, column=8, value=narr)
        ws.cell(row=i+1, column=9, value=dr)
        ws.cell(row=i+1, column=10, value=cr)
        ws.cell(row=i+1, column=11, value=net)

    style_data(ws, len(GL_ROWS)+1, 11, money_cols=[9, 10, 11])
    for c in [5]:
        for r in range(2, len(GL_ROWS)+2):
            ws.cell(row=r, column=c).number_format = "YYYY-MM-DD"

    # Auto-width
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 35)

    return wb


# ═══════════════════════════════════════════════════════════════════════
# Statement Mapping Template
# ═══════════════════════════════════════════════════════════════════════
MAPPING_ROWS = [
    # (GL_Code, GL_Account, Statement_Section, FS_Heading, Note_Heading, CF_Category, Segment, Borrowing_Type, Normal_Balance)
    ("10130", "Bank - Zenith", "Assets", "Current Assets", "", "Operating", "", "", "Debit"),
    ("11000", "Accounts Receivable", "Assets", "Current Assets", "", "Operating", "", "", "Debit"),
    ("12000", "Inventory - Vehicles", "Assets", "Current Assets", "", "Operating", "", "", "Debit"),
    ("17000", "Buildings", "Assets", "Non-Current Assets", "", "Investing", "", "", "Debit"),
    ("17100", "Equipment", "Assets", "Non-Current Assets", "", "Investing", "", "", "Debit"),
    ("20000", "Accounts Payable", "Liabilities", "Current Liabilities", "", "Operating", "", "", "Credit"),
    ("24100", "VAT Payable", "Liabilities", "Current Liabilities", "", "Operating", "", "", "Credit"),
    ("30100", "Share Capital", "Equity", "Equity", "", "", "", "", "Credit"),
    ("39003", "Retained Earnings", "Equity", "Equity", "", "", "", "", "Credit"),
    ("40100", "Vehicle Sales", "Revenue", "Revenue", "", "Operating", "Vehicle Sales", "", "Credit"),
    ("40200", "Spare Parts Sales", "Revenue", "Revenue", "", "Operating", "Parts Sales", "", "Credit"),
    ("40300", "Labour Income", "Revenue", "Revenue", "", "Operating", "Service", "", "Credit"),
    ("40400", "Warranty Income", "Revenue", "Revenue", "", "Operating", "Service", "", "Credit"),
    ("50100", "Vehicle Cost", "COGS", "Cost of Sales", "", "Operating", "Vehicle Sales", "", "Debit"),
    ("50200", "Parts Cost", "COGS", "Cost of Sales", "", "Operating", "Parts Sales", "", "Debit"),
    ("50300", "Technician Wages", "COGS", "Cost of Sales", "", "Operating", "Service", "", "Debit"),
    ("60100", "Staff Salaries", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("60200", "Rent", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("60300", "Utilities", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("60400", "Marketing", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("60500", "Insurance", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("60600", "Office Supplies", "Operating Expenses", "Operating Expenses", "", "Operating", "", "", "Debit"),
    ("64510", "Depreciation - Buildings", "Depreciation", "Depreciation", "", "Operating", "", "", "Debit"),
    ("64520", "Depreciation - Equipment", "Depreciation", "Depreciation", "", "Operating", "", "", "Debit"),
    ("70100", "Interest Income", "Other Income", "Other Income", "", "Operating", "", "", "Credit"),
    ("71100", "Bank Charges", "Finance Costs", "Finance Costs", "", "Operating", "", "", "Debit"),
    ("71200", "Loan Interest", "Finance Costs", "Finance Costs", "", "Financing", "", "Vehicle Finance", "Debit"),
    ("80100", "Company Income Tax", "Tax", "Tax Expense", "", "Operating", "", "", "Debit"),
]


def generate_mapping_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Statement Mapping"
    headers = ["GL_Code", "GL_Account", "Statement_Section", "FS_Heading",
               "Note_Heading", "CF_Category", "Segment", "Borrowing_Type", "Normal_Balance"]
    style_header(ws, headers)

    for i, row in enumerate(MAPPING_ROWS, start=1):
        for j, val in enumerate(row, start=1):
            ws.cell(row=i+1, column=j, value=val)

    style_data(ws, len(MAPPING_ROWS)+1, len(headers))
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 30)

    return wb


# ═══════════════════════════════════════════════════════════════════════
# Budget Template — 3 months
# ═══════════════════════════════════════════════════════════════════════
BUDGET_ROWS = [
    # (GL_Code, GL_Account, Jan, Feb, Mar)
    ("40100", "Vehicle Sales", 12_000_000, 10_500_000, 13_200_000),
    ("40200", "Spare Parts Sales", 2_200_000, 1_900_000, 2_400_000),
    ("40300", "Labour Income", 1_800_000, 1_600_000, 1_900_000),
    ("40400", "Warranty Income", 600_000, 550_000, 650_000),
    ("50100", "Vehicle Cost", 7_200_000, 6_300_000, 7_920_000),
    ("50200", "Parts Cost", 1_100_000, 950_000, 1_200_000),
    ("50300", "Technician Wages", 900_000, 900_000, 920_000),
    ("60100", "Staff Salaries", 2_700_000, 2_700_000, 2_750_000),
    ("60200", "Rent", 1_200_000, 1_200_000, 1_200_000),
    ("60300", "Utilities", 350_000, 330_000, 360_000),
    ("60400", "Marketing", 400_000, 500_000, 450_000),
    ("60500", "Insurance", 320_000, 320_000, 320_000),
    ("60600", "Office Supplies", 40_000, 35_000, 42_000),
    ("64510", "Depreciation - Buildings", 125_000, 125_000, 125_000),
    ("64520", "Depreciation - Equipment", 85_000, 85_000, 85_000),
    ("71100", "Bank Charges", 15_000, 15_000, 16_000),
    ("71200", "Loan Interest", 320_000, 320_000, 320_000),
    ("80100", "Company Income Tax", 1_400_000, 1_200_000, 1_500_000),
]


def generate_budget_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Budget"
    headers = ["GL_Code", "GL_Account", "Jan-2025", "Feb-2025", "Mar-2025"]
    style_header(ws, headers)

    for i, row in enumerate(BUDGET_ROWS, start=1):
        for j, val in enumerate(row, start=1):
            ws.cell(row=i+1, column=j, value=val)

    style_data(ws, len(BUDGET_ROWS)+1, len(headers), money_cols=[3, 4, 5])
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 30)

    return wb


# ═══════════════════════════════════════════════════════════════════════
# Account Summary Template
# ═══════════════════════════════════════════════════════════════════════
ACCT_SUMMARY_ROWS = [
    ("10130", "Bank - Zenith", 15_000_000),
    ("11000", "Accounts Receivable", 8_750_000),
    ("12000", "Inventory - Vehicles", 12_750_000),
    ("17000", "Buildings", 25_000_000),
    ("17100", "Equipment", 8_500_000),
    ("20000", "Accounts Payable", 12_750_000),
    ("24100", "VAT Payable", 680_000),
    ("30100", "Share Capital", 50_000_000),
    ("39003", "Retained Earnings", -4_130_000),
]


def generate_account_summary():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Account_Summary"
    headers = ["GL_Code", "GL_Account", "Opening_Balance"]
    style_header(ws, headers)

    for i, row in enumerate(ACCT_SUMMARY_ROWS, start=1):
        for j, val in enumerate(row, start=1):
            ws.cell(row=i+1, column=j, value=val)

    style_data(ws, len(ACCT_SUMMARY_ROWS)+1, len(headers), money_cols=[3])
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 3, 30)

    return wb


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════
def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    gl = generate_gl_template()
    gl.save(OUT_DIR / "GL_Template.xlsx")
    print(f"  [OK] GL_Template.xlsx — {len(GL_ROWS)} rows")

    mp = generate_mapping_template()
    mp.save(OUT_DIR / "Statement_Mapping_Template.xlsx")
    print(f"  [OK] Statement_Mapping_Template.xlsx — {len(MAPPING_ROWS)} accounts")

    bd = generate_budget_template()
    bd.save(OUT_DIR / "Budget_Template.xlsx")
    print(f"  [OK] Budget_Template.xlsx — {len(BUDGET_ROWS)} lines × 3 months")

    ac = generate_account_summary()
    ac.save(OUT_DIR / "Account_Summary_Template.xlsx")
    print(f"  [OK] Account_Summary_Template.xlsx — {len(ACCT_SUMMARY_ROWS)} accounts")

    # Also copy to root for convenience
    root = Path(__file__).resolve().parent
    (root / "GL_Template.xlsx").write_bytes((OUT_DIR / "GL_Template.xlsx").read_bytes())
    (root / "Statement_Mapping_Template.xlsx").write_bytes((OUT_DIR / "Statement_Mapping_Template.xlsx").read_bytes())
    (root / "Budget_Template.xlsx").write_bytes((OUT_DIR / "Budget_Template.xlsx").read_bytes())
    print(f"\n  Templates also copied to project root.")


if __name__ == "__main__":
    print("Generating starter templates…")
    main()
