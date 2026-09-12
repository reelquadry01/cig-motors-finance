// Excel export — an auditable, cross-linked financial model.
// ExcelJS is dynamically imported so it loads only when the user exports.
// Conventions (industry standard):
//   • figures in ₦'000 (thousands); format #,##0;(#,##0)
//   • hard-coded inputs in blue, formulas in black
//   • the income statement is a multi-period model (months + FY total)
//   • a Summary tab and the Ratios tab REFERENCE the statement sheets with
//     live cross-sheet formulas, so the workbook behaves like one model
import { segmentPL, workingCapital } from './sections'

const NUMFMT = '#,##0;(#,##0)'
const PCTFMT = '0.0%'
const XFMT = '0.00"×"'
const DAYFMT = '0" days"'
const BRAND = 'FFC8102E'
const INK = 'FF201E1D'
const MUTED = 'FF6B655E'
const INPUT = 'FF1F4E79'   // blue = hard input
const HEADFILL = 'FFEFEDEA'
const RULE = 'FFBFB9B2'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtMonth = k => { if (!k || !k.includes('-')) return k || ''; const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} '${y.slice(2)}` }
const colLetter = n => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26 } return s }
const k = v => Math.round((v || 0) / 1000)   // to ₦'000
const q = tab => `'${tab.replace(/'/g, "''")}'`

async function newWorkbook() {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  return new ExcelJS.Workbook()
}

function titleBlock(ws, title, subtitle) {
  ws.addRow([title]).getCell(1).font = { name: 'Calibri', bold: true, size: 15, color: { argb: BRAND } }
  ws.addRow([subtitle]).getCell(1).font = { name: 'Calibri', italic: true, size: 9.5, color: { argb: MUTED } }
  ws.addRow([])
}

function styleHeader(row, cols) {
  row.font = { bold: true, size: 9.5, color: { argb: INK } }
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADFILL } }
    cell.border = { bottom: { style: 'thin', color: { argb: RULE } } }
    if (c > 1) cell.alignment = { horizontal: 'right' }
  }
}

const UNITS = "Figures in ₦'000 (thousands)"

/* ── Income statement: multi-period model (months + FY) with formulas ── */
function sheetIncome(ws, data) {
  const tab = 'Income statement'
  const months = (data.available_periods?.months) || []
  const pbp = data.pl_by_period || {}
  const useMulti = months.length > 1 && Object.keys(pbp).length > 0
  const periods = useMulti ? months : [null]
  const cols = periods.length
  const fyCol = 2 + cols
  const resultCol = useMulti ? fyCol : 2

  titleBlock(ws, 'CIG Motors — Income statement', `${UNITS} · ${useMulti ? 'monthly with FY total' : data.period}`)
  const header = ['Line item', ...periods.map(p => useMulti ? fmtMonth(p) : 'Amount')]
  if (useMulti) header.push('FY total')
  const hRow = ws.addRow(header); styleHeader(hRow, header.length)

  const plFor = p => useMulti ? (pbp[p] || {}) : (data.pl || {})
  const R = {}
  const inputRow = (key, label, get) => {
    const r = ws.addRow([label])
    periods.forEach((p, i) => { const c = r.getCell(2 + i); c.value = k(get(plFor(p))); c.numFmt = NUMFMT; c.font = { color: { argb: INPUT } } })
    if (useMulti) { const c = r.getCell(fyCol); c.value = { formula: `SUM(${colLetter(2)}${r.number}:${colLetter(1 + cols)}${r.number})` }; c.numFmt = NUMFMT; c.font = { bold: true } }
    R[key] = r.number; return r
  }
  const formulaRow = (key, label, fn, pct) => {
    const r = ws.addRow([label]); r.font = { bold: true }
    const write = ci => { const L = colLetter(ci); const c = r.getCell(ci); c.value = { formula: fn(L) }; c.numFmt = pct ? PCTFMT : NUMFMT }
    periods.forEach((_, i) => write(2 + i))
    if (useMulti) write(fyCol)
    r.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: RULE } } } })
    R[key] = r.number; return r
  }

  inputRow('rev', 'Revenue', pl => pl.total_revenue)
  inputRow('cogs', 'Cost of sales', pl => pl.total_cogs)
  formulaRow('gp', 'Gross profit', L => `${L}${R.rev}-${L}${R.cogs}`)
  inputRow('opex', 'Operating expenses', pl => pl.total_opex)
  inputRow('dep', 'Depreciation & amortisation', pl => pl.total_depreciation)
  inputRow('oi', 'Other income', pl => pl.total_other_income)
  formulaRow('op', 'Operating profit', L => `${L}${R.gp}-${L}${R.opex}-${L}${R.dep}+${L}${R.oi}`)
  inputRow('fin', 'Finance costs', pl => pl.total_finance_costs)
  formulaRow('pbt', 'Profit before tax', L => `${L}${R.op}-${L}${R.fin}`)
  inputRow('tax', 'Tax', pl => pl.total_tax)
  formulaRow('pat', 'Net income', L => `${L}${R.pbt}-${L}${R.tax}`)
  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { bold: true, size: 9.5 }
  formulaRow('gm', 'Gross margin', L => `IF(${L}${R.rev}=0,0,${L}${R.gp}/${L}${R.rev})`, true)
  formulaRow('om', 'Operating margin', L => `IF(${L}${R.rev}=0,0,${L}${R.op}/${L}${R.rev})`, true)
  formulaRow('nm', 'Net margin', L => `IF(${L}${R.rev}=0,0,${L}${R.pat}/${L}${R.rev})`, true)

  ws.getColumn(1).width = 30
  for (let c = 2; c <= resultCol; c++) ws.getColumn(c).width = 13
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: hRow.number }]

  const cell = key => `${q(tab)}!${colLetter(resultCol)}${R[key]}`
  return { revenue: cell('rev'), cogs: cell('cogs'), grossProfit: cell('gp'), operatingProfit: cell('op'), netIncome: cell('pat') }
}

/* ── Section sheet (single period): detail + SUM subtotal ── */
function sectionSheet(ws, title, groups) {
  titleBlock(ws, title, UNITS)
  const hRow = ws.addRow(['Line item', "Amount (₦'000)"]); styleHeader(hRow, 2)
  groups.forEach(g => {
    const first = ws.rowCount + 1
    ;(g.items || []).forEach(it => {
      const r = ws.addRow([it.label, k(it.value)])
      r.getCell(1).alignment = { indent: 1 }; r.getCell(2).numFmt = NUMFMT; r.getCell(2).font = { color: { argb: INPUT } }
    })
    const last = ws.rowCount
    const sr = ws.addRow([g.sumLabel || g.label, last >= first ? { formula: `SUM(B${first}:B${last})` } : 0])
    sr.font = { bold: true }; sr.getCell(2).numFmt = NUMFMT
    sr.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: RULE } } } })
    g._row = sr.number
  })
  ws.getColumn(1).width = 44; ws.getColumn(2).width = 18
  ws.views = [{ state: 'frozen', ySplit: hRow.number }]
  return groups
}

function sheetBalance(ws, data) {
  const tab = 'Balance sheet'
  const bs = data.bs || {}
  const g = sectionSheet(ws, 'CIG Motors — Balance sheet', [
    { label: 'Current assets', sumLabel: 'Total current assets', items: bs.current_assets },
    { label: 'Non-current assets', sumLabel: 'Total non-current assets', items: bs.non_current_assets },
    { label: 'Current liabilities', sumLabel: 'Total current liabilities', items: bs.current_liabilities },
    { label: 'Non-current liabilities', sumLabel: 'Total non-current liabilities', items: bs.non_current_liabilities },
    { label: 'Equity', sumLabel: 'Total equity', items: bs.equity },
  ])
  ws.addRow([])
  const ta = ws.addRow(['Total assets', { formula: `B${g[0]._row}+B${g[1]._row}` }]); ta.font = { bold: true }; ta.getCell(2).numFmt = NUMFMT
  const tl = ws.addRow(['Total liabilities', { formula: `B${g[2]._row}+B${g[3]._row}` }]); tl.font = { bold: true }; tl.getCell(2).numFmt = NUMFMT
  const teq = ws.addRow(['Total equity & liabilities', { formula: `B${tl.number}+B${g[4]._row}` }]); teq.font = { bold: true }; teq.getCell(2).numFmt = NUMFMT
  ws.addRow(['Working capital', { formula: `B${g[0]._row}-B${g[2]._row}` }]).getCell(2).numFmt = NUMFMT
  ws.addRow(['Current ratio', { formula: `IF(B${g[2]._row}=0,0,B${g[0]._row}/B${g[2]._row})` }]).getCell(2).numFmt = XFMT
  return {
    totalAssets: `${q(tab)}!B${ta.number}`, totalLiabilities: `${q(tab)}!B${tl.number}`,
    equity: `${q(tab)}!B${g[4]._row}`, currentAssets: `${q(tab)}!B${g[0]._row}`, currentLiabilities: `${q(tab)}!B${g[2]._row}`,
  }
}

function sheetCash(ws, data) {
  const tab = 'Cash flow'
  const cf = data.cf || {}
  const g = sectionSheet(ws, 'CIG Motors — Cash flow', [
    { label: 'Operating activities', sumLabel: 'Net cash from operating activities', items: cf.operating?.items },
    { label: 'Investing activities', sumLabel: 'Net cash from investing activities', items: cf.investing?.items },
    { label: 'Financing activities', sumLabel: 'Net cash from financing activities', items: cf.financing?.items },
  ])
  const nc = ws.addRow(['Net change in cash', { formula: `B${g[0]._row}+B${g[1]._row}+B${g[2]._row}` }])
  nc.font = { bold: true }; nc.getCell(2).numFmt = NUMFMT
  nc.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: RULE } } } })
  return { netChange: `${q(tab)}!B${nc.number}` }
}

function sheetSegments(ws, data) {
  titleBlock(ws, 'CIG Motors — Segment performance', UNITS)
  const h = ws.addRow(['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin']); styleHeader(h, 5)
  const rows = segmentPL(data)
  const first = ws.rowCount + 1
  rows.forEach(r => {
    const row = ws.addRow([r.segment, k(r.revenue), k(r.cogs)])
    row.getCell(2).numFmt = NUMFMT; row.getCell(3).numFmt = NUMFMT
    row.getCell(2).font = { color: { argb: INPUT } }; row.getCell(3).font = { color: { argb: INPUT } }
    row.getCell(4).value = { formula: `B${row.number}-C${row.number}` }; row.getCell(4).numFmt = NUMFMT
    row.getCell(5).value = { formula: `IF(B${row.number}=0,0,D${row.number}/B${row.number})` }; row.getCell(5).numFmt = PCTFMT
  })
  const last = ws.rowCount
  const tr = ws.addRow(['Total', { formula: `SUM(B${first}:B${last})` }, { formula: `SUM(C${first}:C${last})` }])
  tr.font = { bold: true }; tr.getCell(2).numFmt = NUMFMT; tr.getCell(3).numFmt = NUMFMT
  tr.getCell(4).value = { formula: `B${tr.number}-C${tr.number}` }; tr.getCell(4).numFmt = NUMFMT
  tr.getCell(5).value = { formula: `IF(B${tr.number}=0,0,D${tr.number}/B${tr.number})` }; tr.getCell(5).numFmt = PCTFMT
  tr.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: RULE } } } })
  ws.getColumn(1).width = 30;[2, 3, 4].forEach(c => ws.getColumn(c).width = 16); ws.getColumn(5).width = 10
  return {}
}

function sheetCosts(ws, data) {
  const pl = data.pl || {}
  sectionSheet(ws, 'CIG Motors — Operating expenses', [
    { label: 'Operating expenses', sumLabel: 'Total operating expenses', items: (pl.opex_breakdown || []).map(i => ({ label: i.label, value: i.value })) },
  ])
  ws.addRow([]); ws.addRow([])
  ws.addRow(['Capital expenditure — additions to PP&E']).getCell(1).font = { bold: true, size: 11, color: { argb: BRAND } }
  const h = ws.addRow(['Asset', "Amount (₦'000)"]); styleHeader(h, 2)
  const first = ws.rowCount + 1
  ;(pl.capex_breakdown || []).forEach(it => {
    const r = ws.addRow([it.label, k(it.value)]); r.getCell(1).alignment = { indent: 1 }; r.getCell(2).numFmt = NUMFMT; r.getCell(2).font = { color: { argb: INPUT } }
  })
  const last = ws.rowCount
  const tr = ws.addRow(['Total capital expenditure', last >= first ? { formula: `SUM(B${first}:B${last})` } : 0]); tr.font = { bold: true }; tr.getCell(2).numFmt = NUMFMT
  tr.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: RULE } } } })
  return {}
}

function sheetWorkingCapital(ws, data) {
  const w = workingCapital(data)
  titleBlock(ws, 'CIG Motors — Working capital', "Balances in ₦'000; cycle in days")
  const h = ws.addRow(['Metric', 'Value']); styleHeader(h, 2)
  const rows = [
    ['Trade receivables', k(w.ar), NUMFMT], ['Inventories', k(w.inventory), NUMFMT],
    ['Trade & other payables', k(w.payables), NUMFMT], ['Net working capital', k(w.working_capital), NUMFMT],
    ['Days sales outstanding (DSO)', w.dso == null ? '—' : Math.round(w.dso), DAYFMT],
    ['Days inventory outstanding (DIO)', w.dio == null ? '—' : Math.round(w.dio), DAYFMT],
    ['Days payables outstanding (DPO)', w.dpo == null ? '—' : Math.round(w.dpo), DAYFMT],
    ['Cash conversion cycle', w.ccc == null ? '—' : Math.round(w.ccc), DAYFMT],
  ]
  rows.forEach(([l, v, f]) => { const r = ws.addRow([l, v]); if (typeof v === 'number') r.getCell(2).numFmt = f })
  ws.getColumn(1).width = 34; ws.getColumn(2).width = 16
  return {}
}

// Ratios reference Income statement + Balance sheet cells when those are present.
function sheetRatios(ws, data, refs) {
  const r = data.ratios || {}
  const inc = refs.income, bal = refs.balancesheet
  titleBlock(ws, 'CIG Motors — Ratio analysis', inc || bal ? 'Linked to the statement sheets' : data.period)
  const h = ws.addRow(['Ratio', 'Value']); styleHeader(h, 2)
  const rowF = (label, formula, fmt) => { const row = ws.addRow([label, { formula }]); row.getCell(2).numFmt = fmt }
  const rowV = (label, v, fmt) => { const row = ws.addRow([label, v ?? null]); if (typeof v === 'number') row.getCell(2).numFmt = fmt }

  if (bal) {
    rowF('Current ratio', `IF(${bal.currentLiabilities}=0,0,${bal.currentAssets}/${bal.currentLiabilities})`, XFMT)
  } else rowV('Current ratio', r.current_ratio, XFMT)
  if (inc) {
    rowF('Gross margin', `IF(${inc.revenue}=0,0,${inc.grossProfit}/${inc.revenue})`, PCTFMT)
    rowF('Operating margin', `IF(${inc.revenue}=0,0,${inc.operatingProfit}/${inc.revenue})`, PCTFMT)
    rowF('Net margin', `IF(${inc.revenue}=0,0,${inc.netIncome}/${inc.revenue})`, PCTFMT)
  } else {
    rowV('Gross margin', (r.gross_margin ?? 0) / 100, PCTFMT); rowV('Operating margin', (r.operating_margin ?? 0) / 100, PCTFMT); rowV('Net margin', (r.net_margin ?? 0) / 100, PCTFMT)
  }
  if (inc && bal) rowF('Return on assets', `IF(${bal.totalAssets}=0,0,${inc.netIncome}/${bal.totalAssets})`, PCTFMT)
  else rowV('Return on assets', (r.roa ?? 0) / 100, PCTFMT)
  if (inc && bal) rowF('Return on equity', `IF(${bal.equity}=0,0,${inc.netIncome}/${bal.equity})`, PCTFMT)
  else rowV('Return on equity', (r.roe ?? 0) / 100, PCTFMT)
  if (bal) rowF('Debt-to-equity', `IF(${bal.equity}=0,0,${bal.totalLiabilities}/${bal.equity})`, PCTFMT)
  else rowV('Debt-to-equity', (r.debt_to_equity ?? 0) / 100, PCTFMT)
  rowV('Asset turnover', r.asset_turnover, XFMT)
  ws.getColumn(1).width = 28; ws.getColumn(2).width = 14
  return {}
}

function sheetCommentary(ws, data, buildCommentary) {
  titleBlock(ws, 'CIG Motors — Commentary', data.period)
  ;(buildCommentary ? buildCommentary(data) : []).forEach(sec => {
    ws.addRow([sec.title]).getCell(1).font = { bold: true, size: 11, color: { argb: BRAND } }
    sec.paras.forEach(p => { const r = ws.addRow([p]); r.getCell(1).alignment = { wrapText: true, vertical: 'top' }; r.height = Math.max(16, Math.ceil(p.length / 90) * 15) })
    ws.addRow([])
  })
  ws.getColumn(1).width = 110
  return {}
}

// Summary tab — KPIs pulled from the statement sheets via cross-sheet formulas.
function sheetSummary(ws, data, refs) {
  titleBlock(ws, 'CIG Motors — Summary', `${UNITS} · ${data.period}`)
  const h = ws.addRow(['Metric', 'Value']); styleHeader(h, 2)
  const inc = refs.income, bal = refs.balancesheet, cf = refs.cashflow
  const pl = data.pl || {}, bs = data.bs || {}, c = data.cf || {}
  const R = {}
  const line = (key, label, ref, fallback, fmt = NUMFMT, bold = false) => {
    const row = ws.addRow([label, ref ? { formula: ref } : k(fallback)])
    row.getCell(2).numFmt = fmt; if (bold) row.font = { bold: true }
    R[key] = row.number; return row
  }
  line('rev', 'Revenue', inc?.revenue, pl.total_revenue, NUMFMT, true)
  line('gp', 'Gross profit', inc?.grossProfit, pl.gross_profit)
  line('op', 'Operating profit', inc?.operatingProfit, pl.operating_profit)
  line('ni', 'Net income', inc?.netIncome, pl.pat, NUMFMT, true)
  ws.addRow([])
  line('ta', 'Total assets', bal?.totalAssets, bs.total_assets)
  line('eq', 'Total equity', bal?.equity, bs.total_equity)
  line('nc', 'Net change in cash', cf?.netChange, c.net_change)
  ws.addRow([])
  // Margins computed intra-sheet from the summary cells (also linked)
  const pctRow = (label, num) => { const row = ws.addRow([label, { formula: `IF(B${R.rev}=0,0,B${R[num]}/B${R.rev})` }]); row.getCell(2).numFmt = PCTFMT }
  pctRow('Gross margin', 'gp'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'ni')
  ws.getColumn(1).width = 26; ws.getColumn(2).width = 18
}

function coverSheet(ws, data, chosen) {
  ws.addRow(['CIG Motors']).getCell(1).font = { bold: true, size: 22, color: { argb: BRAND } }
  ws.addRow(['Financial reporting pack']).getCell(1).font = { size: 13, color: { argb: INK } }
  ws.addRow([])
  ;[['Reporting period', data.period], ['Currency', 'Nigerian Naira (₦)'], ['Presentation', "₦'000 (thousands)"],
  ['Generated', new Date().toISOString().slice(0, 10)], ['GL transactions', data.data_sources?.gl_transactions || 0]]
    .forEach(([kk, v]) => { ws.addRow([kk, v]).getCell(1).font = { color: { argb: MUTED } } })
  ws.addRow([])
  ws.addRow(['Contents']).getCell(1).font = { bold: true, size: 11 }
  ws.addRow(['1.  Summary'])
  chosen.forEach((s, i) => ws.addRow([`${i + 2}.  ${s.label}`]))
  ws.addRow([])
  ws.addRow(['Inputs are shown in blue; black figures are formulas. Summary and Ratios reference the statement sheets.'])
    .getCell(1).font = { italic: true, size: 9, color: { argb: MUTED } }
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 40
}

// Canonical tab order and labels
const CATALOG = [
  { id: 'income', label: 'Income statement', tab: 'Income statement', build: sheetIncome, leaf: true },
  { id: 'balancesheet', label: 'Balance sheet', tab: 'Balance sheet', build: sheetBalance, leaf: true },
  { id: 'cashflow', label: 'Cash flow', tab: 'Cash flow', build: sheetCash, leaf: true },
  { id: 'segments', label: 'Segment performance', tab: 'Segments', build: sheetSegments, leaf: true },
  { id: 'costs', label: 'Costs (opex + capex)', tab: 'Costs', build: sheetCosts, leaf: true },
  { id: 'workingcapital', label: 'Working capital', tab: 'Working capital', build: sheetWorkingCapital, leaf: true },
  { id: 'ratios', label: 'Ratios', tab: 'Ratios', build: sheetRatios, leaf: false },
  { id: 'commentary', label: 'Commentary', tab: 'Commentary', build: sheetCommentary, leaf: false },
]

async function download(wb, name) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportWorkbook(ids, data, buildCommentary, { withSummary = true, withCover = true } = {}) {
  const wb = await newWorkbook()
  const chosen = CATALOG.filter(s => ids.includes(s.id))
  if (withCover) coverSheet(wb.addWorksheet('Cover'), data, chosen)
  // Placeholder Summary sheet (kept 2nd in order; filled after leaves so refs exist)
  const summaryWs = (withSummary && ids.length > 1) ? wb.addWorksheet('Summary') : null
  const wsById = {}
  chosen.forEach(s => { wsById[s.id] = wb.addWorksheet(s.tab) })

  const refs = {}
  // 1) leaves first — capture cross-sheet refs
  chosen.filter(s => s.leaf).forEach(s => { refs[s.id] = s.build(wsById[s.id], data) || {} })
  // 2) derived sheets that reference leaves
  chosen.filter(s => !s.leaf).forEach(s => {
    if (s.id === 'commentary') sheetCommentary(wsById[s.id], data, buildCommentary)
    else if (s.id === 'ratios') sheetRatios(wsById[s.id], data, refs)
    else s.build(wsById[s.id], data)
  })
  // 3) summary references everything
  if (summaryWs) sheetSummary(summaryWs, data, refs)

  const period = (data.period || '').replace(/[^\w-]/g, '_')
  await download(wb, `CIG_Financials_${period}.xlsx`)
}

// Single statement (per-view button): just that sheet, no cover/summary.
export async function exportStatement(kind, data, buildCommentary) {
  await exportWorkbook([kind], data, buildCommentary, { withSummary: false, withCover: false })
}

export const REPORT_CATALOG = CATALOG.map(({ id, label }) => ({ id, label }))
