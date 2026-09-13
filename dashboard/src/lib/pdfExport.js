// PDF export — a Big-4 style management reporting pack. jsPDF + autotable
// are dynamically imported so they load only when the user exports.
//
// Design conventions (aligned with the Excel model and the CIG design brief):
//   • Every page carries "CIG MOTORS | MANAGEMENT REPORT | <period>" and a
//     confidentiality/footer line with page numbers.
//   • Tables auto-scale to the printable area — a wide table (Actual | Prior
//     | MoM | YTD) is placed on landscape A4, a narrow one on portrait.
//   • Colour matches the Excel model: brand red for the identity rule, navy
//     for section headings, muted grey for labels, green for favourable and
//     red for adverse variances, black for numbers.
//   • Helvetica everywhere for a consistent look (jsPDF's core Helvetica is
//     the safe default without embedding a font). Table body 9pt, headers
//     8.5pt, section title 14pt, page title 20pt on cover.
import fmt from './fmt'
import { segmentPL, branchPerf, workingCapital } from './sections'
import { CIG_LOGO_DATA_URL } from './logoAsset'
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './fontAsset'

// Register Roboto Regular + Bold with a jsPDF instance so every text() call
// draws in a proper finance-report typeface (with Latin-Ext coverage: ₦, ×,
// —, ·). Called once per document at the start of exportPdf().
function registerRoboto(doc) {
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64)
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')
}
const FONT_FAMILY = 'Roboto'

// Logo native aspect ratio (289 × 84 px)
const LOGO_RATIO = 289 / 84

const BRAND = [200, 16, 46]
const NAVY = [31, 58, 95]
const INK = [26, 26, 26]
const MUTED = [120, 116, 112]
const FAV = [0, 122, 61]
const UNFAV = [200, 16, 46]
const HEADFILL = [242, 240, 237]
const RULE = [185, 178, 170]

const PAGE_MARGIN = 36
const HEADER_H = 46          // top strip where the identity header lives
const FOOTER_H = 28          // bottom strip for footer

const t = v => fmt.th(v)
const pct = v => fmt.pct(v)

/* ─── Section builders — return {title, columns, rows, wide?} ─── */
function bIncome(data) {
  const p = data.pl || {}
  const R = (label, val, o = {}) => ({ cells: [label, t(val)], neg: val < 0 ? [1] : [], ...o })
  return {
    title: 'Income statement', columns: ['', "₦'000"],
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
      R('Profit for the period', p.pat, { bold: true, top: true, dbl: true }),
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
  rows.push({ cells: ['Total assets', t(bs.total_assets)], bold: true, top: true, dbl: true })
  sec('Total current liabilities', bs.current_liabilities, bs.total_current_liabilities)
  sec('Total non-current liabilities', bs.non_current_liabilities, bs.total_non_current_liabilities)
  rows.push({ cells: ['Total liabilities', t(bs.total_liabilities)], bold: true, top: true })
  sec('Total equity', bs.equity, bs.total_equity)
  rows.push({ cells: ['Total liabilities & equity', t((bs.total_liabilities || 0) + (bs.total_equity || 0))], bold: true, top: true, dbl: true })
  return { title: 'Balance sheet', columns: ['', "₦'000"], rows }
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
  rows.push({ cells: ['Net change in cash', t(cf.net_change)], bold: true, top: true, dbl: true, neg: (cf.net_change || 0) < 0 ? [1] : [] })
  return { title: 'Cash flow', columns: ['', "₦'000"], rows }
}

function bSegments(data) {
  const rows = segmentPL(data).map(r => ({ cells: [r.segment, t(r.revenue), t(r.cogs), t(r.gross_profit), pct(r.gp_margin)], neg: r.gross_profit < 0 ? [3] : [] }))
  return { title: 'Segment performance', columns: ['Segment', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'], rows, wide: true }
}

function bBranches(data) {
  const rows = branchPerf(data).map(r => ({ cells: [r.branch, t(r.revenue), t(r.cogs), t(r.gross_profit), pct(r.gp_margin)], neg: r.gross_profit < 0 ? [3] : [] }))
  return { title: 'Branch performance', columns: ['Branch', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'], rows, wide: true }
}

function bCosts(data) {
  const p = data.pl || {}
  const rows = (p.opex_breakdown || []).map(i => ({ cells: [i.label, t(i.value), pct(i.share)] }))
  rows.push({ cells: ['Total operating expenses', t(p.total_opex), '100%'], bold: true, top: true, dbl: true })
  rows.push({ cells: ['Capital expenditure — additions to PP&E', '', ''], bold: true })
  ;(p.capex_breakdown || []).forEach(i => rows.push({ cells: [`   ${i.label}`, t(i.value), pct(i.share)] }))
  rows.push({ cells: ['Total capital expenditure', t(p.capex), '100%'], bold: true, top: true, dbl: true })
  return { title: 'Costs & expenditure', columns: ['', "₦'000", 'Share'], rows }
}

function bWorkingCapital(data) {
  const w = workingCapital(data)
  const d = v => v == null || isNaN(v) ? '—' : Math.round(v) + ' days'
  return {
    title: 'Working capital', columns: ['Metric', 'Value'],
    rows: [
      { cells: ['Trade receivables', t(w.ar)] },
      { cells: ['Inventories', t(w.inventory)] },
      { cells: ['Trade & other payables', t(w.payables)] },
      { cells: ['Net working capital', t(w.working_capital)], bold: true, top: true, neg: (w.working_capital || 0) < 0 ? [1] : [] },
      { cells: [' ', ' '] },
      { cells: ['Days sales outstanding', d(w.dso)] },
      { cells: ['Days inventory outstanding', d(w.dio)] },
      { cells: ['Days payables outstanding', d(w.dpo)] },
      { cells: ['Cash conversion cycle', d(w.ccc)], bold: true, top: true },
    ],
  }
}

function bRatios(data) {
  const r = data.ratios || {}
  const x = v => v == null || isNaN(v) ? '—' : Number(v).toFixed(2) + '×'
  return {
    title: 'Ratio analysis', columns: ['Ratio', 'Value'],
    rows: [
      { cells: ['Current ratio', x(r.current_ratio)] },
      { cells: ['Quick ratio', x(r.quick_ratio)] },
      { cells: ['Gross margin', pct(r.gross_margin)] },
      { cells: ['Operating margin', pct(r.operating_margin)] },
      { cells: ['Net margin', pct(r.net_margin)] },
      { cells: ['Return on equity', pct(r.roe)] },
      { cells: ['Return on assets', pct(r.roa)] },
      { cells: ['Asset turnover', x(r.asset_turnover)] },
      { cells: ['Debt-to-equity', pct(r.debt_to_equity)] },
      { cells: ['Interest coverage', x(r.interest_coverage)] },
    ],
  }
}

const TABLE_BUILDERS = {
  income: bIncome, balancesheet: bBalance, cashflow: bCash, segments: bSegments,
  branches: bBranches, costs: bCosts, workingcapital: bWorkingCapital, ratios: bRatios,
}
const LABELS = {
  income: 'Income statement', balancesheet: 'Balance sheet', cashflow: 'Cash flow',
  segments: 'Segment performance', branches: 'Branch performance', costs: 'Costs & expenditure',
  workingcapital: 'Working capital', ratios: 'Ratio analysis', commentary: 'Commentary',
}

/* ─── Page identity + section title band ─── */
// The CIG / GAC lockup floats top-right; the "MANAGEMENT REPORT · <period>"
// mark sits top-left. Both are separated from the body by a thin brand rule.
function pageIdentity(doc, period) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 3, 'F')
  // logo top-right (native aspect ratio maintained)
  try {
    const h = 20, w = h * LOGO_RATIO
    doc.addImage(CIG_LOGO_DATA_URL, 'PNG', W - PAGE_MARGIN - w, 8, w, h, undefined, 'FAST')
  } catch { /* logo optional — never fail the page */ }
  doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text(`MANAGEMENT REPORT${period ? '  ·  ' + period : ''}`, PAGE_MARGIN, 22)
  doc.setDrawColor(...RULE); doc.setLineWidth(0.4)
  doc.line(PAGE_MARGIN, 34, W - PAGE_MARGIN, 34)
}
function sectionTitle(doc, title, subtitle) {
  doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(14); doc.setTextColor(...INK)
  doc.text(title, PAGE_MARGIN, 54)
  if (subtitle) {
    doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
    doc.text(subtitle, PAGE_MARGIN, 68)
  }
}
function pageFooter(doc, W, H) {
  doc.setDrawColor(...RULE); doc.setLineWidth(0.3)
  doc.line(PAGE_MARGIN, H - FOOTER_H + 4, W - PAGE_MARGIN, H - FOOTER_H + 4)
  doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED)
  doc.text('Confidential — for management use', PAGE_MARGIN, H - 14)
  doc.text('CIG Motors — Finance', W - PAGE_MARGIN, H - 14, { align: 'right' })
}

/* ─── Renderers ─── */
async function renderCover(doc, data, selected) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  // Full-width brand rule at top
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 4, 'F')
  // Large logo lockup, generously sized
  try {
    const h = 74, w = h * LOGO_RATIO
    doc.addImage(CIG_LOGO_DATA_URL, 'PNG', PAGE_MARGIN, 44, w, h, undefined, 'FAST')
  } catch { /* logo optional */ }
  // Small "MANAGEMENT REPORT" subtitle under the logo
  doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text('MANAGEMENT REPORT', PAGE_MARGIN, 136)
  // A thin brand rule separates the header block from the title
  doc.setDrawColor(...BRAND); doc.setLineWidth(1)
  doc.line(PAGE_MARGIN, 150, W - PAGE_MARGIN, 150)
  // Title
  doc.setTextColor(...INK); doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(30)
  doc.text('Management Report', PAGE_MARGIN, 195)
  doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(16); doc.setTextColor(...NAVY)
  doc.text(data.period || '', PAGE_MARGIN, 222)
  // Meta block
  doc.setFontSize(10); doc.setTextColor(...MUTED); doc.setFont(FONT_FAMILY, 'bold')
  const meta = [
    ['Reporting period', data.period || '—'],
    ['Currency', "Nigerian Naira (₦)"],
    ['Presentation', "₦'000 (thousands)"],
    ['Prepared', new Date().toISOString().slice(0, 10)],
  ]
  meta.forEach((r, i) => {
    doc.setFont(FONT_FAMILY, 'bold'); doc.setTextColor(...MUTED)
    doc.text(r[0], PAGE_MARGIN, 250 + i * 18)
    doc.setFont(FONT_FAMILY, 'normal'); doc.setTextColor(...INK)
    doc.text(r[1], PAGE_MARGIN + 130, 250 + i * 18)
  })
  // Contents
  doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text('Contents', PAGE_MARGIN, 350)
  doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(10)
  selected.forEach((id, i) => {
    doc.setTextColor(...MUTED); doc.text(String(i + 1).padStart(2, '0'), PAGE_MARGIN, 370 + i * 16)
    doc.setTextColor(...INK); doc.text(LABELS[id] || id, PAGE_MARGIN + 24, 370 + i * 16)
  })
  pageFooter(doc, W, H)
}

async function renderTable(doc, data, id, buildCommentary) {
  const b = TABLE_BUILDERS[id](data)
  doc.addPage(b.wide ? 'landscape' : 'portrait', 'a4')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  pageIdentity(doc, data.period)
  sectionTitle(doc, b.title, `CIG Motors · ${data.period} · figures in ₦'000`)
  const autoTable = (await import('jspdf-autotable')).default
  autoTable(doc, {
    startY: 82,
    head: [b.columns],
    body: b.rows.map(r => r.cells),
    theme: 'plain',
    styles: {
      font: FONT_FAMILY, fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
      textColor: INK, lineColor: RULE,
    },
    headStyles: {
      fontStyle: 'bold', fontSize: 8.5, textColor: INK,
      fillColor: HEADFILL, halign: 'right',
      lineWidth: { bottom: 0.6 }, lineColor: RULE,
    },
    columnStyles: { 0: { halign: 'left', cellWidth: 'auto' } },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: FOOTER_H + 6 },
    tableWidth: 'auto',
    didParseCell: (h) => {
      if (h.section !== 'body') return
      if (h.column.index > 0) h.cell.styles.halign = 'right'
      const row = b.rows[h.row.index]
      if (row?.bold) h.cell.styles.fontStyle = 'bold'
      if (row?.top) { h.cell.styles.lineWidth = { top: 0.5 }; h.cell.styles.lineColor = RULE }
      if (row?.dbl) { h.cell.styles.lineWidth = { top: 0.5, bottom: 1.2 }; h.cell.styles.lineColor = RULE }
      if (row?.neg?.includes(h.column.index)) h.cell.styles.textColor = UNFAV
    },
    didDrawPage: () => { pageIdentity(doc, data.period); pageFooter(doc, W, H) },
  })
}

async function renderCommentary(doc, data, buildCommentary) {
  doc.addPage('portrait', 'a4')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  pageIdentity(doc, data.period)
  sectionTitle(doc, 'Commentary', `CIG Motors · ${data.period}`)
  let y = 90
  const maxW = W - PAGE_MARGIN * 2
  const sections = buildCommentary ? buildCommentary(data) : []
  sections.forEach(sec => {
    if (y > H - FOOTER_H - 40) { doc.addPage('portrait', 'a4'); pageIdentity(doc, data.period); sectionTitle(doc, 'Commentary (cont.)', `CIG Motors · ${data.period}`); y = 90 }
    doc.setFont(FONT_FAMILY, 'bold'); doc.setFontSize(11); doc.setTextColor(...BRAND)
    doc.text(sec.title, PAGE_MARGIN, y); y += 16
    doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(10); doc.setTextColor(...INK)
    sec.paras.forEach(p => {
      const lines = doc.splitTextToSize(p, maxW)
      const needed = lines.length * 13 + 6
      if (y + needed > H - FOOTER_H - 10) { doc.addPage('portrait', 'a4'); pageIdentity(doc, data.period); sectionTitle(doc, 'Commentary (cont.)', `CIG Motors · ${data.period}`); y = 90 }
      doc.text(lines, PAGE_MARGIN, y); y += needed
    })
    y += 8
  })
  pageFooter(doc, W, H)
}

function addPageNumbers(doc) {
  const n = doc.internal.getNumberOfPages()
  const H = doc.internal.pageSize.getHeight()
  const W = doc.internal.pageSize.getWidth()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont(FONT_FAMILY, 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED)
    doc.text(`Page ${i} of ${n}`, W / 2, H - 14, { align: 'center' })
  }
}

export async function exportPdf(ids, data, buildCommentary) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  registerRoboto(doc)   // Roboto is now the base font — supports ₦, ×, —
  const selected = ids.filter(id => TABLE_BUILDERS[id] || id === 'commentary')
  // Cover
  await renderCover(doc, data, selected)
  // Sections
  for (const id of selected) {
    if (id === 'commentary') await renderCommentary(doc, data, buildCommentary)
    else await renderTable(doc, data, id)
  }
  addPageNumbers(doc)
  doc.save(`CIG_Financials_${(data.period || '').replace(/[^\w-]/g, '_')}.pdf`)
}
