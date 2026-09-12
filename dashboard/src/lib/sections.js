// Derived management-reporting sections computed live from the filtered data.

// ── Segment P&L: revenue, COGS, gross profit & margin per segment ──
export function segmentPL(data) {
  const pl = data.pl || {}
  const revBd = pl.revenue_breakdown || []
  const cogsBd = pl.cogs_breakdown || []
  const cogsByGroup = Object.fromEntries(cogsBd.map(g => [g.group, g.value]))
  const totalRev = pl.total_revenue || 0

  const rows = revBd.map(g => {
    const revenue = g.value
    const cogs = cogsByGroup[g.group] || 0
    const gp = revenue - cogs
    return {
      segment: g.group,
      revenue,
      cogs,
      gross_profit: gp,
      gp_margin: revenue ? gp / revenue * 100 : 0,
      mix: totalRev ? revenue / totalRev * 100 : 0,
      items: g.items || [],
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return rows
}

// ── Branch / location performance parsed from account-line labels ──
const BRANCHES = [
  { key: 'VI', label: 'Victoria Island', re: /\bVI\b|-VI\b|\sVI$/i },
  { key: 'Ojota', label: 'Ojota', re: /ojota/i },
  { key: 'Abuja', label: 'Abuja', re: /abuja/i },
  { key: 'SKD', label: 'SKD / Assembly', re: /\bSKD\b/i },
]

function classifyBranch(label) {
  for (const b of BRANCHES) if (b.re.test(label)) return b.label
  return 'Unspecified / group'
}

export function branchPerf(data) {
  const pl = data.pl || {}
  const acc = {}
  const add = (label, field, value) => {
    const br = classifyBranch(label)
    if (!acc[br]) acc[br] = { branch: br, revenue: 0, cogs: 0 }
    acc[br][field] += value
  }
  for (const g of (pl.revenue_breakdown || [])) for (const it of (g.items || [])) add(it.label, 'revenue', it.value)
  for (const g of (pl.cogs_breakdown || [])) for (const it of (g.items || [])) add(it.label, 'cogs', it.value)

  const totalRev = Object.values(acc).reduce((s, b) => s + b.revenue, 0)
  return Object.values(acc)
    .map(b => ({ ...b, gross_profit: b.revenue - b.cogs, gp_margin: b.revenue ? (b.revenue - b.cogs) / b.revenue * 100 : 0, mix: totalRev ? b.revenue / totalRev * 100 : 0 }))
    .filter(b => b.revenue > 0 || b.cogs > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

// ── Working capital & cash conversion cycle ──
function findItem(list, ...keywords) {
  return (list || []).filter(i => keywords.some(k => (i.label || '').toLowerCase().includes(k)))
    .reduce((s, i) => s + (i.value || 0), 0)
}

export function workingCapital(data) {
  const bs = data.bs || {}
  const pl = data.pl || {}
  const r = data.ratios || {}
  // Balances are shown as positive magnitudes (liabilities are stored net-negative)
  const ar = Math.abs(findItem(bs.current_assets, 'receivable'))
  const inventory = Math.abs(findItem(bs.current_assets, 'inventor'))
  const payables = Math.abs(findItem(bs.current_liabilities, 'payable'))
  const rev = Math.abs(pl.total_revenue || 0)
  const cogs = Math.abs(pl.total_cogs || 0)

  // Period basis (~30 days per displayed month)
  const days = 30
  const dso = rev ? ar / rev * days : null
  const dio = cogs ? inventory / cogs * days : null
  const dpo = cogs ? payables / cogs * days : null
  const ccc = (dso ?? 0) + (dio ?? 0) - (dpo ?? 0)

  return {
    ar, inventory, payables,
    current_assets: bs.total_current_assets,
    current_liabilities: bs.total_current_liabilities,
    working_capital: bs.working_capital,
    current_ratio: bs.current_ratio,
    quick_ratio: bs.quick_ratio,
    dso, dio, dpo, ccc,
  }
}

// ── Budget variance (empty until budget supplied) ──
export function budgetVariance(data) {
  const budgetByPeriod = data.budget_by_period || {}
  const pk = data._periodKey
  const budget = pk ? budgetByPeriod[pk] : null
  if (!budget) return null
  const pl = data.pl || {}
  const lines = [
    { label: 'Revenue', actual: pl.total_revenue, budget: budget.total_revenue },
    { label: 'Cost of sales', actual: pl.total_cogs, budget: budget.total_cogs },
    { label: 'Gross profit', actual: pl.gross_profit, budget: budget.gross_profit },
    { label: 'Operating expenses', actual: pl.total_opex, budget: budget.total_opex },
    { label: 'Operating profit', actual: pl.operating_profit, budget: budget.operating_profit },
  ]
  return lines.map(l => {
    const varceAbs = (l.actual || 0) - (l.budget || 0)
    return { ...l, var_abs: varceAbs, var_pct: l.budget ? varceAbs / Math.abs(l.budget) * 100 : null }
  })
}
