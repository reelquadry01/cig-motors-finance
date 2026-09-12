// Excel export — a clean, auditable financial model.
//
// Architecture (how an advisory/audit pack is actually built):
//   Cover → Summary → Trial Balance (SOURCE) → Notes to the accounts →
//   Income statement / Balance sheet / Cash flow → schedules → Ratios
//
//   • The Trial Balance is the ONLY place a number is typed.
//   • Every note line is a SUMIFS back to a GL account in the trial balance.
//   • Every statement line XLOOKUPs its note total and carries the note
//     reference — so each figure traces statement → note → account.
//
// Formulas are modern and dynamic (SUMIFS / XLOOKUP), driven by labels rather
// than fixed cell addresses, so inserting rows never breaks a link.
// Requires Excel 2021 or Microsoft 365.
//
// Colour convention (FAST / standard practice, documented on the Cover):
//   blue = hard input (Trial Balance only) · black = same-sheet calculation
//   green = link to another sheet
//
// Presentation: full precision stored, displayed in ₦'000 via a scaling
// number format, gridlines off, frozen headers, internal hyperlinks.
import { workingCapital } from './sections'

const FONT = 'Calibri'
const NUMFMT = "#,##0,;(#,##0,)"   // stores full ₦, displays ₦'000
const PCTFMT = '0.0%'
const XFMT = '0.00"×"'
const DAYFMT = '0" days"'

const BRAND = 'FFC8102E'
const INK = 'FF1A1A1A'
const MUTED = 'FF7A736C'
const C_INPUT = 'FF0000CC'
const C_CALC = 'FF000000'
const C_LINK = 'FF007A3D'
const C_HYPER = 'FF0563C1'
const HEADFILL = 'FFF2F0ED'
const RULE = 'FFB9B2AA'

const TB_TAB = 'Trial Balance'
const NOTES_TAB = 'Notes'
const IS_TAB = 'Income statement'
const BS_TAB = 'Balance sheet'
const UNITS = "All figures in ₦'000 unless stated"

const val = v => Math.round(v || 0)
const q = t => `'${String(t).replace(/'/g, "''")}'`

const PL_GROUPS = ['Revenue', 'Cost of sales', 'Operating expenses', 'Depreciation', 'Other income', 'Finance costs', 'Tax']
const BS_GROUPS = ['Current assets', 'Non-current assets', 'Current liabilities', 'Non-current liabilities', 'Equity']
const CREDIT_GROUPS = new Set(['Revenue', 'Other income', 'Current liabilities', 'Non-current liabilities', 'Equity'])
const sign = g => (CREDIT_GROUPS.has(g) ? '-' : '')

/* ── modern formula helpers ── */
const esc = s => String(s).replace(/"/g, '""')
// SUMIFS(sum_range, crit_range1, "v1", crit_range2, "v2", ...)
const SUMIFS = (sumRange, pairs) =>
  `SUMIFS(${sumRange},${pairs.map(([r, v]) => `${r},"${esc(v)}"`).join(',')})`
// XLOOKUP(key, lookup_range, return_range, 0) — 0 if not found, keeps it safe
const XLOOKUP = (key, lookupRange, returnRange) =>
  `XLOOKUP("${esc(key)}",${lookupRange},${returnRange},0)`

async function newWorkbook() {
  const mod = await import('exceljs')
  const ExcelJS = mod.default || mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CIG Motors — Finance'
  return wb
}

/* ── shared styling ── */
const base = ws => { ws.views = [{ showGridLines: false }]; ws.properties.defaultRowHeight = 15 }
function title(ws, text, sub) {
  ws.addRow([text]).getCell(1).font = { name: FONT, bold: true, size: 15, color: { argb: BRAND } }
  if (sub) ws.addRow([sub]).getCell(1).font = { name: FONT, italic: true, size: 9, color: { argb: MUTED } }
  ws.addRow([])
}
function backLink(ws) {
  const c = ws.getCell('L1')
  c.value = { text: '← Cover', hyperlink: `#${q('Cover')}!A1` }
  c.font = { name: FONT, size: 9, color: { argb: C_HYPER }, underline: true }
  ws.getColumn(12).width = 11
}
function headerRow(ws, cells, rightFrom = 2) {
  const r = ws.addRow(cells)
  r.font = { name: FONT, bold: true, size: 9, color: { argb: INK } }
  r.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADFILL } }
    cell.border = { bottom: { style: 'thin', color: { argb: RULE } } }
    if (i >= rightFrom) cell.alignment = { horizontal: 'right' }
  })
  return r
}
const styleCell = (cell, { color = C_CALC, fmt = NUMFMT, bold = false } = {}) => {
  cell.numFmt = fmt
  cell.font = { name: FONT, size: 10, bold, color: { argb: color } }
}
const ruleAbove = row => row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } } } })
const ruleDouble = row => row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } }, bottom: { style: 'double', color: { argb: RULE } } } })
const noteKey = line => `Total — ${line}`

/* ── Resolve the trial balance for the displayed period ── */
function resolveTB(data) {
  const meta = data.tb_meta || {}
  const byPeriod = data.tb_by_period || {}
  if (!Object.keys(meta).length || !Object.keys(byPeriod).length) return null
  const pk = data._periodKey && byPeriod[data._periodKey] ? data._periodKey
    : (byPeriod[data.period] ? data.period : null)
  let amounts, label
  if (pk) { amounts = byPeriod[pk]; label = pk }
  else {
    amounts = {}
    Object.values(byPeriod).forEach(m => Object.entries(m).forEach(([code, [d, c]]) => {
      if (!amounts[code]) amounts[code] = [0, 0]
      amounts[code][0] += d; amounts[code][1] += c
    }))
    label = 'all periods'
  }
  const rows = Object.entries(amounts).map(([code, [d, c]]) => {
    const m = meta[code] || {}
    return { code, name: m.name || code, group: m.group, line: m.line || m.group, note: m.note || '', cf: m.cf || '', segment: m.segment || '', debit: d, credit: c }
  }).filter(r => r.group)
  const order = [...PL_GROUPS, ...BS_GROUPS]
  rows.sort((a, b) => (order.indexOf(a.group) - order.indexOf(b.group)) || String(a.line).localeCompare(String(b.line)) || a.code.localeCompare(b.code))
  const lines = []
  rows.forEach(r => { if (!lines.some(l => l.line === r.line && l.group === r.group)) lines.push({ line: r.line, group: r.group }) })
  return { rows, label, lines }
}

function sheetTrialBalance(ws, data, tb) {
  base(ws)
  title(ws, 'Trial Balance', `${UNITS} · period ${tb.label} · the single source — every note and statement is a formula against this sheet`)
  backLink(ws)
  const h = headerRow(ws, ['GL code', 'Account', 'Statement line', 'Note heading', 'Group', 'Cash flow', 'Segment', 'Debit', 'Credit', 'Balance'], 8)
  const first = ws.rowCount + 1
  tb.rows.forEach(r => {
    const row = ws.addRow([r.code, r.name, r.line, r.note, r.group, r.cf, r.segment, val(r.debit), val(r.credit)])
    row.font = { name: FONT, size: 10 }
    styleCell(row.getCell(8), { color: C_INPUT })
    styleCell(row.getCell(9), { color: C_INPUT })
    row.getCell(10).value = { formula: `H${row.number}-I${row.number}` }
    styleCell(row.getCell(10))
  })
  const last = ws.rowCount
  const tr = ws.addRow(['', 'Total', '', '', '', '', '',
    { formula: `SUM(H${first}:H${last})` }, { formula: `SUM(I${first}:I${last})` }, { formula: `SUM(J${first}:J${last})` }])
  tr.font = { name: FONT, bold: true, size: 10 }
  ;[8, 9, 10].forEach(c => styleCell(tr.getCell(c), { bold: true }))
  ruleDouble(tr)

  ws.getColumn(1).width = 10; ws.getColumn(2).width = 38; ws.getColumn(3).width = 30
  ws.getColumn(4).width = 30; ws.getColumn(5).width = 20; ws.getColumn(6).width = 12; ws.getColumn(7).width = 22
  ;[8, 9, 10].forEach(c => ws.getColumn(c).width = 14)
  ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 2, ySplit: h.number }]
  ws.autoFilter = { from: { row: h.number, column: 1 }, to: { row: last, column: 10 } }

  const R = col => `${q(TB_TAB)}!$${col}$${first}:$${col}$${last}`
  return { code: R('A'), line: R('C'), group: R('E'), cf: R('F'), seg: R('G'), bal: R('J') }
}

/* ── Notes to the accounts — one note per statement line ── */
function sheetNotes(ws, data, tb, ref) {
  base(ws)
  title(ws, 'Notes to the accounts', `${UNITS} · ${data.period} · each line is a SUMIFS to a GL account in the ${TB_TAB}`)
  backLink(ws)
  const notes = {}
  let n = 0
  tb.lines.forEach(({ line, group }) => {
    n += 1
    const accounts = tb.rows.filter(r => r.line === line && r.group === group)
    ws.addRow([`Note ${n} — ${line}`]).getCell(1).font = { name: FONT, bold: true, size: 11, color: { argb: BRAND } }
    ws.addRow([group]).getCell(1).font = { name: FONT, italic: true, size: 8.5, color: { argb: MUTED } }
    headerRow(ws, ['GL code', 'Account', "₦'000"], 3)
    const first = ws.rowCount + 1
    accounts.forEach(a => {
      const r = ws.addRow([a.code, a.name]); r.font = { name: FONT, size: 10 }
      const c = r.getCell(3)
      c.value = { formula: `${sign(group)}${SUMIFS(ref.bal, [[ref.code, a.code]])}` }
      styleCell(c, { color: C_LINK })
    })
    const last = ws.rowCount
    const tr = ws.addRow(['', noteKey(line), last >= first ? { formula: `SUM(C${first}:C${last})` } : 0])
    tr.font = { name: FONT, bold: true, size: 10 }
    styleCell(tr.getCell(3), { bold: true }); ruleDouble(tr)
    notes[line] = { number: n, group }
    ws.addRow([])
  })
  ws.getColumn(1).width = 10; ws.getColumn(2).width = 46; ws.getColumn(3).width = 16
  return notes
}

/* Look a note total up by its label — dynamic, survives row inserts */
const noteLookup = line => XLOOKUP(noteKey(line), `${q(NOTES_TAB)}!$B:$B`, `${q(NOTES_TAB)}!$C:$C`)
const notesFor = (notes, group) => Object.entries(notes).filter(([, v]) => v.group === group).map(([line, v]) => ({ line, ...v }))
const groupFormula = (notes, group) => {
  const ns = notesFor(notes, group)
  return ns.length ? ns.map(x => noteLookup(x.line)).join('+') : null
}
const noteRefs = (notes, group) => notesFor(notes, group).map(x => x.number).join(', ')
/* Look a statement line up by its label */
const stmtLookup = (tab, label, col = 'C') => XLOOKUP(label, `${q(tab)}!$A:$A`, `${q(tab)}!$${col}:$${col}`)

/* ── Income statement ── */
function sheetIncome(ws, data, ctx) {
  const { notes } = ctx
  base(ws); title(ws, 'Income statement', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['', 'Note', "₦'000"], 2)
  const R = {}
  const line = (key, label, group) => {
    const r = ws.addRow([label, noteRefs(notes, group)]); r.font = { name: FONT, size: 10 }
    r.getCell(2).alignment = { horizontal: 'center' }
    r.getCell(2).font = { name: FONT, size: 9, color: { argb: MUTED } }
    const f = groupFormula(notes, group)
    const c = r.getCell(3)
    if (f) { c.value = { formula: f }; styleCell(c, { color: C_LINK }) }
    else { c.value = 0; styleCell(c) }
    R[key] = r.number
  }
  const calc = (key, label, formula, { pct = false, dbl = false } = {}) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold: true }
    const c = r.getCell(3); c.value = { formula }; styleCell(c, { bold: true, fmt: pct ? PCTFMT : NUMFMT })
    dbl ? ruleDouble(r) : ruleAbove(r); R[key] = r.number
  }
  line('rev', 'Revenue', 'Revenue')
  line('cogs', 'Cost of sales', 'Cost of sales')
  calc('gp', 'Gross profit', `C${R.rev}-C${R.cogs}`)
  line('opex', 'Operating expenses', 'Operating expenses')
  line('dep', 'Depreciation & amortisation', 'Depreciation')
  line('oi', 'Other income', 'Other income')
  calc('op', 'Operating profit', `C${R.gp}-C${R.opex}-C${R.dep}+C${R.oi}`)
  line('fin', 'Finance costs', 'Finance costs')
  calc('pbt', 'Profit before tax', `C${R.op}-C${R.fin}`)
  line('tax', 'Tax', 'Tax')
  calc('pat', 'Profit for the period', `C${R.pbt}-C${R.tax}`, { dbl: true })
  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const pctRow = (label, key) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    r.getCell(3).value = { formula: `IF(C${R.rev}=0,0,C${R[key]}/C${R.rev})` }; styleCell(r.getCell(3), { fmt: PCTFMT })
  }
  pctRow('Gross margin', 'gp'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'pat')
  ws.getColumn(1).width = 36; ws.getColumn(2).width = 7; ws.getColumn(3).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {
    revenue: stmtLookup(IS_TAB, 'Revenue'), cogs: stmtLookup(IS_TAB, 'Cost of sales'),
    grossProfit: stmtLookup(IS_TAB, 'Gross profit'), operatingProfit: stmtLookup(IS_TAB, 'Operating profit'),
    netIncome: stmtLookup(IS_TAB, 'Profit for the period'),
  }
}

/* ── Balance sheet — every line tied to its note ── */
function sheetBalance(ws, data, ctx) {
  const { notes } = ctx
  base(ws); title(ws, 'Balance sheet', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['', 'Note', "₦'000"], 2)
  const R = {}
  const section = (heading, group, key) => {
    ws.addRow([heading]).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
    const ns = notesFor(notes, group)
    const first = ws.rowCount + 1
    ns.forEach(nn => {
      const r = ws.addRow([`   ${nn.line}`, nn.number]); r.font = { name: FONT, size: 10 }
      r.getCell(2).alignment = { horizontal: 'center' }; r.getCell(2).font = { name: FONT, size: 9, color: { argb: MUTED } }
      r.getCell(3).value = { formula: noteLookup(nn.line) }; styleCell(r.getCell(3), { color: C_LINK })
    })
    const last = ws.rowCount
    const tr = ws.addRow([`Total ${heading.toLowerCase()}`, '', ns.length ? { formula: `SUM(C${first}:C${last})` } : 0])
    tr.font = { name: FONT, size: 10, bold: true }; styleCell(tr.getCell(3), { bold: true }); ruleAbove(tr)
    R[key] = tr.number
  }
  section('Current assets', 'Current assets', 'ca')
  section('Non-current assets', 'Non-current assets', 'nca')
  const ta = ws.addRow(['Total assets', '', { formula: `C${R.ca}+C${R.nca}` }])
  ta.font = { name: FONT, size: 10, bold: true }; styleCell(ta.getCell(3), { bold: true }); ruleDouble(ta); R.ta = ta.number
  ws.addRow([])
  section('Current liabilities', 'Current liabilities', 'cl')
  section('Non-current liabilities', 'Non-current liabilities', 'ncl')
  const tl = ws.addRow(['Total liabilities', '', { formula: `C${R.cl}+C${R.ncl}` }])
  tl.font = { name: FONT, size: 10, bold: true }; styleCell(tl.getCell(3), { bold: true }); ruleAbove(tl); R.tl = tl.number
  section('Equity', 'Equity', 'eq')
  const tle = ws.addRow(['Total liabilities & equity', '', { formula: `C${R.tl}+C${R.eq}` }])
  tle.font = { name: FONT, size: 10, bold: true }; styleCell(tle.getCell(3), { bold: true }); ruleDouble(tle); R.tle = tle.number
  ws.addRow([])
  const chk = ws.addRow(['Check — total assets less total liabilities & equity', '', { formula: `C${R.ta}-C${R.tle}` }])
  chk.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } }
  styleCell(chk.getCell(3), { fmt: NUMFMT })
  ws.getColumn(1).width = 44; ws.getColumn(2).width = 7; ws.getColumn(3).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {
    totalAssets: stmtLookup(BS_TAB, 'Total assets'), totalLiabilities: stmtLookup(BS_TAB, 'Total liabilities'),
    equity: stmtLookup(BS_TAB, 'Total equity'), currentAssets: stmtLookup(BS_TAB, 'Total current assets'),
    currentLiabilities: stmtLookup(BS_TAB, 'Total current liabilities'),
  }
}

/* ── Cash flow — SUMIFS on the cash-flow category ── */
function sheetCash(ws, data, ctx) {
  const { ref, tb } = ctx
  const tab = 'Cash flow'
  base(ws); title(ws, 'Cash flow', `${UNITS} · ${data.period} · classified by the GL cash-flow category`); backLink(ws)
  const h = headerRow(ws, ['', "₦'000"], 2)
  const marks = []
  const sec = (label, cat) => {
    const lines = [...new Set(tb.rows.filter(r => r.cf === cat).map(r => r.line))]
    const first = ws.rowCount + 1
    lines.forEach(l => {
      const r = ws.addRow([`   ${l}`]); r.font = { name: FONT, size: 10 }
      r.getCell(2).value = { formula: SUMIFS(ref.bal, [[ref.cf, cat], [ref.line, l]]) }
      styleCell(r.getCell(2), { color: C_LINK })
    })
    const last = ws.rowCount
    const tr = ws.addRow([label, lines.length ? { formula: `SUM(B${first}:B${last})` } : 0])
    tr.font = { name: FONT, size: 10, bold: true }; styleCell(tr.getCell(2), { bold: true }); ruleAbove(tr)
    marks.push(tr.number)
  }
  sec('Net cash from operating activities', 'Operating')
  sec('Net cash from investing activities', 'Investing')
  sec('Net cash from financing activities', 'Financing')
  const nc = ws.addRow(['Net change in cash', { formula: marks.map(m => `B${m}`).join('+') }])
  nc.font = { name: FONT, size: 10, bold: true }; styleCell(nc.getCell(2), { bold: true }); ruleDouble(nc)
  ws.getColumn(1).width = 48; ws.getColumn(2).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return { netChange: `${q(tab)}!B${nc.number}` }
}

/* ── Segments — SUMIFS by group + segment ── */
function sheetSegments(ws, data, ctx) {
  const { ref, tb } = ctx
  base(ws); title(ws, 'Segment performance', `${UNITS} · ${data.period}`); backLink(ws)
  const h = headerRow(ws, ['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'])
  const segs = [...new Set(tb.rows.filter(r => r.group === 'Revenue' || r.group === 'Cost of sales').map(r => r.segment))].filter(Boolean)
  const first = ws.rowCount + 1
  segs.forEach(s => {
    const r = ws.addRow([s]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: `-${SUMIFS(ref.bal, [[ref.group, 'Revenue'], [ref.seg, s]])}` }
    r.getCell(3).value = { formula: SUMIFS(ref.bal, [[ref.group, 'Cost of sales'], [ref.seg, s]]) }
    ;[2, 3].forEach(c => styleCell(r.getCell(c), { color: C_LINK }))
    r.getCell(4).value = { formula: `B${r.number}-C${r.number}` }; styleCell(r.getCell(4))
    r.getCell(5).value = { formula: `IF(B${r.number}=0,0,D${r.number}/B${r.number})` }; styleCell(r.getCell(5), { fmt: PCTFMT })
  })
  const last = ws.rowCount
  const tr = ws.addRow(['Total', { formula: `SUM(B${first}:B${last})` }, { formula: `SUM(C${first}:C${last})` }])
  tr.font = { name: FONT, size: 10, bold: true }
  ;[2, 3].forEach(c => styleCell(tr.getCell(c), { bold: true }))
  tr.getCell(4).value = { formula: `B${tr.number}-C${tr.number}` }; styleCell(tr.getCell(4), { bold: true })
  tr.getCell(5).value = { formula: `IF(B${tr.number}=0,0,D${tr.number}/B${tr.number})` }; styleCell(tr.getCell(5), { bold: true, fmt: PCTFMT })
  ruleDouble(tr)
  ws.getColumn(1).width = 30;[2, 3, 4].forEach(c => ws.getColumn(c).width = 15); ws.getColumn(5).width = 10
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

/* ── Costs — every line a SUMIFS on the account code ── */
function sheetCosts(ws, data, ctx) {
  const { ref, tb } = ctx
  base(ws); title(ws, 'Costs & expenditure', `${UNITS} · ${data.period}`); backLink(ws)
  const block = (heading, rows, totalLabel, grp) => {
    ws.addRow([heading]).getCell(1).font = { name: FONT, bold: true, size: 10, color: { argb: BRAND } }
    headerRow(ws, ['GL code', 'Account', "₦'000", 'Share'], 3)
    const first = ws.rowCount + 1
    rows.forEach(a => {
      const r = ws.addRow([a.code, a.name]); r.font = { name: FONT, size: 10 }
      r.getCell(3).value = { formula: `${sign(grp)}${SUMIFS(ref.bal, [[ref.code, a.code]])}` }
      styleCell(r.getCell(3), { color: C_LINK })
    })
    const last = ws.rowCount
    const tr = ws.addRow(['', totalLabel, rows.length ? { formula: `SUM(C${first}:C${last})` } : 0])
    tr.font = { name: FONT, size: 10, bold: true }; styleCell(tr.getCell(3), { bold: true }); ruleDouble(tr)
    for (let rr = first; rr <= last; rr++) {
      const c = ws.getRow(rr).getCell(4)
      c.value = { formula: `IF($C$${tr.number}=0,0,C${rr}/$C$${tr.number})` }
      styleCell(c, { fmt: PCTFMT })
    }
    ws.addRow([])
  }
  block('Operating expenses', tb.rows.filter(r => r.group === 'Operating expenses'), 'Total operating expenses', 'Operating expenses')
  block('Capital expenditure — movement in property, plant & equipment',
    tb.rows.filter(r => /property, plant/i.test(r.line)), 'Total capital expenditure', 'Non-current assets')
  ws.getColumn(1).width = 10; ws.getColumn(2).width = 44; ws.getColumn(3).width = 16; ws.getColumn(4).width = 10
  return {}
}

/* ── Working capital — balances from the TB, cycle from the statements ── */
function sheetWorkingCapital(ws, data, ctx) {
  const { ref, tb, refs } = ctx
  base(ws); title(ws, 'Working capital', `${UNITS} · ${data.period} · cycle on a 30-day period`); backLink(ws)
  const h = headerRow(ws, ['Metric', 'Value'])
  const w = workingCapital(data)
  const linesMatching = kw => [...new Set(tb.rows.filter(r => new RegExp(kw, 'i').test(r.line)).map(r => r.line))]
  const lineSum = (lines, neg) => lines.length
    ? `${neg ? '-' : ''}(${lines.map(l => SUMIFS(ref.bal, [[ref.line, l]])).join('+')})`
    : null
  const R = {}
  const row = (key, label, formula, fallback) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    const c = r.getCell(2)
    if (formula) { c.value = { formula }; styleCell(c, { color: C_LINK }) }
    else { c.value = val(fallback); styleCell(c, { color: C_INPUT }) }
    R[key] = r.number
  }
  row('ar', 'Trade receivables', lineSum(linesMatching('receivable'), false), w.ar)
  row('inv', 'Inventories', lineSum(linesMatching('inventor'), false), w.inventory)
  row('ap', 'Trade & other payables', lineSum(linesMatching('payable'), true), w.payables)
  const wc = ws.addRow(['Net working capital'])
  wc.font = { name: FONT, size: 10, bold: true }
  wc.getCell(2).value = { formula: `B${R.ar}+B${R.inv}-B${R.ap}` }
  styleCell(wc.getCell(2), { bold: true }); ruleAbove(wc)
  ws.addRow([])
  const inc = refs.income
  if (inc) {
    const days = (key, label, formula, bold = false) => {
      const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold }
      r.getCell(2).value = { formula }; styleCell(r.getCell(2), { fmt: DAYFMT, bold }); R[key] = r.number
      if (bold) ruleAbove(r)
    }
    days('dso', 'Days sales outstanding (DSO)', `IF(${inc.revenue}=0,0,B${R.ar}/${inc.revenue}*30)`)
    days('dio', 'Days inventory outstanding (DIO)', `IF(${inc.cogs}=0,0,B${R.inv}/${inc.cogs}*30)`)
    days('dpo', 'Days payables outstanding (DPO)', `IF(${inc.cogs}=0,0,B${R.ap}/${inc.cogs}*30)`)
    days('ccc', 'Cash conversion cycle', `B${R.dso}+B${R.dio}-B${R.dpo}`, true)
  }
  ws.getColumn(1).width = 36; ws.getColumn(2).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

function sheetRatios(ws, data, ctx) {
  const { refs } = ctx
  const r = data.ratios || {}
  const inc = refs.income, bal = refs.balancesheet
  base(ws); title(ws, 'Ratio analysis', `${data.period} · every ratio links to the statements`); backLink(ws)
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
  inc && bal ? rowF('Asset turnover', `IF(${bal.totalAssets}=0,0,${inc.revenue}/${bal.totalAssets})`, XFMT) : rowV('Asset turnover', r.asset_turnover, XFMT)
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 14
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
  base(ws); title(ws, 'Summary', `${UNITS} · ${data.period} · every figure looks up a statement line`); backLink(ws)
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
  line('ni', 'Profit for the period', inc?.netIncome, pl.pat, true)
  ws.addRow([])
  line('ta', 'Total assets', bal?.totalAssets, bs.total_assets)
  line('eq', 'Equity', bal?.equity, bs.total_equity)
  line('nc', 'Net change in cash', cf?.netChange, c.net_change)
  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const pctRow = (label, key) => { const row = ws.addRow([label]); row.font = { name: FONT, size: 10 }; row.getCell(2).value = { formula: `IF(B${R.rev}=0,0,B${R[key]}/B${R.rev})` }; styleCell(row.getCell(2), { fmt: PCTFMT }) }
  pctRow('Gross margin', 'gp'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'ni')
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 18
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
}

function coverSheet(ws, data, tabs) {
  base(ws)
  ws.addRow(['CIG Motors']).getCell(1).font = { name: FONT, bold: true, size: 24, color: { argb: BRAND } }
  ws.addRow(['Financial reporting pack']).getCell(1).font = { name: FONT, size: 13, color: { argb: INK } }
  ws.addRow([])
  ;[['Reporting period', data.period], ['Currency', 'Nigerian Naira (₦)'], ['Presentation', "₦'000 (thousands)"],
  ['Basis of preparation', 'Extracted from the general ledger. The trial balance is the source; the notes roll up from it and the statements from the notes.'],
  ['Formulas', 'SUMIFS and XLOOKUP, driven by labels rather than fixed cell addresses. Requires Excel 2021 or Microsoft 365.'],
  ['Prepared', new Date().toISOString().slice(0, 10)]]
    .forEach(([a, b]) => {
      const r = ws.addRow([a, b]); r.getCell(1).font = { name: FONT, size: 10, color: { argb: MUTED } }
      r.getCell(2).font = { name: FONT, size: 10 }; r.getCell(2).alignment = { wrapText: true }
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
  ws.getColumn(1).width = 20; ws.getColumn(2).width = 92
}

const CATALOG = [
  { id: 'income', label: 'Income statement', tab: IS_TAB, build: sheetIncome, order: 1, needsTB: true },
  { id: 'balancesheet', label: 'Balance sheet', tab: BS_TAB, build: sheetBalance, order: 1, needsTB: true },
  { id: 'cashflow', label: 'Cash flow', tab: 'Cash flow', build: sheetCash, order: 1, needsTB: true },
  { id: 'segments', label: 'Segment performance', tab: 'Segments', build: sheetSegments, order: 1, needsTB: true },
  { id: 'costs', label: 'Costs (opex + capex)', tab: 'Costs', build: sheetCosts, order: 1, needsTB: true },
  { id: 'workingcapital', label: 'Working capital', tab: 'Working capital', build: sheetWorkingCapital, order: 2, needsTB: true },
  { id: 'ratios', label: 'Ratios', tab: 'Ratios', build: sheetRatios, order: 2, needsTB: true },
  { id: 'commentary', label: 'Commentary', tab: 'Commentary', build: null, order: 2 },
]

async function download(wb, name) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Builds and returns the workbook. Separated from the download so the model
// can be generated (and verified) outside a browser.
export async function buildWorkbook(ids, data, buildCommentary, { withSummary = true, withCover = true } = {}) {
  const wb = await newWorkbook()
  const chosen = CATALOG.filter(s => ids.includes(s.id))
  const tb = chosen.some(s => s.needsTB) ? resolveTB(data) : null

  const tabNames = []
  if (withSummary && ids.length > 1) tabNames.push('Summary')
  if (tb) { tabNames.push(TB_TAB, NOTES_TAB) }
  chosen.forEach(s => tabNames.push(s.tab))

  if (withCover) coverSheet(wb.addWorksheet('Cover'), data, tabNames)
  const summaryWs = (withSummary && ids.length > 1) ? wb.addWorksheet('Summary') : null
  const tbWs = tb ? wb.addWorksheet(TB_TAB) : null
  const notesWs = tb ? wb.addWorksheet(NOTES_TAB) : null
  const wsById = {}
  chosen.forEach(s => { wsById[s.id] = wb.addWorksheet(s.tab) })

  const ref = tbWs ? sheetTrialBalance(tbWs, data, tb) : null
  const notes = notesWs ? sheetNotes(notesWs, data, tb, ref) : {}
  const refs = {}
  const ctx = { ref, notes, tb, refs }

  // statements first (they publish lookup refs), then dependent schedules
  chosen.filter(s => s.order === 1).forEach(s => { refs[s.id] = s.build(wsById[s.id], data, ctx) || {} })
  chosen.filter(s => s.order === 2).forEach(s => {
    if (s.id === 'commentary') sheetCommentary(wsById[s.id], data, buildCommentary)
    else s.build(wsById[s.id], data, ctx)
  })
  if (summaryWs) sheetSummary(summaryWs, data, refs)
  return wb
}

export async function exportWorkbook(ids, data, buildCommentary, opts = {}) {
  const wb = await buildWorkbook(ids, data, buildCommentary, opts)
  await download(wb, `CIG_Financials_${(data.period || '').replace(/[^\w-]/g, '_')}.xlsx`)
}

export async function exportStatement(kind, data, buildCommentary) {
  await exportWorkbook([kind], data, buildCommentary, { withSummary: false, withCover: false })
}

export const REPORT_CATALOG = CATALOG.map(({ id, label }) => ({ id, label }))
