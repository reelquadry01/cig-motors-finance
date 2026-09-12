// Dynamic, CFO-voice narrative generated live from the (period-filtered) data.
// Nothing here is hardcoded prose about a specific month — every figure and
// judgement is derived from the numbers in `data`, so it re-writes itself when
// the period / date range changes.

const B = v => `₦${(Math.abs(v || 0) / 1e9).toFixed(2)}B`
const M = v => `₦${(Math.abs(v || 0) / 1e6).toFixed(0)}M`
const P = (v, d = 1) => `${(v ?? 0).toFixed(d)}%`
const signed = v => (v >= 0 ? '' : '−') // minus glyph for narrative

function momDelta(monthly, key, pk) {
  if (!monthly || monthly.length < 2 || !pk) return null
  const idx = monthly.findIndex(m => m.period === pk)
  if (idx < 1) return null
  const cur = monthly[idx]?.[key], prev = monthly[idx - 1]?.[key]
  if (!prev) return null
  return { pct: (cur - prev) / Math.abs(prev) * 100, prev }
}

export function buildCfoCommentary(data) {
  const pl = data.pl || {}
  const bs = data.bs || {}
  const cf = data.cf || {}
  const ratios = data.ratios || {}
  const monthly = data.monthly || []
  const pk = data._periodKey
  const period = data.period || 'the period'

  const rev = pl.total_revenue || 0
  const gp = pl.gross_profit || 0
  const opex = pl.total_opex || 0
  const oi = pl.operating_profit || 0
  const pat = pl.pat || 0
  const opexRatio = rev ? opex / rev * 100 : 0
  const revMom = momDelta(monthly, 'revenue', pk)

  const topRev = (pl.revenue_breakdown || []).slice().sort((a, b) => b.value - a.value)[0]
  const topCogs = (pl.cogs_breakdown || []).slice().sort((a, b) => b.value - a.value)[0]

  const sections = []

  /* ── Executive summary ── */
  {
    const paras = []
    const verdict = pat >= 0
      ? `${period} was profitable, with net income of ${M(pat)} on revenue of ${B(rev)} (${P(pl.pat_margin)} net margin).`
      : `${period} closed in a loss of ${M(pat)} despite revenue of ${B(rev)}; the ${P(pl.pat_margin)} net margin reflects costs below the gross line outrunning trading profit.`
    paras.push(verdict)
    if (gp >= 0) {
      paras.push(`The business converts revenue to gross profit at ${P(pl.gp_margin)}, but operating margin lands at ${P(pl.op_margin)} — a ${P(Math.abs(pl.gp_margin - pl.op_margin))} gap driven by operating expenses of ${M(opex)} (${P(opexRatio)} of revenue).`)
    }
    if (revMom) {
      paras.push(`Top-line momentum is ${revMom.pct >= 0 ? 'positive' : 'negative'}: revenue moved ${signed(revMom.pct)}${P(Math.abs(revMom.pct))} versus the prior month (${B(revMom.prev)}).`)
    }
    sections.push({ key: 'summary', title: 'Executive summary', icon: 'clipboard', tone: pat >= 0 ? 'fav' : 'unfav', paras })
  }

  /* ── Revenue & profitability ── */
  {
    const paras = []
    paras.push(`Revenue of ${B(rev)} generated ${B(gp)} of gross profit after ${B(pl.total_cogs)} of cost of sales, a gross margin of ${P(pl.gp_margin)}.`)
    if (topRev) {
      paras.push(`${topRev.group} is the largest revenue line at ${B(topRev.value)} (${P(topRev.share)} of the total)${topRev.items?.[0] ? `, led by ${topRev.items[0].label} at ${M(topRev.items[0].value)}` : ''}.`)
    }
    if (topCogs) {
      paras.push(`On the cost side, ${topCogs.group} carries the heaviest cost of sales at ${B(topCogs.value)}${topCogs.items?.[0] ? `, with ${topCogs.items[0].label} the single biggest item (${M(topCogs.items[0].value)})` : ''}.`)
    }
    paras.push(oi >= 0
      ? `After ${M(opex)} of operating expenses and ${M(pl.total_depreciation)} of depreciation, operating profit is ${M(oi)} (${P(pl.op_margin)} margin).`
      : `Operating expenses of ${M(opex)} — ${P(opexRatio)} of revenue — pull the business to an operating loss of ${M(oi)}; controlling overhead is the clearest lever on profitability.`)
    sections.push({ key: 'profitability', title: 'Revenue & profitability', icon: 'trending', tone: gp >= 0 && pl.gp_margin >= 15 ? 'fav' : 'warn', paras })
  }

  /* ── Balance sheet & liquidity ── */
  {
    const paras = []
    paras.push(`The balance sheet carries ${B(bs.total_assets)} of assets against ${B(bs.total_liabilities)} of liabilities, leaving ${bs.total_equity >= 0 ? 'shareholders’ equity' : 'a net equity deficit'} of ${B(bs.total_equity)}.`)
    if (bs.current_ratio !== undefined && bs.current_ratio !== null) {
      paras.push(bs.current_ratio >= 1
        ? `Liquidity is adequate: a current ratio of ${bs.current_ratio.toFixed(2)}× and ${M(bs.working_capital)} of working capital mean current assets cover near-term obligations.`
        : `Liquidity is tight: a current ratio of ${bs.current_ratio.toFixed(2)}× and working capital of ${signed(bs.working_capital)}${M(bs.working_capital)} indicate current liabilities exceed current assets — a near-term funding watch-point.`)
    }
    if (bs.total_equity < 0) {
      paras.push(`Negative equity is a solvency flag: liabilities exceed assets, so recapitalisation or a return to sustained profitability is needed to rebuild the balance sheet.`)
    }
    sections.push({ key: 'balance_sheet', title: 'Balance sheet & liquidity', icon: 'scale', tone: (bs.current_ratio >= 1 && bs.total_equity >= 0) ? 'fav' : 'unfav', paras })
  }

  /* ── Cash flow ── */
  {
    const paras = []
    const nc = cf.net_change || 0
    paras.push(`Cash ${nc >= 0 ? 'increased' : 'decreased'} by ${M(nc)} over the period.`)
    paras.push(`Operating activities ${(cf.operating?.total || 0) >= 0 ? 'generated' : 'consumed'} ${M(cf.operating?.total)}, investing ${(cf.investing?.total || 0) >= 0 ? 'released' : 'absorbed'} ${M(cf.investing?.total)}, and financing ${(cf.financing?.total || 0) >= 0 ? 'raised' : 'repaid'} ${M(cf.financing?.total)}.`)
    if ((cf.operating?.total || 0) < 0) {
      paras.push(`Negative operating cash flow means day-to-day trading is not yet self-funding; the gap is being bridged by financing rather than operations.`)
    }
    sections.push({ key: 'cash_flow', title: 'Cash flow', icon: 'wallet', tone: nc >= 0 ? 'fav' : 'warn', paras })
  }

  /* ── Leverage & risk ── */
  if (ratios.debt_to_equity !== undefined || ratios.interest_coverage !== undefined) {
    const paras = []
    const de = ratios.debt_to_equity
    if (de !== undefined && de !== null) {
      paras.push(de <= 100
        ? `Leverage is moderate at ${P(de, 0)} debt-to-equity, giving headroom to fund growth with debt if returns justify it.`
        : `Leverage is elevated at ${P(de, 0)} debt-to-equity; further borrowing should be weighed carefully against coverage and cash generation.`)
    }
    if (ratios.interest_coverage !== undefined && ratios.interest_coverage !== null) {
      paras.push(`Interest cover stands at ${ratios.interest_coverage}× and asset turnover at ${ratios.asset_turnover ?? '—'}×, indicating how hard the asset base is working to produce revenue.`)
    }
    sections.push({ key: 'leverage', title: 'Leverage & risk', icon: 'bars', tone: (de ?? 0) <= 150 ? 'fav' : 'warn', paras })
  }

  return sections
}

// Recommended actions / watch-list, derived from the numbers.
export function buildActions(data) {
  const pl = data.pl || {}
  const bs = data.bs || {}
  const cf = data.cf || {}
  const out = []
  const opexRatio = pl.total_revenue ? pl.total_opex / pl.total_revenue * 100 : 0

  if (pl.op_margin < 0) out.push({ title: 'Rein in operating expenses', detail: `Opex is ${opexRatio.toFixed(0)}% of revenue and the business is operating below breakeven — the fastest route back to operating profit.` })
  if (pl.gp_margin < 15) out.push({ title: 'Protect gross margin', detail: `Gross margin of ${(pl.gp_margin ?? 0).toFixed(1)}% is thin; review pricing, landed cost and discounting by segment.` })
  if (bs.current_ratio < 1) out.push({ title: 'Shore up liquidity', detail: `Current ratio below 1.0× — negotiate payables, accelerate receivables, or secure working-capital facilities.` })
  if (bs.total_equity < 0) out.push({ title: 'Rebuild the equity base', detail: 'Negative equity needs a recapitalisation plan or a credible path to retained profits.' })
  if ((cf.operating?.total || 0) < 0) out.push({ title: 'Turn operations cash-generative', detail: 'Operating cash flow is negative; tighten the cash conversion cycle so trading funds itself.' })
  if (out.length === 0) out.push({ title: 'Sustain the trajectory', detail: 'No material red flags this period — hold discipline on cost and cash while pursuing growth.' })
  return out
}
