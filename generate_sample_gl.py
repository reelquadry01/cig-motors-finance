import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

# Full chart of accounts from Statement_Mapping
ACCOUNTS = {
    # Revenue
    '40000': ('Revenue - Vehicle Sales', 'Credit'),
    '40200': ('Revenue - Spare Parts', 'Credit'),
    '40500': ('Revenue - Labour Income-VI', 'Credit'),
    '40700': ('Revenue - Labour Income-OJOTA', 'Credit'),
    '40900': ('Revenue- Spare Parts-Ojota', 'Credit'),
    '41000': ('Revenue - Spare Parts-VI', 'Credit'),
    '24400': ('Revenue - Insurance Claim', 'Credit'),
    '24950': ('Revenue - Warranty-Fee Service', 'Credit'),
    '91320': ('Revenue  Int Sales- Veh. Mtce', 'Credit'),
    '91969': ('Revenue - Labour Income-Abuja', 'Credit'),
    '91970': ('Revenue - Spare Parts-Abuja', 'Credit'),
    # COGS
    '50000': ('COGS - Vehicles', 'Debit'),
    '50100': ('COGS -Aftersales-Ojota', 'Debit'),
    '50200': ('COGS - Aftersales-VI', 'Debit'),
    '50700': ('COGS - Vehicles- Others', 'Debit'),
    '50800': ('COGS - Spare Parts- Ojota', 'Debit'),
    '51500': ('DE - SON Charge', 'Debit'),
    '57000': ('DE - Shipping Charge', 'Debit'),
    '57500': ('DE - Terminal Charge', 'Debit'),
    '58000': ('DE - Custom Duty', 'Debit'),
    '58200': ('DE - Transport Charge', 'Debit'),
    '58300': ('DE - Service Charge', 'Debit'),
    '58400': ('DE - Valuation Charge', 'Debit'),
    '58500': ('DE - Clearing Charge', 'Debit'),
    '59000': ('DE - Loading&Offloading', 'Debit'),
    '60600': ('DE- Sublet Exp VI', 'Debit'),
    '60800': ('COGS - Painting Expenses VI', 'Debit'),
    '60900': ('COGS - Painting Exp Ojota', 'Debit'),
    '61400': ('DE- Airport Exp Parts', 'Debit'),
    '62600': ('Discount - After Sales-VI', 'Debit'),
    '62650': ('Discount - After Sales-Abuja', 'Debit'),
    '63500': ('DE- Commissions and Fees Exp', 'Debit'),
    '64000': ('DE- Vehicle Transfer Exp', 'Debit'),
    '65100': ('DE - PR Expense', 'Debit'),
    '65200': ('DE- Repairs & Maintenance- SKD', 'Debit'),
    '65500': ('DE - Parts Supplied', 'Debit'),
    '67200': ('DE- Towing Expenses', 'Debit'),
    '67410': ('DE- Vendor Registration Exp', 'Debit'),
    '67500': ('DE- Insurance Exp(Veh/Others)', 'Debit'),
    '67600': ('DE- Vehicle Registration exp', 'Debit'),
    '68300': ('DE- Workshop Exp- Ojota', 'Debit'),
    '71700': ('DE- Admin Expense (SKD)& Ojota', 'Debit'),
    '78500': ('DE - Forex Gain / Loss', 'Debit'),
    '79100': ('Discount - Vehicle Sales', 'Debit'),
    '79200': ('Discount - After Sales-Ojota', 'Debit'),
    '91150': ('DE - Foot Mat - Fire Extinguis', 'Debit'),
    '91300': ('COGS -Aftersales Abuja', 'Debit'),
    '91953': ('DE- Demurage Expenses', 'Debit'),
    '91957': ('DE- Agent Reimbursement-Comm', 'Debit'),
    # Operating Expenses
    '17500': ('IE- Recruitment/ Training', 'Debit'),
    '60100': ('IE - Business Pro', 'Debit'),
    '60200': ('IE - Airport Exp', 'Debit'),
    '60300': ('IE - Courier Exp', 'Debit'),
    '60500': ('IE - Hotel & Acco Exp', 'Debit'),
    '61000': ('IE - Building Renovation', 'Debit'),
    '61100': ('IE - Feeding Allowance Chinese', 'Debit'),
    '61200': ('IE - Feeding Allowance Guest', 'Debit'),
    '61300': ('IE- Feeding Allowance-Nigeria', 'Debit'),
    '61500': ('IE - Bad Debt Expense', 'Debit'),
    '62000': ('IE - Bank Charges', 'Debit'),
    '62100': ('IE - Fuel Exp - Aftersales', 'Debit'),
    '62150': ('IE- Fuel Exp - Fuel Card', 'Debit'),
    '62200': ('IE- Fuel Exp - New Cars', 'Debit'),
    '62300': ('IE-Fuel Exp - Ojota Workshop', 'Debit'),
    '62400': ('IE- Fuel Expenses-SKD Vehicles', 'Debit'),
    '62500': ('IE - Visa Exp', 'Debit'),
    '63000': ('IE- Electricity Exp', 'Debit'),
    '63100': ('IE- Generator Rep & Maint.VI', 'Debit'),
    '63300': ('IE- IT Repairs&Maintenance Exp', 'Debit'),
    '64100': ('IE - Outstation Allowance', 'Debit'),
    '64200': ('IE - Overtime Expenses', 'Debit'),
    '64300': ('IE - Photo & Video Expenses', 'Debit'),
    '64400': ('IE - Police Escort Expenses', 'Debit'),
    '65000': ('IE- Dues and Subscriptions Exp', 'Debit'),
    '65300': ('IE-Repairs&Maint.Exp-VI', 'Debit'),
    '65400': ('IE- Repairs&Maint.Exp-Showroom', 'Debit'),
    '66000': ('IE- Telephone expense', 'Debit'),
    '66100': ('IE- Salaries Expenses-Chinese', 'Debit'),
    '66300': ('IE- Staff Welfare Expenses', 'Debit'),
    '66500': ('IE- Corporate gift Expense', 'Debit'),
    '67000': ('IE- Income Tax expense', 'Debit'),
    '67100': ('IE- Education tax expense', 'Debit'),
    '67400': ('IE- Travelling Exp Offshore', 'Debit'),
    '67700': ('IE- Audit Fees Expenses', 'Debit'),
    '68500': ('IE- Waste disposal expense', 'Debit'),
    '69000': ('IE- Legal & Professional Exp', 'Debit'),
    '69500': ('IE- Licenses Expense', 'Debit'),
    '70000': ('IE- Diesel expenses', 'Debit'),
    '70500': ('IE- Travelling Exp Local', 'Debit'),
    '71000': ('IE- Entertainment Expenses', 'Debit'),
    '71200': ('IE- Donation/Sponsorship', 'Debit'),
    '71500': ('IE- Office Expense', 'Debit'),
    '71510': ('IE- Admin Expense Plot 7', 'Debit'),
    '71520': ('IE- Internet Expense', 'Debit'),
    '71530': ('IE- Admin expense VI', 'Debit'),
    '71540': ('IE- Printing&Stationeries exp', 'Debit'),
    '71550': ('IE- Admin expense- Ogba', 'Debit'),
    '71560': ('IE-Admin expense-Alausa', 'Debit'),
    '72000': ('IE - Tax Exp', 'Debit'),
    '72500': ('IE- Penalties and Fines Exp', 'Debit'),
    '73100': ('IE - Other Levies', 'Debit'),
    '73400': ('IE- Eko Hotel Accomodation Exp', 'Debit'),
    '74500': ('IE- Rent or Lease payment', 'Debit'),
    '74510': ('IE - Rent-VI', 'Debit'),
    '74520': ('IE - Rent - PH', 'Debit'),
    '74530': ('IE - Rent- Ojota', 'Debit'),
    '74540': ('IE -Rent-Staff Accomodat(1004)', 'Debit'),
    '74550': ('IE - Rent-Abuja', 'Debit'),
    '74551': ('IE-Rent Ado Ekiti', 'Debit'),
    '74560': ('IE-Rent Oregun', 'Debit'),
    '74570': ('IE-Rent Gombe', 'Debit'),
    '74580': ('IE - Service Charge', 'Debit'),
    '76000': ('IE - PAYE', 'Debit'),
    '76100': ('IE - Consultancy Fees', 'Debit'),
    '76500': ('IE - Pension', 'Debit'),
    '77000': ('IE- Salaries expense', 'Debit'),
    '77100': ('IE - Leave Allowance', 'Debit'),
    '77500': ('IE - Wages Expenses', 'Debit'),
    '77600': ('IE - Bonus', 'Debit'),
    '78000': ('IE - Security Expense', 'Debit'),
    '89000': ('IE - Other Expenses', 'Debit'),
    '89500': ('IE- Management Remuneration', 'Debit'),
    '89550': ('IE- Fuel expenses - Others', 'Debit'),
    '89600': ('IE- Toll gate & parking fee', 'Debit'),
    '90500': ('IE- Medical Exp/Insurance Exp', 'Debit'),
    '90600': ('IE- Land use charge', 'Debit'),
    '90800': ('IE- LC cash back', 'Debit'),
    '91200': ('IE- CIG staff award expense', 'Debit'),
    '91360': ('IE-Management Exp CEO OFFICE', 'Debit'),
    '91400': ('IE-Water expenses', 'Debit'),
    '91520': ('IE-Industrial Training(ITF)', 'Debit'),
    '91530': ('IE-Nig Soc Ins Trust(NSITF)', 'Debit'),
    '91550': ('IE - Admin Expense', 'Debit'),
    '91600': ('IE - Admin Expenses-Abuja', 'Debit'),
    '91650': ('IE -Rent Heritage Court', 'Debit'),
    '91959': ('DE -Agency Fee', 'Debit'),
    '91960': ('IE- BOI Expenses', 'Debit'),
    '91962': ('IE - Expired Permit', 'Debit'),
    '91965': ('IE- Vehicles Repairs & Maintai', 'Debit'),
    '91966': ('IE - Employer Pension', 'Debit'),
    '91968': ('IE - Uniforms', 'Debit'),
    # Depreciation
    '64510': ('IE- Dep- Furnitures & Fittings', 'Debit'),
    '64520': ('IE- Depreciation - Equipment', 'Debit'),
    '64530': ('IE- Depreciation-Motor Vehicle', 'Debit'),
    '64540': ('IE- Depreciation plant machine', 'Debit'),
    '64550': ('IE- Depreciation -Building', 'Debit'),
    '64560': ('ROU Amortization expense', 'Debit'),
    '64570': ('Interest expense on Lease Liability', 'Debit'),
    # Finance Costs
    '62050': ('IE - Interest on Loan', 'Debit'),
    '62060': ('IE - Interest Income on Loan', 'Debit'),
    # Tax
    '67000': ('IE- Income Tax expense', 'Debit'),
    '67100': ('IE- Education tax expense', 'Debit'),
    '72000': ('IE - Tax Exp', 'Debit'),
    '90400': ('Deferred Tax Expenses', 'Debit'),
    '91900': ('IE- Tax Service Expenses', 'Debit'),
    # Other Income
    '40800': ('OI - Miscellaneous', 'Debit'),
    '45500': ('OI - Miscellanous Income', 'Debit'),
    # Other Gains/Losses
    '91901': ('Impairment loss/(reversal)', 'Debit'),
    # Assets - Cash
    '10000': ('Cash in Hand - Naira-1', 'Debit'),
    '10100': ('Cash in Hand - Naira - 2', 'Debit'),
    '10120': ('CL Zenith Bank O/D', 'Debit'),
    '10130': ('Bank - Zenith Bank Acct-2', 'Debit'),
    '10140': ('Bank - Access Bank', 'Debit'),
    '10150': ('Bank - Polaris Bank', 'Debit'),
    '10165': ('Bank- Union Bank (USD)', 'Debit'),
    '10170': ('Cash in Hand - US$', 'Debit'),
    '10171': ('Cash in Hand - Euro', 'Debit'),
    '10180': ('Bank - Stanbic Bank', 'Debit'),
    '10185': ('Bank - Stanbic ( USD)', 'Debit'),
    '10190': ('Bank - Fidelity Bank', 'Debit'),
    '10200': ('Bank - GTB', 'Debit'),
    '10210': ('Bank - Zenith Bank (USD)', 'Debit'),
    '10220': ('Bank - First Bank', 'Debit'),
    '10221': ('Nova Bank', 'Debit'),
    '10230': ('Bank - Access Bank (USD)', 'Debit'),
    '10240': ('Bank - ECO Bank', 'Debit'),
    '10250': ('Bank - SCB Bank', 'Debit'),
    '10260': ('Bank - FCMB', 'Debit'),
    '10270': ('Bank - Sterling Bank', 'Debit'),
    '10271': ('Bank - Sterling Aternative', 'Debit'),
    '10280': ('Bank - Access - Diamond Bank', 'Debit'),
    '10300': ('Bank - Heritage Bank', 'Debit'),
    '10310': ('Bank - Jaiz Bank', 'Debit'),
    '10315': ('Bank - Union Project Account', 'Debit'),
    '10316': ('Bank - Union DSRA Acct', 'Debit'),
    '10317': ('Bank - Union Bank Sub Account', 'Debit'),
    '10320': ('Bank - Optimus Bank', 'Debit'),
    '10330': ('Bank - Premium Trust Bank', 'Debit'),
    '10340': ('Coronation Bank', 'Debit'),
    '10350': ('Bank - Wema Bank Ops 2', 'Debit'),
    '10400': ('Bank - UBA', 'Debit'),
    '10450': ('Bank - UBA Acct 2', 'Debit'),
    '10451': ('Bank - UBA Benue State Account', 'Debit'),
    '10452': ('Bank- UBA Acct 3', 'Debit'),
    '10500': ('Bank - Providus Bank', 'Debit'),
    '10520': ('Bank - Keystone Bank', 'Debit'),
    '10550': ('Bank - Lotus Bank', 'Debit'),
    '10600': ('Bank - Heritage Mini Account', 'Debit'),
    '10700': ('Bank - WEMA Bank (Operation)', 'Debit'),
    '10710': ('Bank - Wema Bank (USD)', 'Debit'),
    '10750': ('Bank - Wema Bank - CFF', 'Debit'),
    '10760': ('Bank - Wema & BOI', 'Debit'),
    '10800': ('Bank - Sun Trust', 'Debit'),
    '10855': ('Bank - TITAN Trust Bank-2', 'Debit'),
    # Assets - Receivables
    '11000': ('CA - Accounts Receivable', 'Debit'),
    '11010': ('CA - Other Receivables', 'Debit'),
    '11070': ('CA - VAT Receivable', 'Debit'),
    '11080': ('CA - WHT Receivable', 'Debit'),
    '11085': ('CA - WHT Govt Receivable', 'Debit'),
    '11090': ('CA - WHT Cr Notes Receivable', 'Debit'),
    # Assets - Inventory
    '12000': ('Inventory - GN8', 'Debit'),
    '12100': ('Inventory- New & Used Cars-GA3', 'Debit'),
    '12200': ('Inventory - New Cars-GS4', 'Debit'),
    '12210': ('Inventory-Used Car GS4', 'Debit'),
    '12250': ('Inventory - New Cars-GA4', 'Debit'),
    '12260': ('Inventory - Used Cars-GA4', 'Debit'),
    '12300': ('Inventory - New Cars-GS5S', 'Debit'),
    '12400': ('Inventory - New Cars-GS8', 'Debit'),
    '12430': ('Inventory - M3 Bus', 'Debit'),
    '12500': ('Inventory-AutoParts- VI', 'Debit'),
    '12550': ('Inventory-AutoParts- Warehouse', 'Debit'),
    '12600': ('Inventory - DFAC 5 TON', 'Debit'),
    '12700': ('Inventory - DFAC 7 TON', 'Debit'),
    '12750': ('Inventory NewCar J5P Truck', 'Debit'),
    '12850': ('Inventory New car J6P TRUCK', 'Debit'),
    '12900': ('Inventory - Auto Parts-Ojota', 'Debit'),
    '13000': ('Inventory - Spare Parts-Abuja', 'Debit'),
    '13650': ('Inventory - Used Cars-GS8', 'Debit'),
    '13700': ('Inventory - New Cars-GS3', 'Debit'),
    '13710': ('Inventory-Used Car GS3', 'Debit'),
    '13800': ('Inventory - DONFENG 1 TON', 'Debit'),
    '13850': ('Inventory-JMC Pick-UpVgus3-2WD', 'Debit'),
    '13860': ('Inventory-JMC Pick-UpVgus3-4WD', 'Debit'),
    '13870': ('Inventory-JMC Pick-Up Vigus 7', 'Debit'),
    '13880': ('Inventory-JMC PickUpVIGUS1-2WD', 'Debit'),
    '13890': ('Inventory-M5 BUS-Ambulance', 'Debit'),
    '13900': ('Inventory-MINI EV E50', 'Debit'),
    '13910': ('Inventory-Bingo EV E260', 'Debit'),
    '13920': ('Inventory - YEP E260S', 'Debit'),
    '13930': ('Inventory - MINI BUS', 'Debit'),
    '13940': ('Inventory - Cargo Truck', 'Debit'),
    # Assets - Prepayments
    '14021': ('Prepaid - Rent- PH', 'Debit'),
    '14022': ('Prepaid - Rent-Frank Court', 'Debit'),
    '14023': ('Prepaid - Rents Plot 7', 'Debit'),
    '14024': ('Prepaid - Rent - FLT 401 1004', 'Debit'),
    '14025': ('Prepaid - Rent Lazarus', 'Debit'),
    '14027': ('Prepaid - Rent FLT 402 C 1004', 'Debit'),
    '14028': ('Prepaid - Rent - Heritage', 'Debit'),
    '14030': ('Prepaid - Rent - Abuja', 'Debit'),
    '14031': ('Prepaid - Rent FLT 513 B 1004', 'Debit'),
    '14032': ('Prepaid Rent Ekiti', 'Debit'),
    '14045': ('Prepaid - Rent - Ojota', 'Debit'),
    '14046': ('Prepaid Rent Oregun Ground', 'Debit'),
    '14048': ('Prepaid Rent Gombe', 'Debit'),
    '14050': ('Prepaid - General', 'Debit'),
    '14080': ('CA - Choice International', 'Debit'),
    '14100': ('CA - Employee Advances', 'Debit'),
    '14300': ('CA-Customers Advance AfterSale', 'Debit'),
    '14755': ('CA - Barter - Maryland', 'Debit'),
    '14786': ('CA - Barter - Receivables', 'Debit'),
    '14800': ('CA - Customer Advances Sales', 'Debit'),
    '19110': ('CA - Input VAT', 'Debit'),
    '19200': ('CA-Provision for ECL', 'Debit'),
    # Assets - Fixed Assets
    '15000': ('FA - Furniture & Fittings', 'Debit'),
    '15100': ('FA - Equipment', 'Debit'),
    '15200': ('FA - Motor Vehicle', 'Debit'),
    '15500': ('FA - Land', 'Debit'),
    '15501': ('FA - Building', 'Debit'),
    '15600': ('FA - GAC Ogba Construction', 'Debit'),
    '15700': ('FA - Plant & Machinery', 'Debit'),
    '15800': ('FA - Plot 7 Ligali Ayorinde', 'Debit'),
    '15900': ('FA-Plot1597-Abuja-AC Okoch', 'Debit'),
    '15950': ('FA-Plot1597-Abuja-AC Okoch 2', 'Debit'),
    '15960': ('Right of Use', 'Debit'),
    # Assets - Acc Depreciation
    '17000': ('Acc Depreciation - Furniture', 'Debit'),
    '17100': ('Acc Depreciation - Equipment', 'Debit'),
    '17200': ('Acc Depreciation-Motor Vehicle', 'Debit'),
    '17700': ('Acc Depreciation- P&M', 'Debit'),
    '17800': ('Acc Depreciation- Building', 'Debit'),
    '17900': ('Accum Amortization- ROU', 'Debit'),
    # Deferred Tax
    '19100': ('CA - Deferred Tax Assets|Liabi', 'Debit'),
    # Intercompany
    '24200': ('CL-Intercompany-Lontor', 'Debit'),
    '24250': ('CL-Intercompany-E-Home', 'Debit'),
    '24300': ('CL - Intercompany - CABC', 'Debit'),
    '24310': ('CA - Intercompany - GAC MOTORS', 'Debit'),
    '24320': ('CA - China Good Car Nig Ltd', 'Debit'),
    '24330': ('CA- China Good Leasing Co. Ltd', 'Debit'),
    '24340': ('CA- Mimiso Co Nig Ltd', 'Debit'),
    '24350': ('CA - LAGRIDE Nig Limited', 'Debit'),
    '24360': ('CA- CIG Real Estate Co Ltd', 'Debit'),
    '24380': ('CA - We Ride Nig Ltd', 'Debit'),
    # Liabilities - Payables
    '20000': ('CL - Accounts Payable', 'Credit'),
    '23300': ('CL - Audit Fees Payable', 'Credit'),
    '23500': ('CL - Witholding Tax Payable', 'Credit'),
    '23600': ('CA - VAT Payable/Output', 'Credit'),
    '23610': ('CA -VAT Deducted @ Source', 'Debit'),
    '23660': ('CL - VAT on After Sales', 'Debit'),
    '23900': ('CL - Income Taxes Payable', 'Debit'),
    '23910': ('CL - Salary Control', 'Credit'),
    '23920': ('CL - Employees Pension Payable', 'Credit'),
    '23930': ('CL - Payee Payable', 'Credit'),
    '23940': ('CL - Employers pension payable', 'Credit'),
    '24100': ('CL - Deposits', 'Credit'),
    '24600': ('CL - Accrued Expenses', 'Credit'),
    '24900': ('CL - Educational Tax payable', 'Debit'),
    '24910': ('CL - ITF Payable', 'Credit'),
    '24920': ('CL - NSITF Payable', 'Credit'),
    '24500': ('Lease Liability', 'Credit'),
    # Liabilities - Borrowings
    '10145': ('Access Bank 14Bn', 'Credit'),
    '10155': ('CL- Polaris bank Loan', 'Credit'),
    '10160': ('Bank - Union Bank', 'Credit'),
    '10290': ('CL- UBA-Contract Financing', 'Credit'),
    '10453': ('CL-UBA LOAN(GOMBE STATE)', 'Credit'),
    '10610': ('CL- Fidelity Bank Loan', 'Credit'),
    '10900': ('Bank - GLOBUS Bank', 'Credit'),
    '10902': ('CL-GLOBUS BOI Loan a/c', 'Credit'),
    '10910': ('CL - Globus Bank Loan - LPO 1', 'Credit'),
    '10920': ('CL - Globus Bank Loan - LPO 2', 'Credit'),
    '10930': ('CL - Globus Bank Loan - LPO 3', 'Credit'),
    '10931': ('CL-Globus-STF1-N500M', 'Credit'),
    '10932': ('CL-Globus-STF2-N500M', 'Credit'),
    '10933': ('CL-Globus-STF3-N500M', 'Credit'),
    '10934': ('CL-UBN-N3.3B Bridge', 'Credit'),
    '10935': ('CL-UBN-N500m STF', 'Credit'),
    '10936': ('CL-UBN-N2B-STF', 'Credit'),
    '10937': ('CL-UBN-N3B-IFF', 'Credit'),
    '10938': ('CL-UBN-BOI-WC-N3.0B-2', 'Credit'),
    '10939': ('CL-UBN-BOI-TL-N3.5B-1', 'Credit'),
    '10940': ('CL -WEMA BOI Loan a/c', 'Credit'),
    '10950': ('CL - Loan - Globus Bank OD', 'Credit'),
    '10951': ('CL-GLOBUS LOAN 1B', 'Credit'),
    '10952': ('CL-GLOBUS LOAN 1.5B', 'Credit'),
    '10955': ('CL- Zenith Bank Loan/ LPO', 'Credit'),
    '10956': ('CL- Zenith Bid support 123m', 'Credit'),
    '10957': ('CL-Zenith Bid support 52m', 'Credit'),
    '10960': ('CL-WEMA Bank Bid Support 975m', 'Credit'),
    '10961': ('CL-Wema Bank Bid support 1.38m', 'Credit'),
    '10962': ('CL-Wema Bank Bid support 400m', 'Credit'),
    '10963': ('CL-Wema Bank Bid support 315m', 'Credit'),
    '10964': ('CL-Wema Bank Bid support196.5m', 'Credit'),
    '10965': ('CL-Union Bank Loan', 'Credit'),
    '10966': ('CL-Wema Bank Bid support381.5m', 'Credit'),
    '10967': ('CL-Wema Bank Bid support 211m', 'Credit'),
    '10968': ('CL-Wema Bank Bid support 179m', 'Credit'),
    '10969': ('CL-Wema Bank Bid support 149m', 'Credit'),
    '10970': ('CL-WEMA Bank CFF Loan - 1', 'Credit'),
    '10971': ('CL-Wema Bank Bid support 111m', 'Credit'),
    '10972': ('CL-Wema Bank Bid support 104m', 'Credit'),
    '10973': ('CL-Wema Bank Bid support 69m', 'Credit'),
    '10974': ('CL-Wema Bank Bid support 300m', 'Credit'),
    '10975': ('CL-Wema Bank CFF Loan- 2', 'Credit'),
    '10976': ('CL-Wema Bank Bid support 54.5m', 'Credit'),
    '10977': ('CL-WEMA-STF1 - N705', 'Credit'),
    '10978': ('CL-WEMA-STF4-N550.5M', 'Credit'),
    '10979': ('CL-WEMA-STF5-N500.5M', 'Credit'),
    '10980': ('CL- Zenith Bank - Bid Collater', 'Credit'),
    '10981': ('CL-WEMA-STF3-N500.5M', 'Credit'),
    '10982': ('CL-WEMA-STF2-N500.5M', 'Credit'),
    '10990': ('CL-Wema Bank O/D', 'Credit'),
    '10195': ('Globus Bank BOI loan', 'Credit'),
    '10196': ('Globus Bank Trade Loan', 'Credit'),
    '10994': ('Wema Bank11.1 Bn STF', 'Credit'),
    '10998': ('Wema Bank 3Bn STF', 'Credit'),
    '10999': ('Wema Bank 6.9Bn Term Loan', 'Credit'),
    '10144': ('Wema Bank $1.5 BG', 'Credit'),
    '91956': ('CL- WEMA - BOI', 'Credit'),
    '91961': ('CL- Deferred Income on Loan', 'Credit'),
    # Equity
    '39003': ('Deposit for shares', 'Credit'),
    '39004': ('Share Capital', 'Credit'),
    '39005': ('Retained Earnings', 'Credit'),
    '39006': ('Capital reserve', 'Credit'),
}

UNMAPPED_ACCOUNTS = {
    '18000': ('Advances to Suppliers', 'Debit'),
    '80100': ('Suspense Account', 'Debit'),
    '99999': ('System Clearing', 'Debit'),
}

NARRATIONS = [
    'Being amount paid for vehicle importation',
    'Invoice for motor vehicle sales to customer',
    'Payment received from customer - invoice',
    'Being cost of vehicle sold',
    'Custom duty payment on imported vehicles',
    'Shipping charges for vehicle import',
    'Terminal charges - Lagos port',
    'Clearing agent fees',
    'Transport of vehicles to showroom',
    'SON inspection charge',
    'Salary payment for the month',
    'Staff welfare expenses',
    'Office rent payment - VI office',
    'Electricity bill payment',
    'Diesel purchase for generator',
    'Bank charges for the month',
    'Audit fees - Q1 payment',
    'Legal fees - contract review',
    'Vehicle insurance premium',
    'Marketing and promotional expenses',
    'IT support and maintenance',
    'Fuel for test drive vehicles',
    'Spare parts purchase - aftersales',
    'Customer deposit received',
    'Intercompany transfer',
    'Loan repayment - principal',
    'Interest payment on facility',
    'VAT remittance to FIRS',
    'WHT deduction remittance',
    'Pension contribution',
    'NSITF contribution',
    'ITF training levy',
    'Bonus payment',
    'Leave allowance',
    'Medical insurance premium',
    'Security services payment',
    'Water and sanitation',
    'Waste disposal services',
    'Printing and stationery',
    'Courier services',
    'Telephone and internet',
    'Travelling - local',
    'Travelling - offshore',
    'Hotel accommodation',
    'Feeding allowance - Chinese staff',
    'Feeding allowance - Nigerian staff',
    'Visa processing fees',
    'Police escort expenses',
    'Overtime payment',
    'Recruitment costs',
    'Training expenses',
    'Penalty payment',
    'Consultancy fees',
    'Donation - CSR',
    'Miscellaneous income received',
    'Interest income on deposit',
    'Forex gain on revaluation',
    'Bad debt write-off',
    'Impairment reversal',
    'Depreciation - motor vehicles',
    'Depreciation - equipment',
    'Depreciation - furniture',
    'Depreciation - building',
    'ROU amortization',
    'Lease interest expense',
    'Income tax expense',
    'Education tax expense',
    'Deferred tax adjustment',
    'Commission paid to agent',
    'Discount allowed to customer',
    'Parts supplied to workshop',
    'Painting expenses - VI',
    'Painting expenses - Ojota',
    'Sublet expenses',
    'Workshop expenses',
    'Repairs and maintenance',
    'Security expenses',
    'Entertainment expenses',
    'Eko hotel accommodation',
    'Land use charge payment',
    'Service charge payment',
    'Expired permit written off',
    'Vehicle transfer expenses',
    'Vehicle registration',
    'Demurrage charges',
    'Towing expenses',
    'Loading and offloading',
    'Valuation charge',
    'Service charge - aftersales',
    'PR expenses',
    'Toll gate and parking',
    'Water expenses',
    'Admin expenses - CEO office',
    'Staff award expenses',
    'Uniform purchase',
    'Employer pension contribution',
    'ITF training levy',
    'NSITF contribution',
    'Agency fees',
    'BOI expenses',
    'LC cash back',
    'Miscellaneous income',
]

SOURCES = ['ACCENTURE', 'ACCENTURE P.EYE', 'ACCENTURE SMART', 'DEBIT ADVICE', 'CREDIT ADVICE',
           'CASH RECEIPT', 'TRANSFER', 'POS', 'ONLINE', 'CHEQUE', 'BANK TRANSFER']


class GLBuilder:
    def __init__(self):
        self.rows = []
        self.txn_id = 10001
        self._month_revenue = {}

        self.BANK_KEYS = [k for k, v in ACCOUNTS.items()
                          if k.startswith('10') and v[1] == 'Debit' and int(k) < 10900]

        self.RECV_KEYS = ['11000', '11010', '11070', '11080', '11085', '11090']

        self.PAY_KEYS = ['20000', '23300', '23500', '23600', '23910', '23920', '23930',
                         '23940', '24100', '24600', '24910', '24920', '24500']

        self.REV_KEYS = ['40000', '40200', '40500', '40700', '40900', '41000',
                         '24400', '24950', '91320', '91969', '91970']
        self.REV_W = [30, 15, 12, 10, 8, 6, 3, 3, 5, 4, 4]

        self.COGS_KEYS = ['50000', '50100', '50200', '50700', '50800', '51500', '57000',
                          '57500', '58000', '58200', '58300', '58400', '58500', '59000',
                          '60600', '60800', '60900', '61400', '62600', '62650', '63500',
                          '64000', '65100', '65200', '65500', '67200', '67410', '67500',
                          '67600', '68300', '71700', '78500', '79100', '79200', '91150',
                          '91300', '91953', '91957']
        self.COGS_W = [20, 8, 8, 6, 6, 3, 3, 3, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1,
                       1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]

        self.OPEX_KEYS = ['60100', '60200', '60300', '60500', '61000', '61100', '61200',
                          '61300', '61500', '62000', '62100', '62150', '62200', '62300',
                          '62400', '62500', '63000', '63100', '63300', '64100', '64200',
                          '64300', '64400', '65000', '65300', '65400', '66000', '66100',
                          '66300', '66500', '67700', '68500', '69000', '69500', '70000',
                          '70500', '71000', '71200', '71500', '71510', '71520', '71530',
                          '71540', '71550', '71560', '72500', '73100', '73400', '74500',
                          '74510', '74520', '74530', '74540', '74550', '74551', '74560',
                          '74570', '74580', '76000', '76100', '76500', '77000', '77100',
                          '77500', '77600', '78000', '89000', '89500', '89550', '89600',
                          '90500', '90600', '90800', '91200', '91360', '91400', '91520',
                          '91530', '91550', '91600', '91650', '91959', '91960', '91962',
                          '91965', '91966', '91968']
        self.OPEX_W = [3, 2, 2, 2, 2, 2, 2, 2, 1, 3, 2, 2, 2, 2, 2, 1, 2, 1, 2, 2,
                       2, 1, 1, 2, 2, 2, 3, 2, 2, 1, 2, 1, 2, 1, 2, 2, 2, 1, 3, 2, 2,
                       2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                       3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                       2, 1, 1, 2, 2, 2, 2]

        self.DEPR_KEYS = ['64510', '64520', '64530', '64540', '64550', '64560']
        self.DEPR_ACC = {
            '64510': '17000', '64520': '17100', '64530': '17200',
            '64540': '17700', '64550': '17800', '64560': '17900',
        }

        self._rev_totals = [6200, 5800, 7100, 6800, 7500, 8200, 7900, 8600, 9100, 8800, 9500, 10200]

    def emit(self, gl_code, amount_m, date, side, narration=None, source=None):
        amount = round(amount_m * 1_000_000, 2)
        acct_name = ACCOUNTS.get(str(gl_code), ('Unknown', side.upper()))[0]
        debit = amount if side.upper() == 'DEBIT' else 0
        credit = amount if side.upper() == 'CREDIT' else 0
        if narration is None:
            narration = random.choice(NARRATIONS)
        if source is None:
            source = random.choice(SOURCES)
        self.rows.append({
            'Transaction_ID': self.txn_id,
            'GL_Code': int(gl_code),
            'GL_Account': acct_name,
            'Desc_Status': random.choice(['Posted', 'Posted', 'Posted', 'Pending']),
            'Doc_Date': date,
            'Year': date.year,
            'Month_No': date.month,
            'Month_Name': date.strftime('%B'),
            'Period': date.strftime('%Y-%m'),
            'Source': source,
            'Reference': f'REF{random.randint(100000, 999999)}',
            'Narration': narration,
            'Debit': debit,
            'Credit': credit,
            'Net': round(debit - credit, 2),
        })
        self.txn_id += 1

    def double(self, dr_code, cr_code, amount_m, date, narr=None):
        amt = round(amount_m, 4)
        self.emit(dr_code, amt, date, 'DEBIT', narration=narr)
        self.emit(cr_code, amt, date, 'CREDIT', narration=narr)

    def _emit_ob(self, code, amt_m, date):
        normal = ACCOUNTS[str(code)][1]
        if normal == 'Debit':
            self.emit(code, amt_m, date, 'DEBIT', narration='Opening balance b/f', source='OPENING BALANCE')
        else:
            self.emit(code, amt_m, date, 'CREDIT', narration='Opening balance b/f', source='OPENING BALANCE')

    def add_opening_balances(self):
        ob_date = datetime(2025, 1, 1)

        # Debit-normal assets: inventory, bank accounts, receivables, fixed assets
        # Credit-normal liabilities: loans, AP, equity
        # Amounts in millions. RE plug computed to balance A = L + E.
        ob_raw = {
            # ── Assets (Debit-normal) ──
            '10000': 250, '10100': 180, '10130': 1200, '10140': 650, '10150': 420,
            '10180': 550, '10190': 320, '10200': 780, '10220': 480, '10260': 250,
            '10400': 620, '10700': 350, '10165': 180, '10170': 55, '10171': 35,
            '10185': 130, '10210': 110, '10230': 90, '10240': 75, '10250': 60,
            '10270': 50, '10271': 35, '10280': 45, '10300': 30, '10310': 25,
            '10315': 85, '10316': 60, '10317': 45, '10320': 35, '10330': 50,
            '10340': 28, '10350': 60, '10450': 350, '10451': 120, '10452': 180,
            '10500': 80, '10520': 95, '10550': 45, '10600': 35, '10710': 110,
            '10750': 65, '10760': 85, '10800': 25, '10855': 35, '10120': 160,
            '11000': 3200, '11010': 480, '11070': 350, '11080': 260, '11085': 165,
            '11090': 105,
            '12000': 1050, '12100': 1580, '12200': 1320, '12210': 680, '12250': 1180,
            '12260': 570, '12300': 1020, '12400': 830, '12430': 360, '12500': 1450,
            '12550': 980, '12600': 450, '12700': 530, '12750': 320, '12850': 285,
            '12900': 1180, '13000': 720, '13650': 610, '13700': 495, '13710': 340,
            '13800': 210, '13850': 250, '13860': 270, '13870': 230, '13880': 195,
            '13890': 155, '13900': 325, '13910': 285, '13920': 230, '13930': 175,
            '13940': 135,
            '14021': 75, '14022': 50, '14023': 100, '14024': 60, '14025': 42,
            '14027': 50, '14028': 82, '14030': 90, '14031': 58, '14032': 35,
            '14045': 65, '14046': 42, '14048': 28, '14050': 120,
            '14100': 82, '14300': 140, '14755': 35, '14786': 50, '14800': 180,
            '19110': 260, '19200': 165,
            '15000': 720, '15100': 1350, '15200': 3100, '15500': 4600, '15501': 3650,
            '15600': 1080, '15700': 1620, '15800': 2500, '15900': 1460, '15950': 845,
            '15960': 580,
            '17000': 350, '17100': 680, '17200': 1580, '17700': 810, '17800': 1830,
            '17900': 290,
            '24310': 700, '24320': 370, '24330': 470, '24340': 255, '24350': 160,
            '24360': 335, '24380': 215,
            # ── Liabilities (Credit-normal) ──
            '20000': 2400, '23300': 140, '23500': 190, '23600': 370, '23910': 330,
            '23920': 165, '23930': 215, '23940': 190, '24100': 470, '24600': 335,
            '24910': 50, '24920': 60, '24500': 370,
            # ── Bank loans (Credit-normal liabilities) ──
            '10145': 5400, '10155': 970, '10160': 1280, '10290': 700,
            '10453': 195, '10610': 470, '10900': 315, '10902': 235,
            '10910': 175, '10920': 150, '10930': 125, '10931': 195,
            '10932': 195, '10933': 195, '10934': 1285, '10935': 195,
            '10936': 780, '10937': 1170, '10938': 1170, '10939': 1365,
            '10940': 585, '10950': 155, '10951': 390, '10952': 585,
            '10955': 315, '10956': 48, '10957': 20, '10960': 380,
            '10961': 0.54, '10962': 155, '10963': 122, '10964': 77,
            '10965': 235, '10966': 148, '10967': 82, '10968': 70,
            '10969': 58, '10970': 137, '10971': 43, '10972': 41,
            '10973': 27, '10974': 117, '10975': 109, '10976': 21,
            '10977': 275, '10978': 215, '10979': 195, '10980': 78,
            '10981': 195, '10982': 195, '10990': 70, '10195': 137,
            '10196': 109, '10994': 4340, '10998': 1170, '10999': 2695,
            '10144': 295, '91956': 155, '91961': 60,
            # ── Equity (Credit-normal) ──
            '39003': 2500, '39004': 5000, '39006': 1200,
        }

        sum_dr = 0
        sum_cr = 0
        for code, amt in ob_raw.items():
            normal = ACCOUNTS[str(code)][1]
            if normal == 'Debit':
                sum_dr += amt
            else:
                sum_cr += amt

        re_plug = sum_dr - sum_cr
        ob_raw['39005'] = round(re_plug, 4)

        total_ob_dr = 0
        total_ob_cr = 0
        for code, amt in sorted(ob_raw.items()):
            self._emit_ob(code, amt, ob_date)
            normal = ACCOUNTS[str(code)][1]
            if normal == 'Debit':
                total_ob_dr += amt * 1_000_000
            else:
                total_ob_cr += amt * 1_000_000

        print(f"  Opening Balances:  Dr = {total_ob_dr:,.2f}  Cr = {total_ob_cr:,.2f}")
        assert round(total_ob_dr) == round(total_ob_cr), \
            f"OB unbalanced! Dr={total_ob_dr}, Cr={total_ob_cr}"

    def generate_monthly_pl(self):
        months = list(range(1, 13))
        for m in months:
            month_rev_m = self._rev_totals[m - 1]
            self._month_revenue[m] = month_rev_m

            start = datetime(2025, m, 1)
            end_dt = datetime(2025, m, 28) if m == 2 else datetime(2025, m, 30)
            if m in (1, 3, 5, 7, 8, 10, 12):
                end_dt = datetime(2025, m, 31)

            def rand_date():
                delta = (end_dt - start).days
                return start + timedelta(days=random.randint(0, delta))

            n_rev = random.randint(8, 14)
            rev_pool = random.choices(self.REV_KEYS, weights=self.REV_W[:len(self.REV_KEYS)], k=n_rev)
            total_rev = 0
            for i, rk in enumerate(rev_pool):
                amt = month_rev_m / n_rev * random.uniform(0.7, 1.3)
                total_rev += amt
                cash_or_recv = random.choice(self.BANK_KEYS + self.RECV_KEYS)
                self.double(cash_or_recv, rk, amt, rand_date())

            cogs_pct = random.uniform(0.65, 0.75)
            cogs_total = month_rev_m * cogs_pct
            n_cogs = random.randint(6, 10)
            cogs_pool = random.choices(self.COGS_KEYS, weights=self.COGS_W[:len(self.COGS_KEYS)], k=n_cogs)
            for ck in cogs_pool:
                amt = cogs_total / n_cogs * random.uniform(0.6, 1.4)
                pay_or_cash = random.choice(self.PAY_KEYS + self.BANK_KEYS)
                self.double(ck, pay_or_cash, amt, rand_date())

            opex_pct = random.uniform(0.15, 0.19)
            opex_total = month_rev_m * opex_pct
            n_opex = random.randint(15, 28)
            opex_pool = random.choices(self.OPEX_KEYS, weights=self.OPEX_W[:len(self.OPEX_KEYS)], k=n_opex)
            for ox in opex_pool:
                amt = opex_total / n_opex * random.uniform(0.5, 1.5)
                pay_or_cash = random.choice(self.PAY_KEYS + self.BANK_KEYS)
                self.double(ox, pay_or_cash, amt, rand_date())

            depr_pct = random.uniform(0.025, 0.035)
            depr_total = month_rev_m * depr_pct
            n_depr = random.randint(3, 6)
            depr_pool = random.choices(self.DEPR_KEYS, k=n_depr)
            for dk in depr_pool:
                amt = depr_total / n_depr
                acc = self.DEPR_ACC[dk]
                self.double(dk, acc, amt, rand_date())

            fin_pct = random.uniform(0.02, 0.03)
            fin_total = month_rev_m * fin_pct
            n_fin = random.randint(2, 4)
            fin_keys = ['62050', '62060', '64570']
            for _ in range(n_fin):
                fk = random.choice(fin_keys)
                amt = fin_total / n_fin * random.uniform(0.7, 1.3)
                self.double(fk, random.choice(self.BANK_KEYS), amt, rand_date())

            tax_pct = random.uniform(0.008, 0.012)
            tax_total = month_rev_m * tax_pct
            n_tax = random.randint(1, 3)
            tax_keys = ['67000', '67100', '90400']
            for _ in range(n_tax):
                tk = random.choice(tax_keys)
                amt = tax_total / n_tax
                self.double(tk, '23910', amt, rand_date())

            if random.random() < 0.70:
                oi_keys = ['40800', '45500']
                amt_oi = random.uniform(5, 50)
                self.double(random.choice(self.BANK_KEYS), random.choice(oi_keys), amt_oi, rand_date())

            if random.random() < 0.35:
                ig_keys = ['78500', '91901']
                amt_ig = random.uniform(2, 25)
                side_choice = random.choice(['dr', 'cr'])
                if side_choice == 'dr':
                    self.double(random.choice(ig_keys), random.choice(self.BANK_KEYS), amt_ig, rand_date())
                else:
                    self.double(random.choice(self.BANK_KEYS), random.choice(ig_keys), amt_ig, rand_date())

    def verify(self):
        df = pd.DataFrame(self.rows)
        total_dr = df['Debit'].sum()
        total_cr = df['Credit'].sum()
        net = total_dr - total_cr
        print(f"  Total Debit:  {total_dr:,.2f}")
        print(f"  Total Credit: {total_cr:,.2f}")
        print(f"  Net:          {net:,.2f}")
        print(f"  Rows:         {len(df)}")
        print(f"  Unique GLs:   {df['GL_Code'].nunique()}")

    def build(self):
        self.add_opening_balances()
        self.generate_monthly_pl()
        self.verify()
        return pd.DataFrame(self.rows)


def add_dirty_data(df):
    balanced_df = df.copy()

    mask_non_ob = balanced_df['Narration'] == ''
    balanced_df.loc[mask_non_ob, 'Narration'] = balanced_df.loc[mask_non_ob, 'Narration'].apply(
        lambda x: x
    )

    dirty_rows = []
    txn_base = balanced_df['Transaction_ID'].max() + 1

    dirty_rows.append({
        'Transaction_ID': txn_base,
        'GL_Code': 10800,
        'GL_Account': 'Petty Cash - Ojota',
        'Desc_Status': 'Pending',
        'Doc_Date': datetime(2025, 5, 10),
        'Year': 2025, 'Month_No': 5, 'Month_Name': 'May', 'Period': '2025-05',
        'Source': 'MANUAL',
        'Reference': f'REF{random.randint(100000, 999999)}',
        'Narration': '',
        'Debit': 2_500_000,
        'Credit': 0,
        'Net': 2_500_000,
    })

    dirty_rows.append({
        'Transaction_ID': txn_base + 1,
        'GL_Code': 77000,
        'GL_Account': 'IE- Salaries expense',
        'Desc_Status': 'Posted',
        'Doc_Date': '15/03/2025',
        'Year': 2025, 'Month_No': 3, 'Month_Name': 'March', 'Period': '2025-03',
        'Source': 'ACCENTURE',
        'Reference': f'REF{random.randint(100000, 999999)}',
        'Narration': '',
        'Debit': 45_000_000,
        'Credit': 0,
        'Net': 45_000_000,
    })

    dirty_rows.append({
        'Transaction_ID': txn_base + 2,
        'GL_Code': 10000,
        'GL_Account': 'Cash in Hand - Naira-1',
        'Desc_Status': 'Posted',
        'Doc_Date': datetime(2025, 8, 20),
        'Year': 2025, 'Month_No': 8, 'Month_Name': 'August', 'Period': '2025-08',
        'Source': 'ACCENTURE',
        'Reference': f'REF{random.randint(100000, 999999)}',
        'Narration': '',
        'Debit': 10_000_000,
        'Credit': 10_000_000,
        'Net': 0,
    })

    dirty_rows.append({
        'Transaction_ID': txn_base + 3,
        'GL_Code': 62000,
        'GL_Account': 'IE - Bank Charges',
        'Desc_Status': 'Pending',
        'Doc_Date': datetime(2026, 1, 15),
        'Year': 2026, 'Month_No': 1, 'Month_Name': 'January', 'Period': '2026-01',
        'Source': 'MANUAL  ',
        'Reference': f'REF{random.randint(100000, 999999)}',
        'Narration': '',
        'Debit': 750_000,
        'Credit': 0,
        'Net': 750_000,
    })

    counterpart_rows = [
        {
            'Transaction_ID': txn_base + 4,
            'GL_Code': 20000,
            'GL_Account': 'CL - Accounts Payable',
            'Desc_Status': 'Posted',
            'Doc_Date': datetime(2025, 5, 10),
            'Year': 2025, 'Month_No': 5, 'Month_Name': 'May', 'Period': '2025-05',
            'Source': 'MANUAL',
            'Reference': f'REF{random.randint(100000, 999999)}',
            'Narration': '',
            'Debit': 0,
            'Credit': 2_500_000,
            'Net': -2_500_000,
        },
        {
            'Transaction_ID': txn_base + 5,
            'GL_Code': 20000,
            'GL_Account': 'CL - Accounts Payable',
            'Desc_Status': 'Posted',
            'Doc_Date': '15/03/2025',
            'Year': 2025, 'Month_No': 3, 'Month_Name': 'March', 'Period': '2025-03',
            'Source': 'ACCENTURE',
            'Reference': f'REF{random.randint(100000, 999999)}',
            'Narration': '',
            'Debit': 0,
            'Credit': 45_000_000,
            'Net': -45_000_000,
        },
        {
            'Transaction_ID': txn_base + 6,
            'GL_Code': 10130,
            'GL_Account': 'Bank - Zenith Bank Acct-2',
            'Desc_Status': 'Posted',
            'Doc_Date': datetime(2026, 1, 15),
            'Year': 2026, 'Month_No': 1, 'Month_Name': 'January', 'Period': '2026-01',
            'Source': 'MANUAL  ',
            'Reference': f'REF{random.randint(100000, 999999)}',
            'Narration': '',
            'Debit': 0,
            'Credit': 750_000,
            'Net': -750_000,
        },
    ]

    all_dirty = dirty_rows + counterpart_rows
    dirty_df = pd.DataFrame(all_dirty)
    combined = pd.concat([balanced_df, dirty_df], ignore_index=True)

    combined['_sort_key'] = pd.to_datetime(combined['Doc_Date'], errors='coerce')
    combined = combined.sort_values('_sort_key').drop(columns=['_sort_key']).reset_index(drop=True)

    return combined


if __name__ == '__main__':
    print('Generating balanced sample GL with GLBuilder...')
    builder = GLBuilder()
    df = builder.build()

    print()
    print('Adding dirty data rows...')
    df = add_dirty_data(df)

    print()
    print('=== Final Stats ===')
    print(f'  Total rows:     {len(df)}')
    print(f'  Unique GL codes: {df["GL_Code"].nunique()}')
    dates = pd.to_datetime(df['Doc_Date'], errors='coerce')
    print(f'  Date range:      {dates.min()} to {dates.max()}')
    print(f'  Total Debit:     {df["Debit"].sum():,.2f}')
    print(f'  Total Credit:    {df["Credit"].sum():,.2f}')
    print(f'  Net:             {df["Debit"].sum() - df["Credit"].sum():,.2f}')
    print()
    print('Dirty data stats:')
    print(f'  Rows with missing GL_Code:      {df["GL_Code"].isna().sum()}')
    print(f'  Rows with wrong date format:     {(df["Doc_Date"].apply(lambda x: isinstance(x, str))).sum()}')
    print(f'  Rows with both D and C:          {((df["Debit"] > 0) & (df["Credit"] > 0)).sum()}')
    print(f'  Rows with future date (2026+):   {(dates.dt.year >= 2026).sum()}')
    print(f'  Rows with empty narration:       {(df["Narration"] == "").sum()}')
    print(f'  Rows with trailing spaces Source: {(df["Source"].apply(lambda x: str(x) != str(x).strip() if pd.notna(x) else False)).sum()}')
    print()

    output_file = 'Sample GL_complete_dirty.xlsx'
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='GL_Clean', index=False)

    print(f'Saved to {output_file}')
