// Excel export — a Big 4-quality management reporting model for CIG Motors.
//
// Architecture:
//   Cover
//   Dashboard              (executive summary — KPI cards)
//   Management P&L         (segmented, decision-oriented)
//   Income statement       (statutory hierarchy, Actual | Prior | MoM | YTD)
//   Balance sheet          (every line tied to a note)
//   Cash flow              (three activity buckets)
//   Working capital        (DSO/DIO/DPO, cash conversion cycle)
//   Costs                  (opex categorised + capex)
//   Segments               (segment P&L)
//   Budget vs Actual       (blank until budget is loaded)
//   Ratios
//   Monthly trend          (months across columns)
//   Commentary
//   ── supporting ──
//   Notes to the accounts  (one note per statement line)
//   Trial Balance          (SOURCE — the only place a number is typed)
//
// Formula convention:
//   • Direct cell references everywhere — the exporter writes each sheet
//     and captures the row numbers, so links (statements → notes,
//     ratios → statements, dashboard → statements) use plain refs like
//     'Notes'!$C$42.
//   • SUMIFS on the Trial Balance for every account roll-up, so a new GL
//     account flowing through the pipeline is picked up automatically.
//
// Colour convention (documented on the Cover, matches Big 4 practice):
//   blue = hard input (only in the Trial Balance)
//   black = calculation on the same sheet
//   green = link to another sheet
//   red = adverse variance
//
// Presentation: full precision stored, displayed in ₦'000 via a scaling
// number format, gridlines off, frozen headers, internal hyperlinks.
import { workingCapital } from './sections'

const FONT = 'Calibri'
const NUMFMT = "#,##0,;(#,##0,)"   // stores full ₦, displays ₦'000
const PCTFMT = '0.0%'
const PCTPPT = '+0.0"ppt";-0.0"ppt";"—"'
const XFMT = '0.00"×"'
const DAYFMT = '0" days"'

const BRAND = 'FFC8102E'
const NAVY = 'FF1F3A5F'
const INK = 'FF1A1A1A'
const MUTED = 'FF7A736C'
const C_INPUT = 'FF0000CC'
const C_CALC = 'FF000000'
const C_LINK = 'FF007A3D'
const C_HYPER = 'FF0563C1'
const C_FAV = 'FF007A3D'
const C_UNFAV = 'FFC8102E'
const HEADFILL = 'FFF2F0ED'
const BANDFILL = 'FFFAF8F5'
const RULE = 'FFB9B2AA'

const TB_TAB = 'Trial Balance'
const NOTES_TAB = 'Notes'
const IS_TAB = 'Income statement'
const BS_TAB = 'Balance sheet'
const CF_TAB = 'Cash flow'
const UNITS = "All figures in ₦'000 unless stated"

const val = v => Math.round(v || 0)
const q = t => `'${String(t).replace(/'/g, "''")}'`

const PL_GROUPS = ['Revenue', 'Cost of sales', 'Operating expenses', 'Depreciation', 'Other income', 'Finance costs', 'Tax']
const BS_GROUPS = ['Current assets', 'Non-current assets', 'Current liabilities', 'Non-current liabilities', 'Equity']
const CREDIT_GROUPS = new Set(['Revenue', 'Other income', 'Current liabilities', 'Non-current liabilities', 'Equity'])
const sign = g => (CREDIT_GROUPS.has(g) ? '-' : '')

/* Categorise operating expense accounts into management categories */
const OPEX_CATEGORIES = [
  { key: 'Personnel', match: /staff|salary|salaries|wages|payroll|feeding|nsitf|pension|training|allowance|welfare|medical|hr /i },
  { key: 'Occupancy', match: /rent|utilit|electric|lease|water|security|clean|generator/i },
  { key: 'Selling & Marketing', match: /marketing|advert|promot|brand|sponsor|donation|corporate gift|photo & video/i },
  { key: 'Logistics & Transport', match: /fuel|transport|airport|clearing|shipping|logist|vehicle expense|towing|travel/i },
  { key: 'Professional & IT', match: /audit|legal|consult|professional|it |software|internet|telephone|subscription|dues/i },
  { key: 'Depreciation', match: /^depreciation|amortiz|amortis/i },
  { key: 'Administrative', match: /./ },   // fallback
]
const categoriseOpex = name => (OPEX_CATEGORIES.find(c => c.match.test(name)) || OPEX_CATEGORIES.at(-1)).key

/* ── modern formula helpers ── */
const esc = s => String(s).replace(/"/g, '""')
const SUMIFS = (sumRange, pairs) =>
  `SUMIFS(${sumRange},${pairs.map(([r, v]) => `${r},"${esc(v)}"`).join(',')})`
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
// A page header block written to every content sheet — the firm identity that
// appears on every page of a Big-4 pack ("CIG MOTORS | MANAGEMENT REPORT | May 2025")
// plus the sheet title and units line. Also sets print header/footer, gridlines
// off, and reasonable page setup (fit-to-width, repeat header on print).
const base = ws => {
  ws.views = [{ showGridLines: false }]
  ws.properties.defaultRowHeight = 15
  ws.properties.defaultColWidth = 12
  ws.pageSetup = ws.pageSetup || {}
  Object.assign(ws.pageSetup, {
    paperSize: 9,                    // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
  })
  ws.headerFooter = {
    oddHeader: '&L&"Calibri,Bold"&K1A1A1ACIG MOTORS  &"Calibri,Regular"&K7A736C|  Management Report&R&"Calibri,Regular"&K7A736C&D',
    oddFooter: '&L&"Calibri,Regular"&K7A736CConfidential — for management use&C&P of &N&RCIG Motors — Finance',
  }
}
// Firm identity block placed at the top of every content sheet. Two rows:
// small red "CIG MOTORS" wordmark on the first, "MANAGEMENT REPORT · [period]"
// on the second. Followed by the sheet title.
function pageHeader(ws, sheetTitle, sub, period) {
  const r1 = ws.addRow(['CIG MOTORS'])
  r1.getCell(1).font = { name: FONT, bold: true, size: 10, color: { argb: BRAND } }
  r1.getCell(1).alignment = { vertical: 'middle' }
  r1.height = 16
  const r2 = ws.addRow([`MANAGEMENT REPORT${period ? '  ·  ' + period : ''}`])
  r2.getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  r2.height = 14
  // thin brand rule under the identity block
  const ruleRow = ws.addRow([''])
  ruleRow.height = 4
  ruleRow.eachCell(c => { c.border = { bottom: { style: 'medium', color: { argb: BRAND } } } })
  ws.getCell(`A${ruleRow.number}`).border = { bottom: { style: 'medium', color: { argb: BRAND } } }
  // Ensure the rule spans the visible width by writing a placeholder value to a
  // handful of columns so ExcelJS emits the border on each.
  for (let c = 1; c <= 12; c++) { ws.getCell(ruleRow.number, c).border = { bottom: { style: 'medium', color: { argb: BRAND } } } }
  // Sheet title
  const tRow = ws.addRow([sheetTitle])
  tRow.getCell(1).font = { name: FONT, bold: true, size: 14, color: { argb: INK } }
  tRow.height = 22
  if (sub) {
    const s = ws.addRow([sub])
    s.getCell(1).font = { name: FONT, italic: true, size: 9, color: { argb: MUTED } }
  }
  ws.addRow([])   // breathing room
  return ws.rowCount   // last row of the header block
}
// Kept for backwards compat within this file — sheets that were calling title()
// now route through pageHeader() with the firm identity.
function title(ws, text, sub, period) { pageHeader(ws, text, sub, period) }

function backLink(ws) {
  const c = ws.getCell('N1')
  c.value = { text: '← Cover', hyperlink: `#${q('Cover')}!A1` }
  c.font = { name: FONT, size: 9, color: { argb: C_HYPER }, underline: true }
  c.alignment = { horizontal: 'right' }
  ws.getColumn(14).width = 11
}
function headerRow(ws, cells, rightFrom = 2) {
  const r = ws.addRow(cells)
  r.height = 18
  r.font = { name: FONT, bold: true, size: 9, color: { argb: INK } }
  r.eachCell((cell, i) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADFILL } }
    cell.border = { bottom: { style: 'thin', color: { argb: RULE } } }
    cell.alignment = { vertical: 'middle', horizontal: i >= rightFrom ? 'right' : 'left' }
  })
  return r
}
const styleCell = (cell, { color = C_CALC, fmt = NUMFMT, bold = false } = {}) => {
  cell.numFmt = fmt
  cell.font = { name: FONT, size: 10, bold, color: { argb: color } }
  cell.alignment = { vertical: 'middle', horizontal: 'right' }
}
const ruleAbove = row => row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } } } })
const ruleDouble = row => row.eachCell(c => { c.border = { ...(c.border || {}), top: { style: 'thin', color: { argb: RULE } }, bottom: { style: 'double', color: { argb: RULE } } } })
const noteKey = line => `Total — ${line}`
// Section header — small caps grey label used to break sheets into logical blocks
const sectionLabel = (ws, text) => {
  const r = ws.addRow([text])
  r.getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  r.getCell(1).alignment = { vertical: 'middle' }
  r.height = 18
  return r
}

/* ── Resolve the trial balance for the displayed period ── */
function resolveTB(data) {
  const meta = data.tb_meta || {}
  const byPeriod = data.tb_by_period || {}
  const openByPeriod = data.tb_opening_by_period || {}
  const openAvailable = !!data.tb_opening_available
  if (!Object.keys(meta).length || !Object.keys(byPeriod).length) return null

  const allPeriods = Object.keys(byPeriod).sort()
  const pk = data._periodKey && byPeriod[data._periodKey] ? data._periodKey
    : (byPeriod[data.period] ? data.period : null)

  let amounts, label, openBalances
  if (pk) {
    amounts = byPeriod[pk]
    openBalances = openByPeriod[pk] || {}
    label = pk
  } else {
    // aggregated (range / all periods): opening = earliest period's opening;
    // movements = sum over range
    amounts = {}
    Object.values(byPeriod).forEach(m => Object.entries(m).forEach(([code, [d, c]]) => {
      if (!amounts[code]) amounts[code] = [0, 0]
      amounts[code][0] += d; amounts[code][1] += c
    }))
    openBalances = openByPeriod[allPeriods[0]] || {}
    label = 'aggregated'
  }
  const rows = Object.entries(amounts).map(([code, [d, c]]) => {
    const m = meta[code] || {}
    return {
      code, name: m.name || code, group: m.group, line: m.line || m.group,
      note: m.note || '', cf: m.cf || '', segment: m.segment || '',
      opening: openBalances[code] || 0, debit: d, credit: c,
    }
  }).filter(r => r.group)
  // include BS accounts with an opening but no period movement (they still belong on the BS)
  const seen = new Set(rows.map(r => r.code))
  Object.entries(openBalances).forEach(([code, ob]) => {
    if (!seen.has(code) && meta[code]) {
      const m = meta[code]
      rows.push({
        code, name: m.name || code, group: m.group, line: m.line || m.group,
        note: m.note || '', cf: m.cf || '', segment: m.segment || '',
        opening: ob, debit: 0, credit: 0,
      })
    }
  })
  const order = [...PL_GROUPS, ...BS_GROUPS]
  rows.sort((a, b) => (order.indexOf(a.group) - order.indexOf(b.group)) || String(a.line).localeCompare(String(b.line)) || a.code.localeCompare(b.code))
  const lines = []
  rows.forEach(r => { if (!lines.some(l => l.line === r.line && l.group === r.group)) lines.push({ line: r.line, group: r.group }) })
  return { rows, label, lines, openAvailable, pk }
}

/* ── Period helpers for comparatives ── */
function periodContext(data, tb) {
  const months = (data.available_periods?.months) || []
  const pbp = data.pl_by_period || {}
  const pk = tb.pk && pbp[tb.pk] ? tb.pk : null
  const prev = pk ? months[months.indexOf(pk) - 1] : null
  const prior = prev && pbp[prev] ? prev : null
  // Same period prior year (YoY)
  let priorYear = null
  if (pk) {
    const [y, m] = pk.split('-'); const pyk = `${+y - 1}-${m}`
    if (pbp[pyk]) priorYear = pyk
  }
  // YTD: current year, all months up to and including pk
  let ytdMonths = [], ytdPriorMonths = []
  if (pk) {
    const [y] = pk.split('-')
    ytdMonths = months.filter(m => m.startsWith(y) && m <= pk)
    if (priorYear) {
      const [py, pm] = priorYear.split('-')
      ytdPriorMonths = months.filter(m => m.startsWith(py) && m <= priorYear)
    }
  }
  return { pk, prior, priorYear, ytdMonths, ytdPriorMonths, months, pbp }
}
function sumMonthsField(pbp, months, field) {
  return months.reduce((s, m) => s + (pbp[m]?.[field] || 0), 0)
}
const fmtMonth = k => { if (!k || !k.includes('-')) return k || ''; const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const [y, m] = k.split('-'); return `${M[+m - 1]} ${y}` }

/* ── Trial Balance sheet ── */
function sheetTrialBalance(ws, data, tb) {
  base(ws)
  const openNote = tb.openAvailable
    ? `opening balances rolled forward from Account_Summary`
    : `opening balances not available in this GL — current-period movements only`
  title(ws, 'Trial Balance', `${UNITS} · period ${tb.label} · ${openNote}`, data.period)
  backLink(ws)
  const h = headerRow(ws, ['GL code', 'Account', 'Statement line', 'Note', 'Group', 'Cash flow', 'Segment',
    'Opening', 'Debit', 'Credit', 'Closing'], 8)
  const first = ws.rowCount + 1
  tb.rows.forEach(r => {
    const row = ws.addRow([r.code, r.name, r.line, r.note, r.group, r.cf, r.segment,
      val(r.opening), val(r.debit), val(r.credit)])
    row.font = { name: FONT, size: 10 }
    styleCell(row.getCell(8), { color: C_INPUT })
    styleCell(row.getCell(9), { color: C_INPUT })
    styleCell(row.getCell(10), { color: C_INPUT })
    row.getCell(11).value = { formula: `H${row.number}+I${row.number}-J${row.number}` }
    styleCell(row.getCell(11))
  })
  const last = ws.rowCount
  const tr = ws.addRow(['', 'Total', '', '', '', '', '',
    { formula: `SUM(H${first}:H${last})` },
    { formula: `SUM(I${first}:I${last})` },
    { formula: `SUM(J${first}:J${last})` },
    { formula: `SUM(K${first}:K${last})` }])
  tr.font = { name: FONT, bold: true, size: 10 }
  ;[8, 9, 10, 11].forEach(c => styleCell(tr.getCell(c), { bold: true }))
  ruleDouble(tr)

  ws.getColumn(1).width = 10; ws.getColumn(2).width = 38; ws.getColumn(3).width = 30
  ws.getColumn(4).width = 30; ws.getColumn(5).width = 20; ws.getColumn(6).width = 12; ws.getColumn(7).width = 22
  ;[8, 9, 10, 11].forEach(c => ws.getColumn(c).width = 14)
  ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 2, ySplit: h.number }]
  ws.autoFilter = { from: { row: h.number, column: 1 }, to: { row: last, column: 11 } }

  const R = col => `${q(TB_TAB)}!$${col}$${first}:$${col}$${last}`
  return { code: R('A'), line: R('C'), group: R('E'), cf: R('F'), seg: R('G'), bal: R('K') }
}

/* ── Notes to the accounts ── */
function sheetNotes(ws, data, tb, ref) {
  base(ws)
  title(ws, 'Notes to the accounts', `${UNITS} · ${data.period} · each line is a SUMIFS to the Trial Balance`, data.period)
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
    notes[line] = { number: n, group, totalRow: tr.number }
    ws.addRow([])
  })
  ws.getColumn(1).width = 10; ws.getColumn(2).width = 46; ws.getColumn(3).width = 16
  return notes
}

/* Direct reference to a note total row on the Notes sheet — no XLOOKUP,
   because the row was captured at build time. Robust as long as nothing
   else re-orders the Notes sheet by hand. */
const noteRef = notes => line => `${q(NOTES_TAB)}!$C$${notes[line].totalRow}`
const notesFor = (notes, group) => Object.entries(notes).filter(([, v]) => v.group === group).map(([line, v]) => ({ line, ...v }))
const groupSum = (notes, group) => {
  const ns = notesFor(notes, group)
  return ns.length ? ns.map(x => `${q(NOTES_TAB)}!$C$${x.totalRow}`).join('+') : null
}
const noteRefs = (notes, group) => notesFor(notes, group).map(x => x.number).join(', ')

/* ── Income statement with Actual | Prior | MoM | YTD ── */
function sheetIncome(ws, data, ctx) {
  const { notes, periodCtx } = ctx
  const { pk, prior, ytdMonths, pbp } = periodCtx
  base(ws)
  const priorLbl = prior ? fmtMonth(prior) : 'Prior'
  const actualLbl = pk ? fmtMonth(pk) : 'Actual'
  title(ws, 'Income statement', `${UNITS} · ${actualLbl}${prior ? ` vs ${priorLbl}` : ''}${ytdMonths.length > 1 ? ` · YTD ${ytdMonths.length} months` : ''}`, data.period)
  backLink(ws)
  const h = headerRow(ws, ['', 'Note', actualLbl, priorLbl, 'MoM ₦', 'MoM %', 'YTD'], 3)
  const R = {}
  const cur = periodCtx.pk ? pbp[periodCtx.pk] : (data.pl || {})
  const prev = prior ? pbp[prior] : null

  const line = (key, label, group, plKey) => {
    const r = ws.addRow([label, noteRefs(notes, group)]); r.font = { name: FONT, size: 10 }
    r.getCell(2).alignment = { horizontal: 'center' }
    r.getCell(2).font = { name: FONT, size: 9, color: { argb: MUTED } }
    // Actual = SUM of the note totals for the group (green cross-sheet formula)
    const f = groupSum(notes, group)
    const c3 = r.getCell(3)
    if (f) { c3.value = { formula: f }; styleCell(c3, { color: C_LINK }) }
    else { c3.value = val(cur?.[plKey]); styleCell(c3, { color: C_INPUT }) }
    // Prior period (hard input from the prior-period JSON)
    r.getCell(4).value = prev ? val(prev[plKey]) : (prior ? 0 : null)
    if (prev) styleCell(r.getCell(4), { color: C_INPUT })
    // MoM absolute (black same-sheet)
    if (prev) { r.getCell(5).value = { formula: `C${r.number}-D${r.number}` }; styleCell(r.getCell(5)) }
    // MoM %
    if (prev) { r.getCell(6).value = { formula: `IF(D${r.number}=0,"",(C${r.number}-D${r.number})/ABS(D${r.number}))` }; styleCell(r.getCell(6), { fmt: PCTFMT }) }
    // YTD (sum from Jan of the current year to this period)
    if (ytdMonths.length) {
      const ytd = sumMonthsField(pbp, ytdMonths, plKey)
      r.getCell(7).value = val(ytd); styleCell(r.getCell(7), { color: C_INPUT })
    }
    R[key] = r.number
  }
  const calc = (key, label, formula, { pct = false, dbl = false, ytdFormula = null } = {}) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold: true }
    ;[3, 4, 7].forEach(ci => {
      const c = r.getCell(ci)
      if (ci === 4 && !prev) return
      if (ci === 7 && !ytdMonths.length) return
      const L = { 3: 'C', 4: 'D', 7: 'G' }[ci]
      c.value = { formula: formula(L) }
      styleCell(c, { bold: true, fmt: pct ? PCTFMT : NUMFMT })
    })
    if (prev) {
      r.getCell(5).value = { formula: `C${r.number}-D${r.number}` }; styleCell(r.getCell(5), { bold: true })
      r.getCell(6).value = { formula: `IF(D${r.number}=0,"",(C${r.number}-D${r.number})/ABS(D${r.number}))` }; styleCell(r.getCell(6), { bold: true, fmt: PCTFMT })
    }
    dbl ? ruleDouble(r) : ruleAbove(r)
    R[key] = r.number
  }
  line('rev', 'Revenue', 'Revenue', 'total_revenue')
  line('cogs', 'Cost of sales', 'Cost of sales', 'total_cogs')
  calc('gp', 'Gross profit', L => `${L}${R.rev}-${L}${R.cogs}`)
  line('opex', 'Operating expenses', 'Operating expenses', 'total_opex')
  line('dep', 'Depreciation & amortisation', 'Depreciation', 'total_depreciation')
  line('oi', 'Other income', 'Other income', 'total_other_income')
  calc('ebitda', 'EBITDA', L => `${L}${R.gp}-${L}${R.opex}+${L}${R.oi}`)
  calc('op', 'Operating profit (EBIT)', L => `${L}${R.ebitda}-${L}${R.dep}`)
  line('fin', 'Finance costs', 'Finance costs', 'total_finance_costs')
  calc('pbt', 'Profit before tax', L => `${L}${R.op}-${L}${R.fin}`)
  line('tax', 'Tax', 'Tax', 'total_tax')
  calc('pat', 'Profit for the period', L => `${L}${R.pbt}-${L}${R.tax}`, { dbl: true })
  ws.addRow([])
  ws.addRow(['Margins']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const pctRow = (label, key) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    r.getCell(3).value = { formula: `IF(C${R.rev}=0,0,C${R[key]}/C${R.rev})` }; styleCell(r.getCell(3), { fmt: PCTFMT })
    if (prev) {
      r.getCell(4).value = { formula: `IF(D${R.rev}=0,0,D${R[key]}/D${R.rev})` }; styleCell(r.getCell(4), { fmt: PCTFMT })
      r.getCell(6).value = { formula: `(C${r.number}-D${r.number})*100` }; styleCell(r.getCell(6), { fmt: PCTPPT })
    }
    if (ytdMonths.length) { r.getCell(7).value = { formula: `IF(G${R.rev}=0,0,G${R[key]}/G${R.rev})` }; styleCell(r.getCell(7), { fmt: PCTFMT }) }
  }
  pctRow('Gross margin', 'gp'); pctRow('EBITDA margin', 'ebitda'); pctRow('Operating margin', 'op'); pctRow('Net margin', 'pat')

  ws.getColumn(1).width = 34; ws.getColumn(2).width = 6
  ;[3, 4, 5, 7].forEach(c => ws.getColumn(c).width = 14)
  ws.getColumn(6).width = 10
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]

  return { R, revRow: R.rev, cogsRow: R.cogs, gpRow: R.gp, ebitdaRow: R.ebitda, opRow: R.op, pbtRow: R.pbt, patRow: R.pat }
}

/* ── Balance sheet ── */
function sheetBalance(ws, data, ctx) {
  const { notes } = ctx
  base(ws); title(ws, 'Balance sheet', `${UNITS} · ${data.period}`, data.period); backLink(ws)
  const h = headerRow(ws, ['', 'Note', "₦'000"], 2)
  const R = {}
  const section = (heading, group, key) => {
    ws.addRow([heading]).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
    const ns = notesFor(notes, group)
    const first = ws.rowCount + 1
    ns.forEach(nn => {
      const r = ws.addRow([`   ${nn.line}`, nn.number]); r.font = { name: FONT, size: 10 }
      r.getCell(2).alignment = { horizontal: 'center' }; r.getCell(2).font = { name: FONT, size: 9, color: { argb: MUTED } }
      r.getCell(3).value = { formula: `${q(NOTES_TAB)}!$C$${nn.totalRow}` }; styleCell(r.getCell(3), { color: C_LINK })
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
  const chk = ws.addRow(['Balance check — total assets less total liabilities & equity', '', { formula: `C${R.ta}-C${R.tle}` }])
  chk.font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } }
  styleCell(chk.getCell(3), { fmt: NUMFMT })
  if (!ctx.tb.openAvailable) {
    const note = ws.addRow(['Balance sheet reflects period movements only; opening balances not supplied by the source GL.'])
    note.getCell(1).font = { name: FONT, size: 9, italic: true, color: { argb: MUTED } }
  }
  ws.getColumn(1).width = 44; ws.getColumn(2).width = 6; ws.getColumn(3).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]

  return {
    R,
    caRow: R.ca, ncaRow: R.nca, taRow: R.ta,
    clRow: R.cl, nclRow: R.ncl, tlRow: R.tl, eqRow: R.eq, tleRow: R.tle,
  }
}

/* ── Cash flow ── */
function sheetCash(ws, data, ctx) {
  const { ref, tb } = ctx
  base(ws); title(ws, 'Cash flow', `${UNITS} · ${data.period} · classified by GL cash-flow category`, data.period); backLink(ws)
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
  return { ncRow: nc.number }
}

/* ── Management P&L (segmented) ── */
function sheetManagementPL(ws, data, ctx) {
  const { ref, tb, refs } = ctx
  const isRef = refs.income
  base(ws); title(ws, 'Management P&L', `${UNITS} · ${data.period} · segmented for decision-making`, data.period); backLink(ws)
  const h = headerRow(ws, ['', "₦'000", '% of revenue'])
  const R = {}
  const segments = [...new Set(tb.rows.filter(r => ['Revenue', 'Cost of sales'].includes(r.group)).map(r => r.segment))].filter(Boolean)

  // Revenue by segment
  ws.addRow(['Revenue']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const revFirst = ws.rowCount + 1
  segments.forEach(s => {
    const r = ws.addRow([`   ${s}`]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: `-${SUMIFS(ref.bal, [[ref.group, 'Revenue'], [ref.seg, s]])}` }
    styleCell(r.getCell(2), { color: C_LINK })
  })
  const revLast = ws.rowCount
  const revTotal = ws.addRow(['Total revenue', { formula: `SUM(B${revFirst}:B${revLast})` }])
  revTotal.font = { name: FONT, size: 10, bold: true }; styleCell(revTotal.getCell(2), { bold: true }); ruleAbove(revTotal)
  R.rev = revTotal.number
  ws.addRow([])
  // Cost of sales by segment
  ws.addRow(['Cost of sales']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const cogsFirst = ws.rowCount + 1
  segments.forEach(s => {
    const r = ws.addRow([`   ${s}`]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: SUMIFS(ref.bal, [[ref.group, 'Cost of sales'], [ref.seg, s]]) }
    styleCell(r.getCell(2), { color: C_LINK })
  })
  const cogsLast = ws.rowCount
  const cogsTotal = ws.addRow(['Total cost of sales', { formula: `SUM(B${cogsFirst}:B${cogsLast})` }])
  cogsTotal.font = { name: FONT, size: 10, bold: true }; styleCell(cogsTotal.getCell(2), { bold: true }); ruleAbove(cogsTotal)
  R.cogs = cogsTotal.number
  const gp = ws.addRow(['Gross profit', { formula: `B${R.rev}-B${R.cogs}` }])
  gp.font = { name: FONT, size: 10, bold: true }; styleCell(gp.getCell(2), { bold: true }); ruleDouble(gp)
  R.gp = gp.number
  ws.addRow([])
  // Operating expenses by management category
  ws.addRow(['Operating expenses']).getCell(1).font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } }
  const opexAccounts = tb.rows.filter(r => r.group === 'Operating expenses')
  const byCat = new Map()
  opexAccounts.forEach(a => {
    const cat = categoriseOpex(a.name); if (!byCat.has(cat)) byCat.set(cat, []); byCat.get(cat).push(a)
  })
  const opexFirst = ws.rowCount + 1
  Array.from(byCat.entries()).forEach(([cat, accs]) => {
    const r = ws.addRow([`   ${cat}`]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: accs.map(a => SUMIFS(ref.bal, [[ref.code, a.code]])).join('+') }
    styleCell(r.getCell(2), { color: C_LINK })
  })
  const opexLast = ws.rowCount
  const opexTotal = ws.addRow(['Total operating expenses', { formula: `SUM(B${opexFirst}:B${opexLast})` }])
  opexTotal.font = { name: FONT, size: 10, bold: true }; styleCell(opexTotal.getCell(2), { bold: true }); ruleAbove(opexTotal)
  R.opex = opexTotal.number
  const ebitda = ws.addRow(['EBITDA', { formula: `B${R.gp}-B${R.opex}` }])
  ebitda.font = { name: FONT, size: 10, bold: true }; styleCell(ebitda.getCell(2), { bold: true }); ruleDouble(ebitda)
  R.ebitda = ebitda.number

  // % of revenue column — computed on the same sheet
  for (let rr = revFirst; rr <= ebitda.number; rr++) {
    if (ws.getRow(rr).getCell(2).value == null) continue
    const c = ws.getRow(rr).getCell(3)
    c.value = { formula: `IF($B$${R.rev}=0,"",B${rr}/$B$${R.rev})` }
    styleCell(c, { fmt: PCTFMT })
  }

  ws.getColumn(1).width = 40; ws.getColumn(2).width = 16; ws.getColumn(3).width = 12
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return { R }
}

/* ── Segments schedule ── */
function sheetSegments(ws, data, ctx) {
  const { ref, tb } = ctx
  base(ws); title(ws, 'Segment performance', `${UNITS} · ${data.period}`, data.period); backLink(ws)
  const h = headerRow(ws, ['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'GP margin', 'Rev mix'])
  const segs = [...new Set(tb.rows.filter(r => ['Revenue', 'Cost of sales'].includes(r.group)).map(r => r.segment))].filter(Boolean)
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
  // rev mix from same-sheet total
  for (let rr = first; rr <= last; rr++) {
    const c = ws.getRow(rr).getCell(6)
    c.value = { formula: `IF($B$${tr.number}=0,0,B${rr}/$B$${tr.number})` }
    styleCell(c, { fmt: PCTFMT })
  }
  ws.getColumn(1).width = 30;[2, 3, 4].forEach(c => ws.getColumn(c).width = 14); ws.getColumn(5).width = 12; ws.getColumn(6).width = 10
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

/* ── Costs (opex + capex) ── */
function sheetCosts(ws, data, ctx) {
  const { ref, tb } = ctx
  base(ws); title(ws, 'Costs & expenditure', `${UNITS} · ${data.period}`, data.period); backLink(ws)
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

/* ── Working capital ── */
function sheetWorkingCapital(ws, data, ctx) {
  const { ref, tb, refs } = ctx
  base(ws); title(ws, 'Working capital', `${UNITS} · ${data.period} · cycle on a 30-day period`, data.period); backLink(ws)
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
    // Direct cross-sheet references to known IS rows (no XLOOKUP — the rows
    // were written by us and don't move at recalc)
    const revCell = `${q(IS_TAB)}!$C$${inc.revRow}`
    const cogsCell = `${q(IS_TAB)}!$C$${inc.cogsRow}`
    const days = (key, label, formula, bold = false) => {
      const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold }
      r.getCell(2).value = { formula }; styleCell(r.getCell(2), { fmt: DAYFMT, bold, color: bold ? C_CALC : C_LINK }); R[key] = r.number
      if (bold) ruleAbove(r)
    }
    days('dso', 'Days sales outstanding (DSO)', `IF(${revCell}=0,0,B${R.ar}/${revCell}*30)`)
    days('dio', 'Days inventory outstanding (DIO)', `IF(${cogsCell}=0,0,B${R.inv}/${cogsCell}*30)`)
    days('dpo', 'Days payables outstanding (DPO)', `IF(${cogsCell}=0,0,B${R.ap}/${cogsCell}*30)`)
    days('ccc', 'Cash conversion cycle', `B${R.dso}+B${R.dio}-B${R.dpo}`, true)
  }
  ws.getColumn(1).width = 36; ws.getColumn(2).width = 16
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

/* ── Ratios ── */
function sheetRatios(ws, data, ctx) {
  const { refs } = ctx
  const inc = refs.income, bal = refs.balancesheet
  const r = data.ratios || {}
  base(ws); title(ws, 'Ratio analysis', `${data.period} · direct references to the statement rows above`, data.period); backLink(ws)
  const h = headerRow(ws, ['Ratio', 'Value'])
  // Direct cross-sheet cell references
  const cell = (tab, row, col = 'C') => `${q(tab)}!$${col}$${row}`
  const isCell = key => cell(IS_TAB, inc[`${key}Row`])
  const bsCell = key => cell(BS_TAB, bal[`${key}Row`])
  const rowF = (label, formula, fmt) => {
    const row = ws.addRow([label]); row.font = { name: FONT, size: 10 }
    row.getCell(2).value = { formula }; styleCell(row.getCell(2), { color: C_LINK, fmt })
  }
  const rowV = (label, v, fmt) => {
    const row = ws.addRow([label, v ?? null]); row.font = { name: FONT, size: 10 }
    if (typeof v === 'number') styleCell(row.getCell(2), { color: C_INPUT, fmt })
  }
  if (bal) rowF('Current ratio', `IF(${bsCell('cl')}=0,0,${bsCell('ca')}/${bsCell('cl')})`, XFMT)
  else rowV('Current ratio', r.current_ratio, XFMT)
  if (inc) {
    rowF('Gross margin', `IF(${isCell('rev')}=0,0,${isCell('gp')}/${isCell('rev')})`, PCTFMT)
    rowF('EBITDA margin', `IF(${isCell('rev')}=0,0,${isCell('ebitda')}/${isCell('rev')})`, PCTFMT)
    rowF('Operating margin', `IF(${isCell('rev')}=0,0,${isCell('op')}/${isCell('rev')})`, PCTFMT)
    rowF('Net margin', `IF(${isCell('rev')}=0,0,${isCell('pat')}/${isCell('rev')})`, PCTFMT)
  } else {
    rowV('Gross margin', (r.gross_margin ?? 0) / 100, PCTFMT); rowV('Operating margin', (r.operating_margin ?? 0) / 100, PCTFMT); rowV('Net margin', (r.net_margin ?? 0) / 100, PCTFMT)
  }
  if (inc && bal) rowF('Return on assets', `IF(${bsCell('ta')}=0,0,${isCell('pat')}/${bsCell('ta')})`, PCTFMT)
  else rowV('Return on assets', (r.roa ?? 0) / 100, PCTFMT)
  if (inc && bal) rowF('Return on equity', `IF(${bsCell('eq')}=0,0,${isCell('pat')}/${bsCell('eq')})`, PCTFMT)
  else rowV('Return on equity', (r.roe ?? 0) / 100, PCTFMT)
  if (bal) rowF('Debt-to-equity', `IF(${bsCell('eq')}=0,0,${bsCell('tl')}/${bsCell('eq')})`, PCTFMT)
  else rowV('Debt-to-equity', (r.debt_to_equity ?? 0) / 100, PCTFMT)
  if (inc && bal) rowF('Asset turnover', `IF(${bsCell('ta')}=0,0,${isCell('rev')}/${bsCell('ta')})`, XFMT)
  else rowV('Asset turnover', r.asset_turnover, XFMT)
  ws.getColumn(1).width = 30; ws.getColumn(2).width = 14
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h.number }]
  return {}
}

/* ── Monthly Trend: months across columns ── */
function sheetMonthlyTrend(ws, data) {
  base(ws); title(ws, 'Monthly trend', `${UNITS} · every month in the file`, data.period); backLink(ws)
  const monthly = data.monthly || []
  if (!monthly.length) { ws.addRow(['No monthly data available']); return {} }
  const header = ['Metric', ...monthly.map(m => fmtMonth(m.period)), 'Total']
  const h = headerRow(ws, header, 2)
  const totalCol = header.length
  const inputRow = (label, key) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    monthly.forEach((m, i) => {
      const c = r.getCell(2 + i); c.value = val(m[key])
      styleCell(c, { color: C_INPUT })
    })
    const totalCell = r.getCell(totalCol)
    totalCell.value = { formula: `SUM(B${r.number}:${colLetter(totalCol - 1)}${r.number})` }
    styleCell(totalCell, { bold: true })
    return r.number
  }
  const calcRow = (label, formulaFn, bold = false, top = false, dbl = false) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10, bold }
    for (let i = 0; i < monthly.length; i++) {
      const L = colLetter(2 + i)
      const c = r.getCell(2 + i)
      c.value = { formula: formulaFn(L) }
      styleCell(c, { bold })
    }
    const L = colLetter(totalCol)
    const c = r.getCell(totalCol)
    c.value = { formula: formulaFn(L) }
    styleCell(c, { bold: true })
    if (dbl) ruleDouble(r); else if (top) ruleAbove(r)
    return r.number
  }
  const revR = inputRow('Revenue', 'revenue')
  const gpR = inputRow('Gross profit', 'gross_profit')
  const opR = inputRow('Operating profit', 'operating_profit')
  ws.addRow([])
  calcRow('Gross margin', L => `IF(${L}${revR}=0,0,${L}${gpR}/${L}${revR})`)
  const marginRow = ws.lastRow
  marginRow.eachCell(c => { c.numFmt = PCTFMT })

  // widths
  ws.getColumn(1).width = 22
  for (let i = 2; i <= totalCol; i++) ws.getColumn(i).width = 12
  ws.views = [{ showGridLines: false, state: 'frozen', xSplit: 1, ySplit: h.number }]
  return {}
}
function colLetter(n) { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26 } return s }

/* ── Budget vs Actual ── */
function sheetBudget(ws, data, ctx) {
  base(ws); title(ws, 'Budget vs Actual', data.period, data.period); backLink(ws)
  const has = data.available_data?.budget && data.budget_by_period?.[ctx.tb.pk]
  if (!has) {
    ws.addRow(['No budget loaded for this period.']).getCell(1).font = { name: FONT, italic: true, size: 10, color: { argb: MUTED } }
    ws.addRow([]).getCell(1)
    const note = ws.addRow(['Populate Budget_Template.xlsx (by GL code and month) and re-run the pipeline. Actual and Variance columns will populate automatically here.'])
    note.getCell(1).font = { name: FONT, size: 9, color: { argb: MUTED } }; note.getCell(1).alignment = { wrapText: true }
    ws.getColumn(1).width = 100
    return {}
  }
  const { refs } = ctx; const inc = refs.income
  const budget = data.budget_by_period[ctx.tb.pk]
  const h = headerRow(ws, ['Line', 'Actual', 'Budget', 'Variance', 'Var %', 'Fav / Adv'])
  const isCell = key => `${q(IS_TAB)}!$C$${inc[`${key}Row`]}`
  const line = (label, actualRef, budgetVal, favOnHigh = true) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: actualRef }; styleCell(r.getCell(2), { color: C_LINK })
    r.getCell(3).value = val(budgetVal); styleCell(r.getCell(3), { color: C_INPUT })
    r.getCell(4).value = { formula: `B${r.number}-C${r.number}` }; styleCell(r.getCell(4))
    r.getCell(5).value = { formula: `IF(C${r.number}=0,"",(B${r.number}-C${r.number})/ABS(C${r.number}))` }; styleCell(r.getCell(5), { fmt: PCTFMT })
    // Fav/Adv text
    r.getCell(6).value = { formula: `IF(D${r.number}=0,"—",IF(SIGN(D${r.number})=${favOnHigh ? 1 : -1},"Fav","Adv"))` }
    r.getCell(6).font = { name: FONT, size: 10 }
  }
  line('Revenue', isCell('rev'), budget.total_revenue, true)
  line('Cost of sales', isCell('cogs'), budget.total_cogs, false)
  line('Gross profit', isCell('gp'), budget.gross_profit, true)
  line('Operating expenses', isCell('opex'), budget.total_opex, false)
  line('Operating profit', isCell('op'), budget.operating_profit, true)
  ws.getColumn(1).width = 30;[2, 3, 4].forEach(c => ws.getColumn(c).width = 14); ws.getColumn(5).width = 10; ws.getColumn(6).width = 10
  return {}
}

/* ── Commentary ── */
function sheetCommentary(ws, data, buildCommentary) {
  base(ws); title(ws, 'Commentary', data.period, data.period); backLink(ws)
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

/* ── Executive Dashboard ── */
function sheetDashboard(ws, data, ctx) {
  const { refs } = ctx
  const inc = refs.income, bal = refs.balancesheet, cf = refs.cashflow
  base(ws)
  title(ws, `Executive Dashboard`, `CIG Motors · ${data.period}`, data.period)
  backLink(ws)

  // Financial KPI section
  ws.addRow(['Financial performance']).getCell(1).font = { name: FONT, bold: true, size: 11, color: { argb: NAVY } }
  const h1 = headerRow(ws, ['Metric', 'Actual (₦\'000)', 'vs Prior', 'MoM %'])
  const { pk, prior, pbp } = ctx.periodCtx
  const prev = prior ? pbp[prior] : null
  const cur = pk ? pbp[pk] : (data.pl || {})
  const isCell = key => inc ? `${q(IS_TAB)}!$C$${inc[`${key}Row`]}` : null

  const kpi = (label, actualRef, actualFallback, priorVal) => {
    const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
    if (actualRef) { r.getCell(2).value = { formula: actualRef }; styleCell(r.getCell(2), { color: C_LINK, bold: true }) }
    else { r.getCell(2).value = val(actualFallback); styleCell(r.getCell(2), { color: C_INPUT, bold: true }) }
    if (prev) {
      r.getCell(3).value = val(priorVal); styleCell(r.getCell(3), { color: C_INPUT })
      r.getCell(4).value = { formula: `IF(C${r.number}=0,"",(B${r.number}-C${r.number})/ABS(C${r.number}))` }
      styleCell(r.getCell(4), { fmt: PCTFMT })
    }
  }
  kpi('Revenue', isCell('rev'), cur?.total_revenue, prev?.total_revenue)
  kpi('Gross profit', isCell('gp'), cur?.gross_profit, prev?.gross_profit)
  kpi('EBITDA', isCell('ebitda'), (cur?.gross_profit || 0) - (cur?.total_opex || 0) + (cur?.total_other_income || 0),
    prev ? (prev.gross_profit || 0) - (prev.total_opex || 0) + (prev.total_other_income || 0) : null)
  kpi('Operating profit', isCell('op'), cur?.operating_profit, prev?.operating_profit)
  kpi('Profit for the period', isCell('pat'), cur?.pat, prev?.pat)
  if (cf) {
    const r = ws.addRow(['Net change in cash']); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = { formula: `${q(CF_TAB)}!$B$${cf.ncRow}` }
    styleCell(r.getCell(2), { color: C_LINK, bold: true })
  }
  ws.addRow([])

  // Segment performance
  ws.addRow(['Segment performance']).getCell(1).font = { name: FONT, bold: true, size: 11, color: { argb: NAVY } }
  headerRow(ws, ['Segment', "Revenue (₦'000)", 'Share'])
  const segments = data.segments?.revenue_by_segment || []
  const segFirst = ws.rowCount + 1
  segments.forEach(s => {
    const r = ws.addRow([s.name]); r.font = { name: FONT, size: 10 }
    r.getCell(2).value = val(s.value); styleCell(r.getCell(2), { color: C_INPUT })
  })
  const segLast = ws.rowCount
  const segTotal = ws.addRow(['Total', { formula: segments.length ? `SUM(B${segFirst}:B${segLast})` : 0 }])
  segTotal.font = { name: FONT, size: 10, bold: true }; styleCell(segTotal.getCell(2), { bold: true }); ruleAbove(segTotal)
  for (let rr = segFirst; rr <= segLast; rr++) {
    const c = ws.getRow(rr).getCell(3)
    c.value = { formula: `IF($B$${segTotal.number}=0,0,B${rr}/$B$${segTotal.number})` }
    styleCell(c, { fmt: PCTFMT })
  }

  ws.addRow([])
  ws.addRow(['Balance sheet snapshot']).getCell(1).font = { name: FONT, bold: true, size: 11, color: { argb: NAVY } }
  headerRow(ws, ['', "₦'000"])
  if (bal) {
    const bsCell = key => `${q(BS_TAB)}!$C$${bal[`${key}Row`]}`
    const bsLine = (label, key) => {
      const r = ws.addRow([label]); r.font = { name: FONT, size: 10 }
      r.getCell(2).value = { formula: bsCell(key) }; styleCell(r.getCell(2), { color: C_LINK, bold: true })
    }
    bsLine('Total assets', 'ta'); bsLine('Total liabilities', 'tl'); bsLine('Equity', 'eq')
  }

  ws.getColumn(1).width = 32; ws.getColumn(2).width = 20; ws.getColumn(3).width = 12; ws.getColumn(4).width = 10
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: h1.number }]
}

/* ── Cover ── */
function coverSheet(ws, data, tabs) {
  base(ws)
  ws.addRow(['CIG Motors']).getCell(1).font = { name: FONT, bold: true, size: 24, color: { argb: BRAND } }
  ws.addRow(['Management Report']).getCell(1).font = { name: FONT, size: 14, color: { argb: NAVY } }
  ws.addRow([data.period]).getCell(1).font = { name: FONT, size: 12, color: { argb: INK } }
  ws.addRow([])
  ;[['Currency', 'Nigerian Naira (₦)'], ['Presentation', "₦'000 (thousands)"],
  ['Basis of preparation', 'Extracted from the general ledger. The Trial Balance is the source; the Notes roll up from it and the statements roll up from the Notes.'],
  ['Formula convention', 'Direct cell references throughout; SUMIFS for account roll-ups on the Trial Balance. Compatible with every version of Excel that supports SUMIFS (Excel 2007 onward).'],
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
  ['Green', 'Link to another sheet', C_LINK],
  ['Red', 'Adverse variance', C_UNFAV]].forEach(([a, b, col]) => {
    const r = ws.addRow([a, b])
    r.getCell(1).font = { name: FONT, size: 10, bold: true, color: { argb: col } }
    r.getCell(2).font = { name: FONT, size: 10, color: { argb: MUTED } }
  })
  ws.getColumn(1).width = 20; ws.getColumn(2).width = 92
}

/* Catalog: order matches the reporting flow (source at the end).
   phase 1 = statements (publish refs), phase 2 = derived (consume refs),
   phase 3 = dashboard (needs everything). */
const CATALOG = [
  { id: 'dashboard', label: 'Dashboard', tab: 'Dashboard', build: sheetDashboard, phase: 3, needsTB: true },
  { id: 'management-pl', label: 'Management P&L', tab: 'Management P&L', build: sheetManagementPL, phase: 2, needsTB: true },
  { id: 'income', label: 'Income statement', tab: IS_TAB, build: sheetIncome, phase: 1, needsTB: true },
  { id: 'balancesheet', label: 'Balance sheet', tab: BS_TAB, build: sheetBalance, phase: 1, needsTB: true },
  { id: 'cashflow', label: 'Cash flow', tab: CF_TAB, build: sheetCash, phase: 1, needsTB: true },
  { id: 'workingcapital', label: 'Working capital', tab: 'Working capital', build: sheetWorkingCapital, phase: 2, needsTB: true },
  { id: 'costs', label: 'Costs (opex + capex)', tab: 'Costs', build: sheetCosts, phase: 2, needsTB: true },
  { id: 'segments', label: 'Segments', tab: 'Segments', build: sheetSegments, phase: 2, needsTB: true },
  { id: 'budget', label: 'Budget vs Actual', tab: 'Budget vs Actual', build: sheetBudget, phase: 2, needsTB: true },
  { id: 'ratios', label: 'Ratios', tab: 'Ratios', build: sheetRatios, phase: 2, needsTB: true },
  { id: 'trend', label: 'Monthly trend', tab: 'Monthly trend', build: sheetMonthlyTrend, phase: 2 },
  { id: 'commentary', label: 'Commentary', tab: 'Commentary', build: null, phase: 2 },
]

async function download(wb, name) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function buildWorkbook(ids, data, buildCommentary, { withSummary = true, withCover = true } = {}) {
  const wb = await newWorkbook()
  // Preserve catalog order (skill spec) regardless of selection order
  const chosen = CATALOG.filter(s => ids.includes(s.id))
  const tb = chosen.some(s => s.needsTB) ? resolveTB(data) : null

  // Tab order (as user will see them): Cover → chosen (in catalog order) → Notes → TB (source at end)
  const tabNames = []
  chosen.forEach(s => tabNames.push(s.tab))
  if (tb) { tabNames.push(NOTES_TAB); tabNames.push(TB_TAB) }

  if (withCover) coverSheet(wb.addWorksheet('Cover'), data, tabNames)
  const wsById = {}
  chosen.forEach(s => { wsById[s.id] = wb.addWorksheet(s.tab) })
  const notesWs = tb ? wb.addWorksheet(NOTES_TAB) : null
  const tbWs = tb ? wb.addWorksheet(TB_TAB) : null

  const ref = tbWs ? sheetTrialBalance(tbWs, data, tb) : null
  const notes = notesWs ? sheetNotes(notesWs, data, tb, ref) : {}
  const periodCtx = tb ? periodContext(data, tb) : {}
  const refs = {}
  const ctx = { ref, notes, tb, refs, periodCtx }

  // Phase 1: statements (publish row references others use)
  chosen.filter(s => s.phase === 1).forEach(s => { refs[s.id] = s.build(wsById[s.id], data, ctx) || {} })
  // Phase 2: derived (consume refs)
  chosen.filter(s => s.phase === 2).forEach(s => {
    if (s.id === 'commentary') sheetCommentary(wsById[s.id], data, buildCommentary)
    else if (s.id === 'trend') sheetMonthlyTrend(wsById[s.id], data)
    else s.build(wsById[s.id], data, ctx)
  })
  // Phase 3: dashboard (needs everything)
  chosen.filter(s => s.phase === 3).forEach(s => { s.build(wsById[s.id], data, ctx) })

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
