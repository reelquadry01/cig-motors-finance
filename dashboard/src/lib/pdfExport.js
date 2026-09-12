// PDF export — a clean, printable reporting pack. jsPDF + autotable are
// dynamically imported so they load only when the user exports.
// Figures in ₦'000 to match the Excel model.
import fmt from './fmt'
import { segmentPL, branchPerf, workingCapital } from './sections'

const BRAND = [200, 16, 46]
const INK = [32, 30, 29]
const MUTED = [120, 116, 112]
const FAV = [15, 95, 71]
const UNFAV = [158, 16, 57]

const t = v => fmt.th(v)            // ₦'000 with (parentheses) for negatives
const pct = v => fmt.pct(v)

/* Each builder returns { title, columns, rows } where a row is
   { cells:[...], bold?, top?, neg?:[colIdx...] } */
function bIncome(data) {
  const p = data.pl || {}
  const R = (label, val, o = {}) => ({ cells: [label, t(val)], neg: val < 0 ? [1] : [], ...o })
  return {
    title: 'Income statement', columns: ['Line item', "₦'000"],
    rows: [
      R('Revenue', p.total_revenue),
      R('Cost of sales', p.total_cogs),
      R('Gross profit', p.gross_profit, { bold: true, top: true }),
      R('Operating expenses', p.total_opex),
      R('Depreciation & amortisation', p.total_depreciation),
      R('Other income', p.total_other_income),
      R('Operating profit', p.operating_profit, { bold: true, top: true }),
      R('Finance costs', p.total_finance_costs),
      R('Profit before tax', p.pbt, { bold: true, top: true }),
      R('Tax', p.total_tax),
      R('Net income', p.pat, { bold: true, top: true }),
      { cells: ['Gross margin', pct(p.gp_margin)] },
      { cells: ['Operating margin', pct(p.op_margin)] },
      { cells: ['Net margin', pct(p.pat_margin)] },
    ],
  }
}

function bBalance(data) {
  const bs = data.bs || {}
  const rows = []
  const sec = (label, items, total) => {
    ;(items || []).forEach(i => rows.push({ cells: [`   ${i.label}`, t(i.value)], neg: i.value < 0 ? [1] : [] }))
    rows.push({ cells: [label, t(total)], bold: true, top: true, neg: total < 0 ? [1] : [] })
  }
  sec('Total current assets', bs.current_assets, bs.total_current_assets)
  sec('Total non-current assets', bs.non_current_assets, bs.total_non_current_assets)
  rows.push({ cells: ['Total assets', t(bs.total_assets)], bold: true, top: true })
  sec('Total current liabilities', bs.current_liabilities, bs.total_current_liabilities)
  sec('Total non-current liabilities', bs.non_current_liabilities, bs.total_non_current_liabilities)
  rows.push({ cells: ['Total liabilities', t(bs.total_liabilities)], bold: true, top: true, neg: bs.total_liabilities < 0 ? [1] : [] })
  sec('Total equity', bs.equity, bs.total_equity)
  return { title: 'Balance sheet', columns: ['Line item', "₦'000"], rows }
}

function bCash(data) {
  const cf = data.cf || {}
  const rows = []
  const sec = (label, s) => {
    ;(s?.items || []).forEach(i => rows.push({ cells: [`   ${i.label}`, t(i.value)], neg: i.value < 0 ? [1] : [] }))
    rows.push({ cells: [label, t(s?.total)], bold: true, top: true, neg: (s?.total || 0) < 0 ? [1] : [] })
  }
  sec('Net cash from operating activities', cf.operating)
  sec('Net cash from investing activities', cf.investing)
  sec('Net cash from financing activities', cf.financing)
  rows.push({ cells: ['Net change in cash', t(cf.net_change)], bold: true, top: true, neg: (cf.net_change || 0) < 0 ? [1] : [] })
  return { title: 'Cash flow', columns: ['Line item', "₦'000"], rows }
}

function bSegments(data) {
  const rows = segmentPL(data).map(r => ({ cells: [r.segment, t(r.revenue), t(r.cogs), t(r.gross_profit), pct(r.gp_margin)], neg: r.gross_profit < 0 ? [3] : [] }))
  return { title: 'Segment performance', columns: ['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'], rows }
}

function bBranches(data) {
  const rows = branchPerf(data).map(r => ({ cells: [r.branch, t(r.revenue), t(r.cogs), t(r.gross_profit), pct(r.gp_margin)], neg: r.gross_profit < 0 ? [3] : [] }))
  return { title: 'Branch performance', columns: ['Branch', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'], rows }
}

function bCosts(data) {
  const p = data.pl || {}
  const rows = (p.opex_breakdown || []).map(i => ({ cells: [i.label, t(i.value), pct(i.share)] }))
  rows.push({ cells: ['Total operating expenses', t(p.total_opex), '100%'], bold: true, top: true })
  rows.push({ cells: ['Capital expenditure', '', ''], bold: true })
  ;(p.capex_breakdown || []).forEach(i => rows.push({ cells: [`   ${i.label}`, t(i.value), pct(i.share)] }))
  rows.push({ cells: ['Total capital expenditure', t(p.capex), '100%'], bold: true, top: true })
  return { title: 'Costs & expenditure', columns: ['Line', "₦'000", 'Share'], rows }
}

function bWorkingCapital(data) {
  const w = workingCapital(data)
  const d = v => v == null || isNaN(v) ? '—' : Math.round(v) + ' days'
  return {
    title: 'Working capital', columns: ['Metric', 'Value'],
    rows: [
      { cells: ['Trade receivables', t(w.ar)] }, { cells: ['Inventories', t(w.inventory)] },
      { cells: ['Trade & other payables', t(w.payables)] },
      { cells: ['Net working capital', t(w.working_capital)], bold: true, top: true, neg: (w.working_capital || 0) < 0 ? [1] : [] },
      { cells: ['Days sales outstanding', d(w.dso)] }, { cells: ['Days inventory outstanding', d(w.dio)] },
      { cells: ['Days payables outstanding', d(w.dpo)] }, { cells: ['Cash conversion cycle', d(w.ccc)], bold: true },
    ],
  }
}

function bRatios(data) {
  const r = data.ratios || {}
  const x = v => v == null || isNaN(v) ? '—' : Number(v).toFixed(2) + '×'
  return {
    title: 'Ratio analysis', columns: ['Ratio', 'Value'],
    rows: [
      { cells: ['Current ratio', x(r.current_ratio)] }, { cells: ['Quick ratio', x(r.quick_ratio)] },
      { cells: ['Gross margin', pct(r.gross_margin)] }, { cells: ['Operating margin', pct(r.operating_margin)] },
      { cells: ['Net margin', pct(r.net_margin)] }, { cells: ['Return on equity', pct(r.roe)] },
      { cells: ['Return on assets', pct(r.roa)] }, { cells: ['Asset turnover', x(r.asset_turnover)] },
      { cells: ['Debt-to-equity', pct(r.debt_to_equity)] }, { cells: ['Interest coverage', x(r.interest_coverage)] },
    ],
  }
}

const TABLE_BUILDERS = {
  income: bIncome, balancesheet: bBalance, cashflow: bCash, segments: bSegments,
  branches: bBranches, costs: bCosts, workingcapital: bWorkingCapital, ratios: bRatios,
}

export async function exportPdf(ids, data, buildCommentary) {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40

  // ── Cover ──
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...MUTED)
  doc.text('MONTHLY MANAGEMENT REPORT', M, 90)
  doc.setFontSize(30); doc.setTextColor(...BRAND); doc.text('CIG Motors', M, 128)
  doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(16); doc.text('Financial reporting pack', M, 154)
  doc.setFontSize(11); doc.setTextColor(...MUTED)
  doc.text([`Reporting period:  ${data.period}`, `Currency:  Nigerian Naira — figures in ₦'000`,
    `Generated:  ${new Date().toISOString().slice(0, 10)}`], M, 190)

  const selected = ids.filter(id => TABLE_BUILDERS[id] || id === 'commentary')
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Contents', M, 250)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...MUTED)
  doc.text(selected.map((id, i) => `${i + 1}.  ${(TABLE_BUILDERS[id] ? '' : '') || ''}${labelFor(id)}`), M, 272)

  // ── Sections ──
  selected.forEach(id => {
    doc.addPage()
    if (id === 'commentary') return renderCommentary(doc, data, buildCommentary, M, W)
    const b = TABLE_BUILDERS[id](data)
    sectionHeader(doc, b.title, data.period, M, W)
    autoTable(doc, {
      startY: 96,
      head: [b.columns],
      body: b.rows.map(r => r.cells),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, textColor: INK },
      headStyles: { fontStyle: 'bold', fontSize: 8.5, textColor: MUTED, fillColor: [239, 237, 234], halign: 'right' },
      columnStyles: { 0: { halign: 'left', cellWidth: 'auto' } },
      margin: { left: M, right: M },
      didParseCell: (h) => {
        if (h.column.index > 0) h.cell.styles.halign = 'right'
        if (h.section !== 'body') return
        const row = b.rows[h.row.index]
        if (row?.bold) h.cell.styles.fontStyle = 'bold'
        if (row?.top) { h.cell.styles.lineWidth = { top: 0.75 }; h.cell.styles.lineColor = [190, 185, 178] }
        if (row?.neg?.includes(h.column.index)) h.cell.styles.textColor = UNFAV
      },
    })
  })

  addFooters(doc)
  const period = (data.period || '').replace(/[^\w-]/g, '_')
  doc.save(`CIG_Financials_${period}.pdf`)
}

function labelFor(id) {
  const map = { income: 'Income statement', balancesheet: 'Balance sheet', cashflow: 'Cash flow', segments: 'Segment performance', branches: 'Branch performance', costs: 'Costs & expenditure', workingcapital: 'Working capital', ratios: 'Ratio analysis', commentary: 'Commentary' }
  return map[id] || id
}

function sectionHeader(doc, title, period, M, W) {
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 4, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(32, 30, 29)
  doc.text(title, M, 58)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUTED)
  doc.text(`CIG Motors · ${period} · figures in ₦'000`, M, 74)
}

function renderCommentary(doc, data, buildCommentary, M, W) {
  sectionHeader(doc, 'Commentary', data.period, M, W)
  let y = 100
  const maxW = W - M * 2
  ;(buildCommentary ? buildCommentary(data) : []).forEach(sec => {
    if (y > 760) { doc.addPage(); sectionHeader(doc, 'Commentary (cont.)', data.period, M, W); y = 100 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BRAND); doc.text(sec.title, M, y); y += 18
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(32, 30, 29)
    sec.paras.forEach(p => {
      const lines = doc.splitTextToSize(p, maxW)
      if (y + lines.length * 13 > 800) { doc.addPage(); sectionHeader(doc, 'Commentary (cont.)', data.period, M, W); y = 100 }
      doc.text(lines, M, y); y += lines.length * 13 + 6
    })
    y += 8
  })
}

function addFooters(doc) {
  const n = doc.internal.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 146, 142)
    doc.text('CIG Motors — Finance', 40, H - 22)
    doc.text(`Page ${i} of ${n}`, W - 40, H - 22, { align: 'right' })
  }
}
