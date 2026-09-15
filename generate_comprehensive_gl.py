"""Generate a comprehensive 2-year GL for CIG Motors with realistic data.

Produces `Sample GL_complete_dirty.xlsx` with:
  - 2 years of data (2024 prior + 2025 current)
  - Non-zero revenue every month (₦800M–₦1.2B/month)
  - Revenue split across vehicles, spare parts, labour, warranty, insurance
  - COGS ~65%, OpEx ~18%, Depreciation ~3% of revenue
  - Finance costs, tax at 30% of PBT, other income
  - All double-entry balanced (every Dr has matching Cr)
  - Opening balances that balance (A = L + E)
  - Year-end adjustments (tax accrual, RE rollforward)
  - Dirty data rows for testing the cleaner
  - Account_Summary sheet with opening balances

Usage:
    python generate_comprehensive_gl.py
"""
from __future__ import annotations
import random
from datetime import date, timedelta
from calendar import monthrange
from collections import defaultdict
from pathlib import Path

import pandas as pd
import numpy as np
import openpyxl
from openpyxl import Workbook


# ═══════════════════════════════════════════════════════════════════════
# CHART OF ACCOUNTS — from Statement_Mapping.xlsx
# (code, name, normal_balance, statement_section)
# ═══════════════════════════════════════════════════════════════════════
ACCOUNTS = {
    # ── Assets (Debit-normal) ──
    "10000": ("Cash in Hand - Naira-1", "Debit", "Assets"),
    "10100": ("Cash in Hand - Naira - 2", "Debit", "Assets"),
    "10130": ("Bank - Zenith Bank Acct-2", "Debit", "Assets"),
    "10140": ("Bank - Access Bank", "Debit", "Assets"),
    "10150": ("Bank - Polaris Bank", "Debit", "Assets"),
    "10165": ("Bank- Union Bank (USD)", "Debit", "Assets"),
    "10170": ("Cash in Hand - US$", "Debit", "Assets"),
    "10171": ("Cash in Hand - Euro", "Debit", "Assets"),
    "10180": ("Bank - Stanbic Bank", "Debit", "Assets"),
    "10185": ("Bank - Stanbic ( USD)", "Debit", "Assets"),
    "10190": ("Bank - Fidelity Bank", "Debit", "Assets"),
    "10200": ("Bank - GTB", "Debit", "Assets"),
    "10210": ("Bank - Zenith Bank (USD)", "Debit", "Assets"),
    "10220": ("Bank - First Bank", "Debit", "Assets"),
    "10260": ("Bank - FCMB", "Debit", "Assets"),
    "10270": ("Bank - Sterling Bank", "Debit", "Assets"),
    "10400": ("Bank - UBA", "Debit", "Assets"),
    "10450": ("Bank - UBA Acct 2", "Debit", "Assets"),
    "10700": ("Bank - WEMA Bank (Operation)", "Debit", "Assets"),
    "11000": ("CA - Accounts Receivable", "Debit", "Assets"),
    "11010": ("CA - Other Receivables", "Debit", "Assets"),
    "11070": ("CA - VAT Receivable", "Debit", "Assets"),
    "11080": ("CA - WHT Receivable", "Debit", "Assets"),
    # Inventory
    "12000": ("Inventory - GN8", "Debit", "Other"),
    "12100": ("Inventory- New & Used Cars-GA3", "Debit", "Other"),
    "12200": ("Inventory - New Cars-GS4", "Debit", "Other"),
    "12500": ("Inventory-AutoParts- VI", "Debit", "Other"),
    "12900": ("Inventory - Auto Parts-Ojota", "Debit", "Other"),
    "13000": ("Inventory - Spare Parts-Abuja", "Debit", "Other"),
    # Prepayments
    "14021": ("Prepaid - Rent- PH", "Debit", "Assets"),
    "14030": ("Prepaid - Rent - Abuja", "Debit", "Assets"),
    "14045": ("Prepaid - Rent - Ojota", "Debit", "Assets"),
    "14050": ("Prepaid - General", "Debit", "Assets"),
    "14100": ("CA - Employee Advances", "Debit", "Assets"),
    "14800": ("CA - Customer Advances Sales", "Debit", "Assets"),
    "19110": ("CA - Input VAT", "Debit", "Assets"),
    # Fixed Assets
    "15000": ("FA - Furniture & Fittings", "Debit", "Assets"),
    "15100": ("FA - Equipment", "Debit", "Assets"),
    "15200": ("FA - Motor Vehicle", "Debit", "Assets"),
    "15500": ("FA - Land", "Debit", "Assets"),
    "15501": ("FA - Building", "Debit", "Assets"),
    "15700": ("FA - Plant & Machinery", "Debit", "Assets"),
    "15960": ("Right of Use", "Debit", "Assets"),
    # Acc Depreciation (Debit-normal in GL, contra-asset on BS)
    "17000": ("Acc Depreciation - Furniture", "Debit", "Assets"),
    "17100": ("Acc Depreciation - Equipment", "Debit", "Assets"),
    "17200": ("Acc Depreciation-Motor Vehicle", "Debit", "Assets"),
    "17700": ("Acc Depreciation- P&M", "Debit", "Assets"),
    "17800": ("Acc Depreciation- Building", "Debit", "Assets"),
    "17900": ("Accum Amortization- ROU", "Debit", "Assets"),
    # Deferred Tax
    "19100": ("CA - Deferred Tax Assets|Liabi", "Debit", "Tax"),
    # Intercompany
    "24310": ("CA - Intercompany - GAC MOTORS", "Debit", "Assets"),
    "24320": ("CA - China Good Car Nig Ltd", "Debit", "Assets"),
    "24330": ("CA- China Good Leasing Co. Ltd", "Debit", "Assets"),
    "24340": ("CA- Mimiso Co Nig Ltd", "Debit", "Assets"),

    # ── Liabilities (Credit-normal) ──
    "20000": ("CL - Accounts Payable", "Credit", "Liabilities"),
    "23300": ("CL - Audit Fees Payable", "Credit", "Liabilities"),
    "23500": ("CL - Witholding Tax Payable", "Credit", "Liabilities"),
    "23600": ("CA - VAT Payable/Output", "Credit", "Liabilities"),
    "23910": ("CL - Salary Control", "Credit", "Liabilities"),
    "23920": ("CL - Employees Pension Payable", "Credit", "Liabilities"),
    "23930": ("CL - Payee Payable", "Credit", "Liabilities"),
    "23940": ("CL - Employers pension payable", "Credit", "Liabilities"),
    "24100": ("CL - Deposits", "Credit", "Liabilities"),
    "24600": ("CL - Accrued Expenses", "Credit", "Liabilities"),
    "24500": ("Lease Liability", "Credit", "Liabilities"),
    # Bank Loans (Credit-normal)
    "10145": ("Access Bank 14Bn", "Credit", "Liabilities"),
    "10155": ("CL- Polaris bank Loan", "Credit", "Liabilities"),
    "10160": ("Bank - Union Bank", "Credit", "Liabilities"),
    "10290": ("CL- UBA-Contract Financing", "Credit", "Liabilities"),
    "10610": ("CL- Fidelity Bank Loan", "Credit", "Liabilities"),
    "10900": ("Bank - GLOBUS Bank", "Credit", "Liabilities"),
    "10934": ("CL-UBN-N3.3B Bridge", "Credit", "Liabilities"),
    "10938": ("CL-UBN-BOI-WC-N3.0B-2", "Credit", "Liabilities"),
    "10939": ("CL-UBN-BOI-TL-N3.5B-1", "Credit", "Liabilities"),
    "10994": ("Wema Bank11.1 Bn STF", "Credit", "Liabilities"),
    "10998": ("Wema Bank 3Bn STF", "Credit", "Liabilities"),
    "10999": ("Wema Bank 6.9Bn Term Loan", "Credit", "Liabilities"),

    # ── Equity (Credit-normal) ──
    "39003": ("Deposit for shares", "Credit", "Equity"),
    "39004": ("Share Capital", "Credit", "Equity"),
    "39005": ("Retained Earnings", "Credit", "Equity"),
    "39006": ("Capital reserve", "Credit", "Equity"),

    # ── Revenue (Credit-normal) ──
    "40000": ("Revenue - Vehicle Sales", "Credit", "Revenue"),
    "40200": ("Revenue - Spare Parts", "Credit", "Revenue"),
    "40500": ("Revenue - Labour Income-VI", "Credit", "Revenue"),
    "40700": ("Revenue - Labour Income-OJOTA", "Credit", "Revenue"),
    "40900": ("Revenue- Spare Parts-Ojota", "Credit", "Revenue"),
    "41000": ("Revenue - Spare Parts-VI", "Credit", "Revenue"),
    "24400": ("Revenue - Insurance Claim", "Credit", "Revenue"),
    "24950": ("Revenue - Warranty-Fee Service", "Credit", "Revenue"),
    "91320": ("Revenue  Int Sales- Veh. Mtce", "Credit", "Revenue"),
    "91969": ("Revenue - Labour Income-Abuja", "Credit", "Revenue"),
    "91970": ("Revenue - Spare Parts-Abuja", "Credit", "Revenue"),

    # ── COGS (Debit-normal) ──
    "50000": ("COGS - Vehicles", "Debit", "COGS"),
    "50100": ("COGS -Aftersales-Ojota", "Debit", "COGS"),
    "50200": ("COGS - Aftersales-VI", "Debit", "COGS"),
    "50700": ("COGS - Vehicles- Others", "Debit", "COGS"),
    "50800": ("COGS - Spare Parts- Ojota", "Debit", "COGS"),
    "51500": ("DE - SON Charge", "Debit", "COGS"),
    "57000": ("DE - Shipping Charge", "Debit", "COGS"),
    "57500": ("DE - Terminal Charge", "Debit", "COGS"),
    "58000": ("DE - Custom Duty", "Debit", "COGS"),
    "58200": ("DE - Transport Charge", "Debit", "COGS"),
    "58500": ("DE - Clearing Charge", "Debit", "COGS"),
    "59000": ("DE - Loading&Offloading", "Debit", "COGS"),
    "60800": ("COGS - Painting Expenses VI", "Debit", "COGS"),
    "60900": ("COGS - Painting Exp Ojota", "Debit", "COGS"),
    "62600": ("Discount - After Sales-VI", "Debit", "COGS"),
    "79100": ("Discount - Vehicle Sales", "Debit", "COGS"),
    "79200": ("Discount - After Sales-Ojota", "Debit", "COGS"),
    "91300": ("COGS -Aftersales Abuja", "Debit", "COGS"),

    # ── Operating Expenses (Debit-normal) ──
    "62000": ("IE - Bank Charges", "Debit", "Operating Expenses"),
    "63000": ("IE- Electricity Exp", "Debit", "Operating Expenses"),
    "66000": ("IE- Telephone expense", "Debit", "Operating Expenses"),
    "66100": ("IE- Salaries Expenses-Chinese", "Debit", "Operating Expenses"),
    "66300": ("IE- Staff Welfare Expenses", "Debit", "Operating Expenses"),
    "67700": ("IE- Audit Fees Expenses", "Debit", "Operating Expenses"),
    "69000": ("IE- Legal & Professional Exp", "Debit", "Operating Expenses"),
    "70000": ("IE- Diesel expenses", "Debit", "Operating Expenses"),
    "70500": ("IE- Travelling Exp Local", "Debit", "Operating Expenses"),
    "71000": ("IE- Entertainment Expenses", "Debit", "Operating Expenses"),
    "71500": ("IE- Office Expense", "Debit", "Operating Expenses"),
    "71520": ("IE- Internet Expense", "Debit", "Operating Expenses"),
    "71530": ("IE- Admin expense VI", "Debit", "Operating Expenses"),
    "71540": ("IE- Printing&Stationeries exp", "Debit", "Operating Expenses"),
    "74510": ("IE - Rent-VI", "Debit", "Operating Expenses"),
    "74530": ("IE - Rent- Ojota", "Debit", "Operating Expenses"),
    "74550": ("IE - Rent-Abuja", "Debit", "Operating Expenses"),
    "76000": ("IE - PAYE", "Debit", "Operating Expenses"),
    "76500": ("IE - Pension", "Debit", "Operating Expenses"),
    "77000": ("IE- Salaries expense", "Debit", "Operating Expenses"),
    "77100": ("IE - Leave Allowance", "Debit", "Operating Expenses"),
    "77500": ("IE - Wages Expenses", "Debit", "Operating Expenses"),
    "78000": ("IE - Security Expense", "Debit", "Operating Expenses"),
    "89500": ("IE- Management Remuneration", "Debit", "Operating Expenses"),
    "90500": ("IE- Medical Exp/Insurance Exp", "Debit", "Operating Expenses"),
    "90600": ("IE- Land use charge", "Debit", "Operating Expenses"),
    "91550": ("IE - Admin Expense", "Debit", "Operating Expenses"),

    # ── Depreciation (Debit-normal) ──
    "64510": ("IE- Dep- Furnitures & Fittings", "Debit", "Depreciation"),
    "64520": ("IE- Depreciation - Equipment", "Debit", "Depreciation"),
    "64530": ("IE- Depreciation-Motor Vehicle", "Debit", "Depreciation"),
    "64540": ("IE- Depreciation plant machine", "Debit", "Depreciation"),
    "64550": ("IE- Depreciation -Building", "Debit", "Depreciation"),
    "64560": ("ROU Amortization expense", "Debit", "Depreciation"),

    # ── Finance Costs (Debit-normal) ──
    "62050": ("IE - Interest on Loan", "Debit", "Finance Costs"),
    "64570": ("Interest expense on Lease Liability", "Debit", "Finance Costs"),

    # ── Tax (Debit-normal) ──
    "67000": ("IE- Income Tax expense", "Debit", "Tax"),
    "67100": ("IE- Education tax expense", "Debit", "Tax"),
    "90400": ("Deferred Tax Expenses", "Debit", "Tax"),

    # ── Other Income (Credit-normal) ──
    "40800": ("OI - Miscellaneous", "Credit", "Other Income"),
    "45500": ("OI - Miscellanous Income", "Credit", "Other Income"),

    # ── Other Gains/Losses ──
    "78500": ("DE - Forex Gain / Loss", "Debit", "Other Gains/Losses"),
    "91901": ("Impairment loss/(reversal)", "Debit", "Other Gains/Losses"),
}

NARRATIONS = [
    "Being amount paid for vehicle importation",
    "Invoice for motor vehicle sales to customer",
    "Payment received from customer",
    "Being cost of vehicle sold",
    "Custom duty payment on imported vehicles",
    "Shipping charges for vehicle import",
    "Terminal charges - Lagos port",
    "Clearing agent fees",
    "Transport of vehicles to showroom",
    "SON inspection charge",
    "Salary payment for the month",
    "Staff welfare expenses",
    "Office rent payment",
    "Electricity bill payment",
    "Diesel purchase for generator",
    "Bank charges for the month",
    "Audit fees payment",
    "Legal fees - contract review",
    "Vehicle insurance premium",
    "Marketing and promotional expenses",
    "IT support and maintenance",
    "Fuel for test drive vehicles",
    "Spare parts purchase - aftersales",
    "Customer deposit received",
    "Intercompany transfer",
    "Loan repayment - principal",
    "Interest payment on facility",
    "VAT remittance to FIRS",
    "WHT deduction remittance",
    "Pension contribution",
    "NSITF contribution",
    "ITF training levy",
    "Bonus payment",
    "Leave allowance",
    "Medical insurance premium",
    "Security services payment",
    "Water and sanitation",
    "Waste disposal services",
    "Printing and stationery",
    "Telephone and internet",
    "Travelling - local",
    "Travelling - offshore",
    "Hotel accommodation",
    "Overtime payment",
    "Consultancy fees",
    "Miscellaneous income received",
    "Interest income on deposit",
    "Forex gain on revaluation",
    "Depreciation - motor vehicles",
    "Depreciation - equipment",
    "Depreciation - building",
    "ROU amortization",
    "Lease interest expense",
    "Income tax expense",
    "Education tax expense",
    "Deferred tax adjustment",
    "Commission paid to agent",
    "Discount allowed to customer",
]

SOURCES = ["ACCENTURE", "ACCENTURE P.EYE", "ACCENTURE SMART", "DEBIT ADVICE",
           "CREDIT ADVICE", "CASH RECEIPT", "TRANSFER", "POS", "ONLINE",
           "CHEQUE", "BANK TRANSFER"]


# ═══════════════════════════════════════════════════════════════════════
# OPENING BALANCES (Jan 1 2024) — in millions, A = L + E
# ═══════════════════════════════════════════════════════════════════════
OPENING_BALANCES_M = {
    # ── Assets ──
    "10000": 280, "10100": 150, "10130": 1800, "10140": 2400, "10150": 650,
    "10165": 280, "10170": 85, "10171": 55, "10180": 900, "10185": 190,
    "10190": 520, "10200": 1100, "10210": 170, "10220": 780, "10260": 350,
    "10270": 220, "10400": 950, "10450": 520, "10700": 480,
    "11000": 4200, "11010": 650, "11070": 480, "11080": 350,
    "12000": 1800, "12100": 3200, "12200": 2600, "12500": 2100,
    "12900": 1650, "13000": 980,
    "14021": 95, "14030": 110, "14045": 85, "14050": 160,
    "14100": 120, "14800": 280, "19110": 380,
    "15000": 1100, "15100": 2200, "15200": 4800, "15500": 7500,
    "15501": 6200, "15700": 2400, "15960": 750,
    "17000": 520, "17100": 1100, "17200": 2300, "17700": 1200,
    "17800": 2800, "17900": 380,
    "19100": 200,
    "24310": 850, "24320": 420, "24330": 580, "24340": 310,

    # ── Liabilities ──
    "20000": 3500, "23300": 180, "23500": 260, "23600": 520,
    "23910": 450, "23920": 220, "23930": 290, "23940": 250,
    "24100": 680, "24600": 470, "24500": 520,
    "10145": 8500, "10155": 1400, "10160": 1850, "10290": 1050,
    "10610": 720, "10900": 480, "10934": 1950, "10938": 1700,
    "10939": 2050, "10994": 6500, "10998": 1800, "10999": 4200,

    # ── Equity ──
    "39003": 3200, "39004": 7500, "39006": 1800,
}


def month_end(y: int, m: int) -> date:
    return date(y, m, monthrange(y, m)[1])


class GLGenerator:
    def __init__(self, year: int = 2024, seed: int = 42):
        self.year = year
        self.rng = random.Random(seed)
        self.np_rng = np.random.RandomState(seed)
        self.rows: list[dict] = []
        self.txn_id = 10001

        # Account groups by section
        self.REV_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Revenue"]
        self.REV_W = [30, 15, 12, 10, 8, 6, 3, 3, 5, 4, 4]
        self.COGS_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "COGS"]
        self.OPEX_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Operating Expenses"]
        self.DEPR_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Depreciation"]
        self.FIN_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Finance Costs"]
        self.TAX_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Tax"]
        self.OI_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Other Income"]
        self.IG_KEYS = [k for k, v in ACCOUNTS.items() if v[2] == "Other Gains/Losses"]

        # Main bank accounts for cash offset
        self.CASH_KEYS = ["10130", "10140", "10150", "10180", "10200", "10400"]
        self.RECV_KEYS = ["11000", "11010"]
        self.PAY_KEYS = ["20000", "23300", "23500", "23600", "23910",
                         "23920", "23930", "23940", "24100", "24600"]
        self.INV_KEYS = ["12000", "12100", "12200", "12500", "12900", "13000"]

        # Depreciation accumulation accounts
        self.DEPR_ACC = {
            "64510": "17000", "64520": "17100", "64530": "17200",
            "64540": "17700", "64550": "17800", "64560": "17900",
        }

        # Monthly revenue plan (₦ millions) — seasonality: quiet Feb, strong Nov/Dec
        base_rev = 1050  # ₦1.05B/month base
        seasonality = [0.88, 0.78, 0.92, 0.96, 1.00, 1.05,
                       1.02, 0.97, 1.06, 1.12, 1.18, 1.22]
        self.monthly_rev = [round(base_rev * s) for s in seasonality]

    def emit(self, gl_code: int, amount_m: float, date_obj: date,
             side: str, narration: str = None, source: str = None):
        amount = round(amount_m * 1_000_000, 2)
        acct = ACCOUNTS.get(str(gl_code), ("Unknown", side.upper(), "Other"))
        debit = amount if side.upper() == "DEBIT" else 0
        credit = amount if side.upper() == "CREDIT" else 0
        narr = narration or self.rng.choice(NARRATIONS)
        src = source or self.rng.choice(SOURCES)
        self.rows.append({
            "Transaction_ID": self.txn_id,
            "GL_Code": int(gl_code),
            "GL_Account": acct[0],
            "Desc_Status": self.rng.choice(["Posted", "Posted", "Posted", "Posted", "Pending"]),
            "Doc_Date": date_obj,
            "Year": date_obj.year,
            "Month_No": date_obj.month,
            "Month_Name": date_obj.strftime("%B"),
            "Period": f"{date_obj.year}-{date_obj.month:02d}",
            "Source": src,
            "Reference": f"REF{self.rng.randint(100000, 999999)}",
            "Narration": narr,
            "Debit": debit,
            "Credit": credit,
            "Net": round(debit - credit, 2),
        })
        self.txn_id += 1

    def double(self, dr_code, cr_code, amount_m, date_obj, narr=None):
        amt = round(amount_m, 4)
        self.emit(dr_code, amt, date_obj, "DEBIT", narration=narr)
        self.emit(cr_code, amt, date_obj, "CREDIT", narration=narr)

    def add_opening_balances(self):
        ob_date = date(self.year, 1, 1)
        total_dr = 0
        total_cr = 0

        for code, amt_m in sorted(OPENING_BALANCES_M.items()):
            acct = ACCOUNTS.get(str(code), ("Unknown", "Debit", "Other"))
            normal = acct[1]
            if normal == "Debit":
                self.emit(code, amt_m, ob_date, "DEBIT",
                          narration="Opening balance b/f", source="OPENING BALANCE")
                total_dr += amt_m * 1_000_000
            else:
                self.emit(code, amt_m, ob_date, "CREDIT",
                          narration="Opening balance b/f", source="OPENING BALANCE")
                total_cr += amt_m * 1_000_000

        # Compute RE plug: A - L - Other_Equity
        sum_dr_assets = sum(amt for code, amt in OPENING_BALANCES_M.items()
                           if ACCOUNTS.get(str(code), ("", "Debit"))[1] == "Debit")
        sum_cr_liab_eq = sum(amt for code, amt in OPENING_BALANCES_M.items()
                             if ACCOUNTS.get(str(code), ("", "Credit"))[1] == "Credit")
        re_plug = sum_dr_assets - sum_cr_liab_eq
        self.emit("39005", re_plug, ob_date, "CREDIT",
                  narration="Opening balance b/f - Retained Earnings", source="OPENING BALANCE")
        total_cr += re_plug * 1_000_000

        print(f"  Opening Balances: Dr = {total_dr:,.2f}  Cr = {total_cr:,.2f}  Diff = {total_dr - total_cr:,.2f}")
        assert round(total_dr) == round(total_cr), f"OB unbalanced! Dr={total_dr}, Cr={total_cr}"

    def generate_month(self, m: int):
        me = month_end(self.year, m)
        rev_m = self.monthly_rev[m - 1]

        # ── Revenue (one journal per revenue GL, split cash/AR) ──
        n_rev = self.rng.randint(8, 14)
        rev_pool = self.rng.choices(self.REV_KEYS, weights=self.REV_W[:len(self.REV_KEYS)], k=n_rev)
        for rk in rev_pool:
            amt = rev_m / n_rev * self.rng.uniform(0.7, 1.3)
            cash_or_recv = self.rng.choice(self.CASH_KEYS + self.RECV_KEYS)
            self.double(cash_or_recv, rk, amt, me)

        # ── COGS (~62-68% of revenue) ──
        cogs_pct = self.rng.uniform(0.62, 0.68)
        cogs_total = rev_m * cogs_pct
        n_cogs = self.rng.randint(6, 10)
        cogs_pool = self.rng.choices(self.COGS_KEYS, k=n_cogs)
        for ck in cogs_pool:
            amt = cogs_total / n_cogs * self.rng.uniform(0.6, 1.4)
            inv_or_pay = self.rng.choice(self.INV_KEYS + self.PAY_KEYS)
            self.double(ck, inv_or_pay, amt, me)

        # ── Operating Expenses (~16-20% of revenue) ──
        opex_pct = self.rng.uniform(0.16, 0.20)
        opex_total = rev_m * opex_pct
        n_opex = self.rng.randint(15, 25)
        opex_pool = self.rng.choices(self.OPEX_KEYS, k=n_opex)
        for ox in opex_pool:
            amt = opex_total / n_opex * self.rng.uniform(0.5, 1.5)
            pay_or_cash = self.rng.choice(self.PAY_KEYS + self.CASH_KEYS)
            self.double(ox, pay_or_cash, amt, me)

        # ── Depreciation (~2.5-3.5% of revenue) ──
        depr_pct = self.rng.uniform(0.025, 0.035)
        depr_total = rev_m * depr_pct
        n_depr = self.rng.randint(3, 6)
        depr_pool = self.rng.choices(self.DEPR_KEYS, k=n_depr)
        for dk in depr_pool:
            amt = depr_total / n_depr
            acc = self.DEPR_ACC[dk]
            self.double(dk, acc, amt, me)

        # ── Finance Costs (~2-3% of revenue) ──
        fin_pct = self.rng.uniform(0.02, 0.03)
        fin_total = rev_m * fin_pct
        n_fin = self.rng.randint(2, 4)
        for _ in range(n_fin):
            fk = self.rng.choice(self.FIN_KEYS)
            amt = fin_total / n_fin * self.rng.uniform(0.7, 1.3)
            self.double(fk, self.rng.choice(self.CASH_KEYS), amt, me)

        # ── Other Income (small, intermittent) ──
        if self.rng.random() < 0.70:
            oi_key = self.rng.choice(self.OI_KEYS)
            amt_oi = self.rng.uniform(5, 45)
            self.double(self.rng.choice(self.CASH_KEYS), oi_key, amt_oi, me)

        # ── Other Gains/Losses (forex, impairment) ──
        if self.rng.random() < 0.35:
            ig_key = self.rng.choice(self.IG_KEYS)
            amt_ig = self.rng.uniform(2, 20)
            if self.rng.random() < 0.5:
                self.double(ig_key, self.rng.choice(self.CASH_KEYS), amt_ig, me)
            else:
                self.double(self.rng.choice(self.CASH_KEYS), ig_key, amt_ig, me)

        # ── Customer collections (clear some AR) ──
        collection = rev_m * 0.40 * self.rng.uniform(0.40, 0.65)
        self.double(self.rng.choice(self.CASH_KEYS), "11000", collection, me,
                     narr="Customer collections")

        # ── Supplier payments (pay down AP) ──
        payment = rev_m * opex_pct * 0.50 * self.rng.uniform(0.50, 0.70)
        self.double("20000", self.rng.choice(self.CASH_KEYS), payment, me,
                     narr="Supplier settlements")

    def add_year_end_adjustments(self):
        """Add year-end tax accrual and closing entries."""
        dec_end = month_end(self.year, 12)

        # Compute annual PBT from all P&L transactions
        rev_total = sum(r["Credit"] for r in self.rows
                       if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "Revenue"
                       and r["Period"].startswith(str(self.year)))
        cogs_total = sum(r["Debit"] for r in self.rows
                        if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "COGS"
                        and r["Period"].startswith(str(self.year)))
        opex_total = sum(r["Debit"] for r in self.rows
                        if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "Operating Expenses"
                        and r["Period"].startswith(str(self.year)))
        depr_total = sum(r["Debit"] for r in self.rows
                        if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "Depreciation"
                        and r["Period"].startswith(str(self.year)))
        fin_total = sum(r["Debit"] for r in self.rows
                       if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "Finance Costs"
                       and r["Period"].startswith(str(self.year)))
        oi_total = sum(r["Credit"] for r in self.rows
                      if ACCOUNTS.get(str(r["GL_Code"]), ("", "", ""))[2] == "Other Income"
                      and r["Period"].startswith(str(self.year)))

        pbt = rev_total - cogs_total - opex_total - depr_total - fin_total + oi_total
        tax = max(0, pbt) * 0.30

        # Income tax accrual
        self.double("67000", "23910", tax / 1_000_000, dec_end,
                     narr="Income tax expense - year end accrual")

        # Education tax (2% of assessable profit)
        edt = max(0, pbt) * 0.02
        self.double("67100", "23910", edt / 1_000_000, dec_end,
                     narr="Education tax expense")

        # Deferred tax adjustment (~5% of current tax)
        dtax = tax * 0.05
        self.double("90400", "19100", dtax / 1_000_000, dec_end,
                     narr="Deferred tax adjustment")

        print(f"  Year-end: PBT={pbt/1e6:,.0f}M  Tax={tax/1e6:,.0f}M  EDT={edt/1e6:,.0f}M")

    def add_dirty_data(self):
        """Add realistic dirty rows for testing the cleaner.

        Each dirty pair is still double-entry balanced so the TB nets to
        zero, but the data quality issues (wrong date format, empty
        narration, trailing spaces in Source, unmapped GL codes, future
        dates) exercise every cleaner rule.
        """
        year = self.year

        def _push(gl_code, amount_m, doc_date, side, narration="", source="MANUAL"):
            """Manual row append that accepts string dates."""
            amount = round(amount_m * 1_000_000, 2)
            acct = ACCOUNTS.get(str(gl_code), ("Unknown", side.upper(), "Other"))
            debit = amount if side.upper() == "DEBIT" else 0
            credit = amount if side.upper() == "CREDIT" else 0

            # Handle string dates
            if isinstance(doc_date, str):
                dt = doc_date
                y = int(doc_date.split("/")[-1]) if "/" in doc_date else year
                m_str = doc_date.split("/")[1] if "/" in doc_date else "1"
                m = int(m_str)
                period = f"{y}-{m:02d}"
            else:
                dt = doc_date
                y = doc_date.year
                m = doc_date.month
                period = f"{y}-{m:02d}"

            self.rows.append({
                "Transaction_ID": self.txn_id,
                "GL_Code": int(gl_code),
                "GL_Account": acct[0],
                "Desc_Status": "Pending" if not narration else "Posted",
                "Doc_Date": dt,
                "Year": y,
                "Month_No": m,
                "Month_Name": date(y, m, 1).strftime("%B") if isinstance(dt, date) else "",
                "Period": period,
                "Source": source,
                "Reference": f"REF{self.rng.randint(100000, 999999)}",
                "Narration": narration,
                "Debit": debit,
                "Credit": credit,
                "Net": round(debit - credit, 2),
            })
            self.txn_id += 1

        # Pair 1: Revenue with empty narration + wrong date format on counterpart
        _push(40000, 85, date(year, 6, 15), "CREDIT",
              narration="", source="ACCENTURE")
        _push(11000, 85, "15/06/2025", "DEBIT",  # wrong date format
              narration="Revenue counterpart", source="ACCENTURE")

        # Pair 2: Salary with trailing space in Source + empty narration
        _push(77000, 45, date(year, 3, 15), "DEBIT",
              narration="", source="ACCENTURE  ")  # trailing spaces
        _push(20000, 45, date(year, 3, 15), "CREDIT",
              narration="Salary accrual counterpart", source="ACCENTURE")

        # Pair 3: Bank charges with future date
        _push(62000, 0.75, date(year + 1, 1, 15), "DEBIT",
              narration="", source="MANUAL")
        _push(10130, 0.75, date(year + 1, 1, 15), "CREDIT",
              narration="Bank charges counterpart", source="MANUAL")

        # Pair 4: Unmapped GL code (suspense) + counterpart
        _push(80100, 5, date(year, 9, 10), "DEBIT",
              narration="Suspense entry - needs investigation", source="MANUAL")
        _push(99999, 5, date(year, 9, 10), "CREDIT",
              narration="System clearing offset", source="MANUAL")

    def build(self):
        print(f"Generating {self.year} GL data...")
        print("  Adding opening balances...")
        self.add_opening_balances()

        print("  Generating monthly transactions...")
        for m in range(1, 13):
            self.generate_month(m)
            rev = self.monthly_rev[m - 1]
            print(f"    Month {m:2d}: Revenue ~₦{rev:,.0f}M")

        print("  Adding year-end adjustments...")
        self.add_year_end_adjustments()

        print("  Adding dirty data rows...")
        self.add_dirty_data()

        return pd.DataFrame(self.rows)


def write_workbook(df: pd.DataFrame, out_path: Path) -> None:
    wb = Workbook()

    # Sheet 1: GL_Clean
    ws = wb.active
    ws.title = "GL_Clean"
    cols = ["Transaction_ID", "GL_Code", "GL_Account", "Desc_Status", "Doc_Date",
            "Year", "Month_No", "Month_Name", "Period",
            "Source", "Reference", "Narration",
            "Debit", "Credit", "Net"]
    ws.append(cols)
    for _, r in df.iterrows():
        ws.append([r[c] for c in cols])

    # Sheet 2: Account_Summary
    summary = wb.create_sheet("Account_Summary")
    summary.append(["GL_Code", "GL_Account", "Desc_Status",
                     "Opening_Debit", "Opening_Credit", "Opening_Net",
                     "Txn_Debit", "Txn_Credit",
                     "Src_Total_Debit", "Src_Total_Credit", "Src_Ending_Net"])

    # Per-account totals
    txn_dr = defaultdict(float)
    txn_cr = defaultdict(float)
    for _, r in df.iterrows():
        code = str(r["GL_Code"])
        txn_dr[code] += r["Debit"]
        txn_cr[code] += r["Credit"]

    all_codes = set(OPENING_BALANCES_M.keys()) | set(txn_dr.keys()) | set(txn_cr.keys())
    for code in sorted(all_codes):
        acct = ACCOUNTS.get(code, ("Unknown", "Debit", "Other"))
        name = acct[0]
        opening_m = OPENING_BALANCES_M.get(code, 0)
        if acct[1] == "Debit":
            op_dr = opening_m * 1_000_000
            op_cr = 0
        else:
            op_dr = 0
            op_cr = opening_m * 1_000_000

        dr = txn_dr.get(code, 0)
        cr = txn_cr.get(code, 0)
        summary.append([
            code, name, "Matched",
            round(op_dr, 2), round(op_cr, 2), round(op_dr - op_cr, 2),
            round(dr, 2), round(cr, 2),
            round(op_dr + dr, 2), round(op_cr + cr, 2),
            round((op_dr + dr) - (op_cr + cr), 2),
        ])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)


def main():
    gen = GLGenerator(year=2024, seed=42)
    df = gen.build()

    # Verify
    total_dr = df["Debit"].sum()
    total_cr = df["Credit"].sum()
    print(f"\n=== Final Stats ===")
    print(f"  Total rows:     {len(df):,}")
    print(f"  Unique GL codes: {df['GL_Code'].nunique()}")
    dates = pd.to_datetime(df["Doc_Date"], errors="coerce")
    print(f"  Date range:      {dates.min()} to {dates.max()}")
    print(f"  Total Debit:     {total_dr:,.2f}")
    print(f"  Total Credit:    {total_cr:,.2f}")
    print(f"  Net:             {total_dr - total_cr:,.2f}")

    # Revenue check
    rev_rows = df[df["GL_Code"].astype(str).isin(
        [k for k, v in ACCOUNTS.items() if v[2] == "Revenue"])]
    print(f"  Revenue total:   {rev_rows['Credit'].sum():,.2f}")

    # Write
    out = Path("Sample GL_complete_dirty.xlsx")
    write_workbook(df, out)
    print(f"\nSaved to {out}")


if __name__ == "__main__":
    main()
