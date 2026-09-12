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

# Dummy GL codes not in mapping (to make it dirty)
UNMAPPED_ACCOUNTS = {
    '18000': ('Advances to Suppliers', 'Debit'),
    '80100': ('Suspense Account', 'Debit'),
    '99999': ('System Clearing', 'Debit'),
}

# Narrations pool
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

def generate_sample_gl():
    """Generate a complete, dirty sample GL with all line items."""
    rows = []
    txn_id = 10001

    # Generate dates across 2025
    start_date = datetime(2025, 1, 2)
    end_date = datetime(2025, 12, 30)

    def random_date():
        delta = (end_date - start_date).days
        return start_date + timedelta(days=random.randint(0, delta))

    def random_ref():
        return f'REF{random.randint(100000, 999999)}'

    # For each account, generate 5-50 transactions
    for gl_code, (account_name, normal_bal) in ACCOUNTS.items():
        num_txns = random.randint(5, 50)

        for _ in range(num_txns):
            date = random_date()
            month = date.month
            month_name = date.strftime('%B')
            period = date.strftime('%Y-%m')

            # Generate realistic amounts
            if gl_code.startswith('4'):  # Revenue
                amount = random.uniform(5_000_000, 500_000_000)
            elif gl_code.startswith('5') or gl_code.startswith('6'):  # COGS/OpEx
                amount = random.uniform(500_000, 80_000_000)
            elif gl_code.startswith('10') and int(gl_code) < 10900:  # Cash/Bank
                amount = random.uniform(1_000_000, 200_000_000)
            elif gl_code.startswith('10') and int(gl_code) >= 10900:  # Borrowings
                amount = random.uniform(50_000_000, 500_000_000)
            elif gl_code.startswith('12') or gl_code.startswith('13'):  # Inventory
                amount = random.uniform(10_000_000, 300_000_000)
            elif gl_code.startswith('15'):  # Fixed Assets
                amount = random.uniform(50_000_000, 1_000_000_000)
            elif gl_code.startswith('17'):  # Acc Depreciation
                amount = random.uniform(5_000_000, 50_000_000)
            elif gl_code.startswith('20') or gl_code.startswith('23') or gl_code.startswith('24'):  # Payables
                amount = random.uniform(1_000_000, 100_000_000)
            elif gl_code.startswith('39'):  # Equity
                amount = random.uniform(100_000_000, 5_000_000_000)
            elif gl_code.startswith('67') or gl_code.startswith('72'):  # Tax
                amount = random.uniform(5_000_000, 50_000_000)
            else:
                amount = random.uniform(100_000, 20_000_000)

            # Make some transactions dirty
            if random.random() < 0.03:  # 3% chance of missing date
                date = None
                month = None
                month_name = None
                period = None

            if random.random() < 0.02:  # 2% chance of negative amount
                amount = -amount

            if random.random() < 0.05:  # 5% chance of very large amount
                amount *= random.uniform(5, 20)

            if random.random() < 0.02:  # 2% chance of very small amount
                amount = random.uniform(0.01, 100)

            # Debit/Credit
            if normal_bal == 'Debit':
                debit = max(0, amount) if amount > 0 else 0
                credit = abs(amount) if amount < 0 else 0
            else:
                credit = max(0, amount) if amount > 0 else 0
                debit = abs(amount) if amount < 0 else 0

            narration = random.choice(NARRATIONS)
            source = random.choice(SOURCES)
            reference = random_ref()

            # Some dirty data: empty narration
            if random.random() < 0.05:
                narration = ''

            # Some dirty data: duplicate reference
            if random.random() < 0.03:
                reference = reference  # same ref (not truly dirty, just unusual)

            # Some dirty data: source name with extra spaces
            if random.random() < 0.02:
                source = source + '  '

            rows.append({
                'Transaction_ID': txn_id,
                'GL_Code': int(gl_code),
                'GL_Account': account_name,
                'Desc_Status': random.choice(['Posted', 'Posted', 'Posted', 'Pending']),
                'Doc_Date': date,
                'Year': date.year if date else None,
                'Month_No': month,
                'Month_Name': month_name,
                'Period': period,
                'Source': source,
                'Reference': reference,
                'Narration': narration,
                'Debit': round(debit, 2),
                'Credit': round(credit, 2),
                'Net': round(debit - credit, 2),
            })
            txn_id += 1

    # Add unmapped accounts (dirty data)
    for gl_code, (account_name, normal_bal) in UNMAPPED_ACCOUNTS.items():
        num_txns = random.randint(3, 15)
        for _ in range(num_txns):
            date = random_date()
            amount = random.uniform(100_000, 5_000_000)
            debit = max(0, amount) if normal_bal == 'Debit' else 0
            credit = max(0, amount) if normal_bal == 'Credit' else 0
            rows.append({
                'Transaction_ID': txn_id,
                'GL_Code': int(gl_code),
                'GL_Account': account_name,
                'Desc_Status': 'Posted',
                'Doc_Date': date,
                'Year': date.year,
                'Month_No': date.month,
                'Month_Name': date.strftime('%B'),
                'Period': date.strftime('%Y-%m'),
                'Source': random.choice(SOURCES),
                'Reference': random_ref(),
                'Narration': random.choice(NARRATIONS),
                'Debit': round(debit, 2),
                'Credit': round(credit, 2),
                'Net': round(debit - credit, 2),
            })
            txn_id += 1

    # Add some truly dirty rows
    # Row with missing GL code
    rows.append({
        'Transaction_ID': txn_id,
        'GL_Code': None,
        'GL_Account': 'UNKNOWN ACCOUNT',
        'Desc_Status': 'Error',
        'Doc_Date': datetime(2025, 6, 15),
        'Year': 2025,
        'Month_No': 6,
        'Month_Name': 'June',
        'Period': '2025-06',
        'Source': 'MANUAL',
        'Reference': 'ERR001',
        'Narration': 'This row has no GL code - data entry error',
        'Debit': 2500000,
        'Credit': 0,
        'Net': 2500000,
    })
    txn_id += 1

    # Row with wrong date format
    rows.append({
        'Transaction_ID': txn_id,
        'GL_Code': 77000,
        'GL_Account': 'IE- Salaries expense',
        'Desc_Status': 'Posted',
        'Doc_Date': '15/03/2025',  # Wrong format
        'Year': 2025,
        'Month_No': 3,
        'Month_Name': 'March',
        'Period': '2025-03',
        'Source': 'ACCENTURE',
        'Reference': 'REF999999',
        'Narration': 'Salary with wrong date format',
        'Debit': 45000000,
        'Credit': 0,
        'Net': 45000000,
    })
    txn_id += 1

    # Row with both debit and credit
    rows.append({
        'Transaction_ID': txn_id,
        'GL_Code': 10000,
        'GL_Account': 'Cash in Hand - Naira-1',
        'Desc_Status': 'Posted',
        'Doc_Date': datetime(2025, 8, 20),
        'Year': 2025,
        'Month_No': 8,
        'Month_Name': 'August',
        'Period': '2025-08',
        'Source': 'ACCENTURE',
        'Reference': 'REF888888',
        'Narration': 'Cash entry with both D and C - error',
        'Debit': 10000000,
        'Credit': 5000000,
        'Net': 5000000,
    })
    txn_id += 1

    # Row with future date
    rows.append({
        'Transaction_ID': txn_id,
        'GL_Code': 62000,
        'GL_Account': 'IE - Bank Charges',
        'Desc_Status': 'Pending',
        'Doc_Date': datetime(2026, 1, 15),
        'Year': 2026,
        'Month_No': 1,
        'Month_Name': 'January',
        'Period': '2026-01',
        'Source': 'MANUAL',
        'Reference': 'REF777777',
        'Narration': 'Bank charges posted with future date',
        'Debit': 750000,
        'Credit': 0,
        'Net': 750000,
    })

    df = pd.DataFrame(rows)

    # Sort by date - handle mixed types
    df['_sort_key'] = pd.to_datetime(df['Doc_Date'], errors='coerce')
    df = df.sort_values('_sort_key').drop(columns=['_sort_key']).reset_index(drop=True)

    return df


if __name__ == '__main__':
    print('Generating complete dirty sample GL...')
    df = generate_sample_gl()

    print(f'  Generated {len(df)} transactions')
    print(f'  Unique GL codes: {df["GL_Code"].nunique()}')
    dates = pd.to_datetime(df['Doc_Date'], errors='coerce')
    print(f'  Date range: {dates.min()} to {dates.max()}')
    print(f'  Total Debit: {df["Debit"].sum():,.2f}')
    print(f'  Total Credit: {df["Credit"].sum():,.2f}')
    print(f'  Net: {df["Debit"].sum() - df["Credit"].sum():,.2f}')
    print()

    # Dirty data stats
    print('Dirty data stats:')
    print(f'  Rows with missing GL_Code: {df["GL_Code"].isna().sum()}')
    print(f'  Rows with missing Doc_Date: {df["Doc_Date"].isna().sum()}')
    print(f'  Rows with negative amounts: {(df["Debit"] < 0).sum() + (df["Credit"] < 0).sum()}')
    print(f'  Rows with both D and C: {((df["Debit"] > 0) & (df["Credit"] > 0)).sum()}')
    print(f'  Rows with empty narration: {(df["Narration"] == "").sum()}')
    print(f'  Rows with Pending status: {(df["Desc_Status"] == "Pending").sum()}')
    print()

    # Save to Excel
    output_file = 'Sample GL_complete_dirty.xlsx'
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='GL_Clean', index=False)

    print(f'Saved to {output_file}')
    print(f'File size: {pd.io.common.file_exists(output_file)}')
