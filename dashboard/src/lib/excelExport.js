// Excel export with live formulas. ExcelJS is dynamically imported so it only
// loads when the user actually downloads. Figures are written in full Naira;
// subtotals and derived lines are real formulas so the file is an auditable,
// editable model (change a detail line and totals recompute in Excel).

const NUMFMT = '#,##0;(#,##0)'
const PCTFMT = '0.0%'
const BRAND = 'FFC8102E'

async function newWorkbook() {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'))
  return new ExcelJS.Workbook()
}

function setup(ws, title, subtitle) {
  ws.columns = [{ key: 'label', width: 46 }, { key: 'amount', width: 20 }]
  const t = ws.addRow([title]); t.font = { name: 'Calibri', bold: true, size: 15, color: { argb: BRAND } }
  const s = ws.addRow([subtitle]); s.font = { italic: true, size: 10, color: { argb: 'FF6B655E' } }
  ws.addRow([])
  const h = ws.addRow(['Line item', 'Amount (₦)'])
  h.font = { bold: true, size: 10 }
  h.getCell(2).alignment = { horizontal: 'right' }
  h.eachCell(c => { c.border = { bottom: { style: 'thin', color: { argb: 'FF999999' } } } })
  return ws.rowCount
}

function dataRow(ws, label, value, { indent = 1 } = {}) {
  const r = ws.addRow([label, value])
  r.getCell(1).alignment = { indent }
  r.getCell(2).numFmt = NUMFMT
  return r.number
}

function formulaRow(ws, label, formula, { bold = false, top = false } = {}) {
  const r = ws.addRow([label, { formula }])
  r.getCell(2).numFmt = NUMFMT
  if (bold) r.font = { bold: true }
  if (top) r.eachCell(c => { c.border = { top: { style: 'thin', color: { argb: 'FF999999' } } } })
  return r.number
}

// A section of detail rows followed by a SUM subtotal. Returns the subtotal row #.
function section(ws, label, items, { credit = false } = {}) {
  if (!items || items.length === 0) {
    return dataRow(ws, label, 0, { indent: 0 })
  }
  const first = ws.rowCount + 1
  items.forEach(it => dataRow(ws, it.label || it.name, Math.round((it.value ?? it) || 0)))
  const last = ws.rowCount
  return formulaRow(ws, label, `SUM(B${first}:B${last})`, { bold: true, top: true })
}

function flattenBreakdown(bd) {
  // segment -> account lines flattened to detail rows
  const out = []
  for (const g of (bd || [])) {
    if (g.items && g.items.length) for (const it of g.items) out.push({ label: `${g.group} — ${it.label}`, value: it.value })
    else out.push({ label: g.group, value: g.value })
  }
  return out
}

function buildIncome(ws, data) {
  const pl = data.pl || {}
  setup(ws, 'CIG Motors — Income statement', `${data.period} · figures in Naira (₦)`)

  const revRow = section(ws, 'Revenue', flattenBreakdown(pl.revenue_breakdown).length ? flattenBreakdown(pl.revenue_breakdown) : pl.revenue)
  const cogsRow = section(ws, 'Cost of sales', flattenBreakdown(pl.cogs_breakdown).length ? flattenBreakdown(pl.cogs_breakdown) : pl.cogs)
  const gpRow = formulaRow(ws, 'Gross profit', `B${revRow}-B${cogsRow}`, { bold: true })
  const opexRow = section(ws, 'Operating expenses', pl.opex_breakdown && pl.opex_breakdown.length ? pl.opex_breakdown : pl.opex)
  const depRow = dataRow(ws, 'Depreciation & amortisation', Math.round(pl.total_depreciation || 0), { indent: 0 })
  const oiRow = dataRow(ws, 'Other income', Math.round(pl.total_other_income || 0), { indent: 0 })
  const opRow = formulaRow(ws, 'Operating profit', `B${gpRow}-B${opexRow}-B${depRow}+B${oiRow}`, { bold: true })
  const finRow = dataRow(ws, 'Finance costs', Math.round(pl.total_finance_costs || 0), { indent: 0 })
  const pbtRow = formulaRow(ws, 'Profit before tax', `B${opRow}-B${finRow}`, { bold: true })
  const taxRow = dataRow(ws, 'Tax', Math.round(pl.total_tax || 0), { indent: 0 })
  const patRow = formulaRow(ws, 'Net income', `B${pbtRow}-B${taxRow}`, { bold: true, top: true })

  ws.addRow([])
  const mh = ws.addRow(['Margins', '']); mh.font = { bold: true, size: 10 }
  const addPct = (label, num) => {
    const r = ws.addRow([label, { formula: `IF(B${revRow}=0,0,B${num}/B${revRow})` }])
    r.getCell(1).alignment = { indent: 1 }; r.getCell(2).numFmt = PCTFMT
  }
  addPct('Gross margin', gpRow)
  addPct('Operating margin', opRow)
  addPct('Net margin', patRow)
}

function buildBalanceSheet(ws, data) {
  const bs = data.bs || {}
  setup(ws, 'CIG Motors — Balance sheet', `${data.period} · figures in Naira (₦)`)
  const caRow = section(ws, 'Total current assets', bs.current_assets)
  const ncaRow = section(ws, 'Total non-current assets', bs.non_current_assets)
  const taRow = formulaRow(ws, 'Total assets', `B${caRow}+B${ncaRow}`, { bold: true, top: true })
  ws.addRow([])
  const clRow = section(ws, 'Total current liabilities', bs.current_liabilities)
  const nclRow = section(ws, 'Total non-current liabilities', bs.non_current_liabilities)
  const tlRow = formulaRow(ws, 'Total liabilities', `B${clRow}+B${nclRow}`, { bold: true, top: true })
  const eqRow = section(ws, "Total equity", bs.equity)
  const teqlRow = formulaRow(ws, 'Total equity & liabilities', `B${tlRow}+B${eqRow}`, { bold: true, top: true })
  ws.addRow([])
  formulaRow(ws, 'Net assets (check: should equal equity)', `B${taRow}-B${tlRow}`, { bold: true })
  formulaRow(ws, 'Working capital', `B${caRow}-B${clRow}`)
  const cr = ws.addRow(['Current ratio', { formula: `IF(B${clRow}=0,0,B${caRow}/B${clRow})` }])
  cr.getCell(2).numFmt = '0.00"×"'
}

function buildCashFlow(ws, data) {
  const cf = data.cf || {}
  setup(ws, 'CIG Motors — Cash flow', `${data.period} · figures in Naira (₦)`)
  const opRow = section(ws, 'Net cash from operating activities', cf.operating?.items)
  const invRow = section(ws, 'Net cash from investing activities', cf.investing?.items)
  const finRow = section(ws, 'Net cash from financing activities', cf.financing?.items)
  formulaRow(ws, 'Net change in cash', `B${opRow}+B${invRow}+B${finRow}`, { bold: true, top: true })
}

function buildSimple(ws, title, data, rows) {
  setup(ws, title, `${data.period} · figures in Naira (₦)`)
  const first = ws.rowCount + 1
  rows.forEach(r => dataRow(ws, r.label, Math.round(r.value || 0), { indent: 0 }))
  const last = ws.rowCount
  formulaRow(ws, 'Total', `SUM(B${first}:B${last})`, { bold: true, top: true })
}

const BUILDERS = {
  income: (ws, d) => buildIncome(ws, d),
  balancesheet: (ws, d) => buildBalanceSheet(ws, d),
  cashflow: (ws, d) => buildCashFlow(ws, d),
  costs: (ws, d) => {
    buildSimple(ws, 'CIG Motors — Operating expenses', d, (d.pl?.opex_breakdown || []).map(i => ({ label: i.label, value: i.value })))
    const ws2 = ws.workbook.addWorksheet('Capital expenditure')
    buildSimple(ws2, 'CIG Motors — Capital expenditure', d, (d.pl?.capex_breakdown || []).map(i => ({ label: i.label, value: i.value })))
  },
}

const TITLES = { income: 'Income statement', balancesheet: 'Balance sheet', cashflow: 'Cash flow', costs: 'Costs' }

export async function exportStatement(kind, data) {
  const wb = await newWorkbook()
  const ws = wb.addWorksheet(TITLES[kind] || 'Statement')
  ;(BUILDERS[kind] || BUILDERS.income)(ws, data)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CIG_${TITLES[kind] || 'statement'}_${(data.period || '').replace(/[^\w-]/g, '_')}.xlsx`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
