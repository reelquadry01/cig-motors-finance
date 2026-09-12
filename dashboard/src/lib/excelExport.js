// Excel export — a clean, auditable financial model.
//
// Structure (FAST-aligned):
//   Cover  →  Summary  →  Trial Balance (SOURCE)  →  statements  →  analysis
//   The trial balance is the single source: the income statement and balance
//   sheet are pure SUMIF roll-ups of it, so every figure traces to an account.
//
// Colour coding (standard modelling convention, shown in the Cover legend):
//   blue   = hard input (only ever in the Trial Balance)
//   black  = calculation on the same sheet
//   green  = link to another sheet
//
// Presentation: ₦'000, #,##0;(#,##0), gridlines off, frozen headers,
// internal hyperlinks between sheets.
import { segmentPL, workingCapital } from './sections'

const FONT = 'Calibri'
const NUMFMT = "#,##0,;(#,##0,)"   // stores full ₦, displays ₦'000
const PCTFMT = '0.0%'
const XFMT = '0.00"×"'
const DAYFMT = '0" days"'

const BRAND = 'FFC8102E'
const INK = 'FF1A1A1A'
const MUTED = 'FF7A736C'
const C_INPUT = 'FF0000CC'   // blue  — hard input
const C_CALC = 'FF000000'    // black — same-sheet calculation
const C_LINK = 'FF007A3D'    // green — cross-sheet link
const C_HYPER = 'FF0563C1'
const HEADFILL = 'FFF2F0ED'
const RULE = 'FFB9B2AA'

const TB_TAB = 'Trial Balance'
const UNITS = "All figures in ₦'000 unless stated"

const val = v => Math.round(v || 0)   // full Naira; the number format scales to '000
const q = t => `'${String(t).replace(/'/g, "''")}'`
const colLetter = n => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26 } return s }

async function newWorkbook() {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CIG Motors — Finance'
  return wb
}

/* ── shared styling ── */
function base(ws) {
  ws.views = [{ showGridLines: false }]
  ws.properties.defaultRowHeight = 15
}
function title(ws, text, sub) {
  ws.addRow([text]).getCell(1).font = { name: FONT, bold: true, size: 15, color: { argb: BRAND } }
  if (sub) ws.addRow([sub]).getCell(1).font = { name: FONT, italic: true, size: 9, color: { argb: MUTED } }
  ws.addRow([])
}
function backLink(ws) {
  // "back to cover" link, parked well right of any content so it never clips a title
  const c = ws.getCell('J1')
  c.value = { text: '← Cover', hyperlink: `#${q('Cover')}!A1` }
  c.font = { name: FONT, size: 9, color: { argb: C_HYPER }, underline: true }
  ws.getColumn(10).width = 12
}
function headerRow(ws, cells) {
  const r = ws.addRow(cells)
  r.font = { name: FONT, bold: true, size: 9, color: { argb: INK } }
  r.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADFILL } }
    cell.border = { bottom: { style: 'thin', color: { argb: RULE } } }
    if (i > 1) cell.alignment = { horizontal: 'right' }
  })
  return r
}
function styleCell(cell, { color = C_CALC, fmt = NUMFMT, bold = false } = {}) {
  cell.numFmt = fmt
  cell.font = { name: FONT, size: 10, bold, color: { argb: color } }
}
function ruleAbove(row) { row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } } } }) }
function ruleDouble(row) { row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } }, bottom: { style: 'double', color: { argb: RULE } } } }) }

/* ── Trial balance: resolve rows for the displayed period ── */
function resolveTB(data) {
  const meta = data.tb_meta || {}
  const byPeriod = data.tb_by_period || {}
  if (!Object.keys(meta).length || !Object.keys(byPeriod).length) return null
  const pk = data._periodKey && byPeriod[data._periodKey] ? data._periodKey
    : (byPeriod[data.period] ? data.period : null)

  let amounts, label
  if (pk) { amounts = byPeriod[pk]; label = pk }
  else {
    // aggregate every period (the filtered view is not a single month)
    amounts = {}
    Object.values(byPeriod).forEach(m => Object.entries(m).forEach(([code, [d, c]]) => {
      if (!amounts[code]) amounts[code] = [0, 0]
      amounts[code][0] += d; amounts[code][1] += c
    }))
    label = 'all periods'
  }
  const rows = Object.entries(amounts).map(([code, [d, c]]) => ({
    code, name: meta[code]?.name || code, group: meta[code]?.group || 'Unclassified',
    segment: meta[code]?.segment || '', debit: d, credit: c,
  })).filter(r => r.group !== 'Unclassified')
  const order = ['Revenue', 'Cost of sales', 'Operating expenses', 'Depreciation', 'Other income', 'Finance costs', 'Tax',
    'Current assets', 'Non-current assets', 'Current liabilities', 'Non-current liabilities', 'Equity']
  rows.sort((a, b) => (order.indexOf(a.group) - order.indexOf(b.group)) || a.code.localeCompare(b.code))
  return { rows, label }
}

function sheetTrialBalance(ws, data, tb) {
  base(ws)
  title(ws, 'Trial Balance — source data', `${UNITS} · period: ${tb.label} · this sheet is the single source for the statements`)
  backLink(ws)
  const h = headerRow(ws, ['GL code', 'Account', 'Group', 'Segment', 'Debit', 'Credit', 'Balance'])
  const first = ws.rowCount + 1
  tb.rows.forEach(r => {
    const row = ws.addRow([r.code, r.name, r.group, r.segment, val(r.debit), val(r.credit)])
    row.font = { name: FONT, size: 10 }
    styleCell(row.getCell(5), { color: C_INPUT })
    styleCell(row.getCell(6), { color: C_INPUT })
    const bal = row.getCell(7)
    bal.value = { formula: `E${row.number}-F${row.number}` }
    styleCell(bal, { color: C_CALC })
  })
  const last = ws.rowCount
  const tr = ws.addRow(['', 'Total', '', '', { formula: `SUM(E${first}:E${last})` }, { formula: `SUM(F${first}:F${last})` }, { formula: `SUM(G${first}:G${last})` }])
  tr.font = { name: FONT, bold: true, size: 10 }
  ;[5, 6, 7].forEach(c => styleCell(tr.getCell(c), { bold: true }))
  ruleDouble(tr)

  ws.getColumn(1).width = 11; ws.getColumn(2).width = 40; ws.getColumn(3).width = 22
  ws.getColumn(4).width = 22;[5, 6, 7].forEach(c => ws.getColumn(c).width = 14)
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  ws.autoFilter = { from: { row: h.number, column: 1 }, to: { row: last, column: 7 } }

  return {
    groupRange: `${q(TB_TAB)}!$C$${first}:$C$${last}`,
    balRange: `${q(TB_TAB)}!$G$${first}:$G$${last}`,
  }
}

const SUMIF = (ref, group, negate = false) =>
  `${negate ? '-' : ''}SUMIF(${ref.groupRange},"${group}",${ref.balRange})`

/* ── Income statement (rolls up from the trial balance) ── */
function sheetIncome(ws, data, ref) {
  const tab = 'Income statement'
  base(ws); title(ws, 'Income statement', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['', "₦'000"])
  const R = {}
  const link = (key, label, group, negate) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    const c = r.getCell(2)
    if (ref) { c.value = { formula: SUMIF(ref, group, negate) }; styleCell(c, { color: C_LINK }) }
    else { c.value = val(fallbackPL(data, key)); styleCell(c, { color: C_INPUT }) }
    R[key] = r.number; return r
  }
  const calc = (key, label, formula, { pct = false, dbl = false } = {}) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold: true }
    const c = r.getCell(2); c.value = { formula }; styleCell(c, { bold: true, fmt: pct ? PCTFMT : NUMFMT })
    dbl ? ruleDouble(r) : ruleAbove(r)
    R[key] = r.number; return r
  }

  link('rev', 'Revenue', 'Revenue', true)
  link('cogs', 'Cost of sales', 'Cost of sales')
  calc('gp', 'Gross profit', `B${R.rev}-B${R.cogs}`)
  link('opex', 'Operating expenses', 'Operating expenses')
  link('dep', 'Depreciation & amortisation', 'Depreciation')
  link('oi', 'Other income', 'Other income', true)
  calc('op', 'Operating profit', `B${R.gp}-B${R.opex}-B${R.dep}+B${R.oi}`)
  link('fin', 'Finance costs', 'Finance costs')
  calc('pbt', 'Profit before tax', `B${R.op}-B${R.fin}`)
  link('tax', 'Tax', 'Tax')
  calc('pat', 'Net income', `B${R.pbt}-B${R.tax}`, { dbl: true })

  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const pctRow = (label, key) => { const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }; const c = r.getCell(2); c.value = { formula: `IF(B${R.rev}=0,0,B${R[key]}/B${R.rev})` }; styleCell(c, { fmt: PCTFMT }) }
  pctRow('Gross margin', 'gp'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'pat')

  ws.getColumn(1).width = 34; ws.getColumn(2).width = 16; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  const cell = key => `${q(tab)}!B${R[key]}`
  return { revenue: cell('rev'), grossProfit: cell('gp'), operatingProfit: cell('op'), netIncome: cell('pat') }
}

function fallbackPL(data, key) {
  const p = data.pl || {}
  return { rev: p.total_revenue, cogs: p.total_cogs, opex: p.total_opex, dep: p.total_depreciation, oi: p.total_other_income, fin: p.total_finance_costs, tax: p.total_tax }[key] || 0
}

/* ── Balance sheet (rolls up from the trial balance) ── */
function sheetBalance(ws, data, ref) {
  const tab = 'Balance sheet'
  base(ws); title(ws, 'Balance sheet', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['', "₦'000"])
  const bs = data.bs || {}
  const R = {}
  const link = (key, label, group, negate, fb) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    const c = r.getCell(2)
    if (ref) { c.value = { formula: SUMIF(ref, group, negate) }; styleCell(c, { color: C_LINK }) }
    else { c.value = val(fb); styleCell(c, { color: C_INPUT }) }
    R[key] = r.number
  }
  const calc = (key, label, formula, opts = {}) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold: true }
    styleCell(r.getCell(2), { bold: true }); r.getCell(2).value = { formula }
    opts.dbl ? ruleDouble(r) : ruleAbove(r); R[key] = r.number
  }

  ws.addRow(['Assets']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  link('ca', 'Current assets', 'Current assets', false, bs.total_current_assets)
  link('nca', 'Non-current assets', 'Non-current assets', false, bs.total_non_current_assets)
  calc('ta', 'Total assets', `B${R.ca}+B${R.nca}`, { dbl: true })
  ws.addRow([])
  ws.addRow(['Liabilities & equity']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  link('cl', 'Current liabilities', 'Current liabilities', true, -(bs.total_current_liabilities || 0))
  link('ncl', 'Non-current liabilities', 'Non-current liabilities', true, -(bs.total_non_current_liabilities || 0))
  calc('tl', 'Total liabilities', `B${R.cl}+B${R.ncl}`)
  link('eq', 'Equity', 'Equity', true, -(bs.total_equity || 0))
  calc('tle', 'Total liabilities & equity', `B${R.tl}+B${R.eq}`, { dbl: true })
  ws.addRow([])
  const chk = ws.addRow(['Check — assets less liabilities & equity (nil when the ledger balances)'])
  chk.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } }
  chk.getCell(2).value = { formula: `B${R.ta}-B${R.tle}` }
  styleCell(chk.getCell(2), { fmt: NUMFMT })
  const wcRow = ws.addRow(['Working capital'])
  wcRow.font = { name: FONT, size: 10 }
  wcRow.getCell(2).value = { formula: `B${R.ca}-B${R.cl}` }; styleCell(wcRow.getCell(2))
  const crRow = ws.addRow(['Current ratio']); crRow.font = { name: FONT, size: 10 }
  crRow.getCell(2).value = { formula: `IF(B${R.cl}=0,0,B${R.ca}/B${R.cl})` }; styleCell(crRow.getCell(2), { fmt: XFMT })

  ws.getColumn(1).width = 34; ws.getColumn(2).width = 16; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  const cell = key => `${q(tab)}!B${R[key]}`
  return { totalAssets: cell('ta'), totalLiabilities: cell('tl'), equity: cell('eq'), currentAssets: cell('ca'), currentLiabilities: cell('cl') }
}

/* ── Cash flow (derived; items from the pipeline) ── */
function sheetCash(ws, data) {
  const tab = 'Cash flow'
  base(ws); title(ws, 'Cash flow', `${UNITS} · ${data.period} · derived from GL cash-flow categories`); backLink(ws)
  const h = headerRow(ws, ['', "₦'000"])
  const cf = data.cf || {}
  const marks = []
  const sec = (label, s) => {
    const first = ws.rowCount + 1
    ;(s?.items || []).forEach(i => {
      const r = ws.addRow([`   ${i.label}`, val(i.value)]); r.font = { name: FONT, size: 10 }; styleCell(r.getCell(2), { color: C_INPUT })
    })
    const last = ws.rowCount
    const sr = ws.addRow([label, last >= first ? { formula: `SUM(B${first}:B${last})` } : 0])
    sr.font = { name: FONT, size: 10, bold: true }; styleCell(sr.getCell(2), { bold: true }); ruleAbove(sr)
    marks.push(sr.number)
  }
  sec('Net cash from operating activities', cf.operating)
  sec('Net cash from investing activities', cf.investing)
  sec('Net cash from financing activities', cf.financing)
  const nc = ws.addRow(['Net change in cash', { formula: marks.map(m => `B${m}`).join('+') }])
  nc.font = { name: FONT, size: 10, bold: true }; styleCell(nc.getCell(2), { bold: true }); ruleDouble(nc)
  ws.getColumn(1).width = 46; ws.getColumn(2).width = 16; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return { netChange: `${q(tab)}!B${nc.number}` }
}

function sheetSegments(ws, data) {
  base(ws); title(ws, 'Segment performance', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'])
  const rows = segmentPL(data)
  const first = ws.rowCount + 1
  rows.forEach(r => {
    const row = ws.addRow([r.segment, val(r.revenue), val(r.cogs)]); row.font = { name: FONT, size: 10 }
    styleCell(row.getCell(2), { color: C_INPUT }); styleCell(row.getCell(3), { color: C_INPUT })
    row.getCell(4).value = { formula: `B${row.number}-C${row.number}` }; styleCell(row.getCell(4))
    row.getCell(5).value = { formula: `IF(B${row.number}=0,0,D${row.number}/B${row.number})` }; styleCell(row.getCell(5), { fmt: PCTFMT })
  })
  const last = ws.rowCount
  const tr = ws.addRow(['Total', { formula: `SUM(B${first}:B${last})` }, { formula: `SUM(C${first}:C${last})` }])
  tr.font = { name: FONT, size: 10, bold: true }
  ;[2, 3].forEach(c => styleCell(tr.getCell(c), { bold: true }))
  tr.getCell(4).value = { formula: `B${tr.number}-C${tr.number}` }; styleCell(tr.getCell(4), { bold: true })
  tr.getCell(5).value = { formula: `IF(B${tr.number}=0,0,D${tr.number}/B${tr.number})` }; styleCell(tr.getCell(5), { bold: true, fmt: PCTFMT })
  ruleDouble(tr)
  ws.getColumn(1).width = 30;[2, 3, 4].forEach(c => ws.getColumn(c).width = 15); ws.getColumn(5).width = 10; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

function sheetCosts(ws, data) {
  const pl = data.pl || {}
  base(ws); title(ws, 'Costs & expenditure', `${UNITS} · ${data.period}`); backLink(ws)
  const block = (heading, items, totalLabel) => {
    ws.addRow([heading]).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
    const h = headerRow(ws, ['', "₦'000", 'Share'])
    const first = ws.rowCount + 1
    ;(items || []).forEach(i => {
      const r = ws.addRow([i.label, val(i.value)]); r.font = { name: FONT, size: 10 }
      styleCell(r.getCell(2), { color: C_INPUT })
    })
    const last = ws.rowCount
    const tr = ws.addRow([totalLabel, last >= first ? { formula: `SUM(B${first}:B${last})` } : 0])
    tr.font = { name: FONT, size: 10, bold: true }; styleCell(tr.getCell(2), { bold: true }); ruleDouble(tr)
    for (let rr = first; rr <= last; rr++) {
      const c = ws.getRow(rr).getCell(3)
      c.value = { formula: `IF($B$${tr.number}=0,0,B${rr}/$B$${tr.number})` }
      styleCell(c, { fmt: PCTFMT })
    }
    ws.addRow([])
    return tr.number
  }
  block('Operating expenses', (pl.opex_breakdown || []).map(i => ({ label: i.label, value: i.value })), 'Total operating expenses')
  block('Capital expenditure — additions to PP&E', (pl.capex_breakdown || []).map(i => ({ label: i.label, value: i.value })), 'Total capital expenditure')
  ws.getColumn(1).width = 44; ws.getColumn(2).width = 16; ws.getColumn(3).width = 10; 
  return {}
}

function sheetWorkingCapital(ws, data) {
  const w = workingCapital(data)
  base(ws); title(ws, 'Working capital', `${UNITS} · ${data.period} · cycle in days`); backLink(ws)
  const h = headerRow(ws, ['Metric', 'Value'])
  const add = (l, v, fmt) => { const r = ws.addRow([l, v]); r.font = { name: FONT, size: 10 }; if (typeof v === 'number') styleCell(r.getCell(2), { color: C_INPUT, fmt }) }
  add('Trade receivables', val(w.ar), NUMFMT); add('Inventories', val(w.inventory), NUMFMT)
  add('Trade & other payables', val(w.payables), NUMFMT); add('Net working capital', val(w.working_capital), NUMFMT)
  ws.addRow([])
  add('Days sales outstanding (DSO)', w.dso == null ? '—' : Math.round(w.dso), DAYFMT)
  add('Days inventory outstanding (DIO)', w.dio == null ? '—' : Math.round(w.dio), DAYFMT)
  add('Days payables outstanding (DPO)', w.dpo == null ? '—' : Math.round(w.dpo), DAYFMT)
  add('Cash conversion cycle', w.ccc == null ? '—' : Math.round(w.ccc), DAYFMT)
  ws.getColumn(1).width = 36; ws.getColumn(2).width = 16; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

function sheetRatios(ws, data, refs) {
  const r = data.ratios || {}
  const inc = refs.income, bal = refs.balancesheet
  base(ws); title(ws, 'Ratio analysis', `${data.period} · linked to the statement sheets`); backLink(ws)
  const h = headerRow(ws, ['Ratio', 'Value'])
  const rowF = (label, formula, fmt) => { const row = ws.addRow([label]); row.font = { name: FONT, size: 10 }; row.getCell(2).value = { formula }; styleCell(row.getCell(2), { color: C_LINK, fmt }) }
  const rowV = (label, v, fmt) => { const row = ws.addRow([label, v ?? null]); row.font = { name: FONT, size: 10 }; if (typeof v === 'number') styleCell(row.getCell(2), { color: C_INPUT, fmt }) }

  bal ? rowF('Current ratio', `IF(${bal.currentLiabilities}=0,0,${bal.currentAssets}/${bal.currentLiabilities})`, XFMT) : rowV('Current ratio', r.current_ratio, XFMT)
  if (inc) {
    rowF('Gross margin', `IF(${inc.revenue}=0,0,${inc.grossProfit}/${inc.revenue})`, PCTFMT)
    rowF('Operating margin', `IF(${inc.revenue}=0,0,${inc.operatingProfit}/${inc.revenue})`, PCTFMT)
    rowF('Net margin', `IF(${inc.revenue}=0,0,${inc.netIncome}/${inc.revenue})`, PCTFMT)
  } else {
    rowV('Gross margin', (r.gross_margin ?? 0) / 100, PCTFMT); rowV('Operating margin', (r.operating_margin ?? 0) / 100, PCTFMT); rowV('Net margin', (r.net_margin ?? 0) / 100, PCTFMT)
  }
  inc && bal ? rowF('Return on assets', `IF(${bal.totalAssets}=0,0,${inc.netIncome}/${bal.totalAssets})`, PCTFMT) : rowV('Return on assets', (r.roa ?? 0) / 100, PCTFMT)
  inc && bal ? rowF('Return on equity', `IF(${bal.equity}=0,0,${inc.netIncome}/${bal.equity})`, PCTFMT) : rowV('Return on equity', (r.roe ?? 0) / 100, PCTFMT)
  bal ? rowF('Debt-to-equity', `IF(${bal.equity}=0,0,${bal.totalLiabilities}/${bal.equity})`, PCTFMT) : rowV('Debt-to-equity', (r.debt_to_equity ?? 0) / 100, PCTFMT)
  rowV('Asset turnover', r.asset_turnover, XFMT)
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 14; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

function sheetCommentary(ws, data, buildCommentary) {
  base(ws); title(ws, 'Commentary', data.period); backLink(ws)
  ;(buildCommentary ? buildCommentary(data) : []).forEach(sec => {
    ws.addRow([sec.title]).getCell(1).font = { name: FONT, bold: true, size: 11, color: { argb: BRAND } }
    sec.paras.forEach(p => {
      const r = ws.addRow([p]); r.getCell(1).font = { name: FONT, size: 10 }
      r.getCell(1).alignment = { wrapText: true, vertical: 'top' }
      r.height = Math.max(15, Math.ceil(p.length / 95) * 14)
    })
    ws.addRow([])
  })
  ws.getColumn(1).width = 108
  return {}
}

function sheetSummary(ws, data, refs) {
  base(ws); title(ws, 'Summary', `${UNITS} · ${data.period} · figures link to the statement sheets`); backLink(ws)
  const h = headerRow(ws, ['Metric', "₦'000"])
  const inc = refs.income, bal = refs.balancesheet, cf = refs.cashflow
  const pl = data.pl || {}, bs = data.bs || {}, c = data.cf || {}
  const R = {}
  const line = (key, label, ref, fb, bold = false) => {
    const row = ws.addRow([label]); row.font = { name: FONT, size: 10, bold }
    const cell = row.getCell(2)
    if (ref) { cell.value = { formula: ref }; styleCell(cell, { color: C_LINK, bold }) }
    else { cell.value = val(fb); styleCell(cell, { color: C_INPUT, bold }) }
    R[key] = row.number
  }
  line('rev', 'Revenue', inc?.revenue, pl.total_revenue, true)
  line('gp', 'Gross profit', inc?.grossProfit, pl.gross_profit)
  line('op', 'Operating profit', inc?.operatingProfit, pl.operating_profit)
  line('ni', 'Net income', inc?.netIncome, pl.pat, true)
  ws.addRow([])
  line('ta', 'Total assets', bal?.totalAssets, bs.total_assets)
  line('eq', 'Equity', bal?.equity, -(bs.total_equity || 0))
  line('nc', 'Net change in cash', cf?.netChange, c.net_change)
  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const pctRow = (label, key) => { const row = ws.addRow([label]); row.font = { name: FONT, size: 10 }; row.getCell(2).value = { formula: `IF(B${R.rev}=0,0,B${R[key]}/B${R.rev})` }; styleCell(row.getCell(2), { fmt: PCTFMT }) }
  pctRow('Gross margin', 'gp'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'ni')
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 18; 
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
}

function coverSheet(ws, data, tabs) {
  base(ws)
  ws.addRow(['CIG Motors']).getCell(1).font = { name: FONT, bold: true, size: 24, color: { argb: BRAND } }
  ws.addRow(['Financial reporting pack']).getCell(1).font = { name: FONT, size: 13, color: { argb: INK } }
  ws.addRow([])
  ;[['Reporting period', data.period], ['Currency', 'Nigerian Naira (₦)'], ['Presentation', "₦'000 (thousands)"],
  ['Basis', 'Derived from the general ledger; statements roll up from the Trial Balance'],
  ['Prepared', new Date().toISOString().slice(0, 10)]]
    .forEach(([a, b]) => {
      const r = ws.addRow([a, b]); r.getCell(1).font = { name: FONT, size: 10, color: { argb: MUTED } }; r.getCell(2).font = { name: FONT, size: 10 }
    })
  ws.addRow([])
  ws.addRow(['Contents']).getCell(1).font = { name: FONT, bold: true, size: 11 }
  tabs.forEach((t, i) => {
    const r = ws.addRow([`${i + 1}.`, ''])
    r.getCell(1).font = { name: FONT, size: 10, color: { argb: MUTED } }
    const c = r.getCell(2)
    c.value = { text: t, hyperlink: `#${q(t)}!A1` }
    c.font = { name: FONT, size: 10, color: { argb: C_HYPER }, underline: true }
  })
  ws.addRow([])
  ws.addRow(['Colour convention']).getCell(1).font = { name: FONT, bold: true, size: 11 }
  ;[['Blue', 'Hard input — entered value (Trial Balance only)', C_INPUT],
  ['Black', 'Calculation on the same sheet', C_CALC],
  ['Green', 'Link to another sheet', C_LINK]].forEach(([a, b, col]) => {
    const r = ws.addRow([a, b])
    r.getCell(1).font = { name: FONT, size: 10, bold: true, color: { argb: col } }
    r.getCell(2).font = { name: FONT, size: 10, color: { argb: MUTED } }
  })
  ws.getColumn(1).width = 18; ws.getColumn(2).width = 76
}

const CATALOG = [
  { id: 'income', label: 'Income statement', tab: 'Income statement', build: sheetIncome, leaf: true, needsTB: true },
  { id: 'balancesheet', label: 'Balance sheet', tab: 'Balance sheet', build: sheetBalance, leaf: true, needsTB: true },
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
  const tb = chosen.some(s => s.needsTB) ? resolveTB(data) : null

  const tabNames = []
  if (withSummary && ids.length > 1) tabNames.push('Summary')
  if (tb) tabNames.push(TB_TAB)
  chosen.forEach(s => tabNames.push(s.tab))

  if (withCover) coverSheet(wb.addWorksheet('Cover'), data, tabNames)
  const summaryWs = (withSummary && ids.length > 1) ? wb.addWorksheet('Summary') : null
  const tbWs = tb ? wb.addWorksheet(TB_TAB) : null
  const wsById = {}
  chosen.forEach(s => { wsById[s.id] = wb.addWorksheet(s.tab) })

  const tbRef = tbWs ? sheetTrialBalance(tbWs, data, tb) : null
  const refs = {}
  chosen.filter(s => s.leaf).forEach(s => { refs[s.id] = s.build(wsById[s.id], data, tbRef) || {} })
  chosen.filter(s => !s.leaf).forEach(s => {
    if (s.id === 'commentary') sheetCommentary(wsById[s.id], data, buildCommentary)
    else sheetRatios(wsById[s.id], data, refs)
  })
  if (summaryWs) sheetSummary(summaryWs, data, refs)

  await download(wb, `CIG_Financials_${(data.period || '').replace(/[^\w-]/g, '_')}.xlsx`)
}

export async function exportStatement(kind, data, buildCommentary) {
  await exportWorkbook([kind], data, buildCommentary, { withSummary: false, withCover: false })
}

export const REPORT_CATALOG = CATALOG.map(({ id, label }) => ({ id, label }))
