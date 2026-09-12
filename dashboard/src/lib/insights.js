// Derives editorial KPIs and dynamic "things to watch" readings from the
// dashboard data. Everything here is computed live, so it re-derives whenever
// the active period / date range changes.
import fmt from './fmt'

export function ngSplit(v) {
  if (v === null || v === undefined || isNaN(v)) return { text: '—', unit: '' }
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1e9) return { text: `${sign}₦${(a / 1e9).toFixed(2)}`, unit: 'B' }
  if (a >= 1e6) return { text: `${sign}₦${(a / 1e6).toFixed(0)}`, unit: 'M' }
  return { text: `${sign}₦${Math.round(a).toLocaleString()}`, unit: '' }
}

// Month-on-month delta anchored to the displayed period. `periodKey` is the
// YYYY-MM of the selected month (null for day/range/year views, where MoM
// doesn't cleanly apply and the badge is suppressed).
function momDelta(monthly, key, periodKey) {
  if (!monthly || monthly.length < 2) return null
  let idx = periodKey ? monthly.findIndex(m => m.period === periodKey) : monthly.length - 1
  if (periodKey && idx < 0) return null
  if (!periodKey) return null
  if (idx < 1) return null
  const cur = monthly[idx]?.[key]
  const prev = monthly[idx - 1]?.[key]
  if (!prev) return null
  return Math.round((cur - prev) / Math.abs(prev) * 1000) / 10
}

// Concrete chart colors (recharts can't resolve CSS vars in SVG attrs)
const C = { brand: '#d81a37', accent: '#1394bd', green: '#2f9e6f', red: '#d94b6a' }

// Sum a P&L field across all months in the current year up to and including
// the anchored period — a proper YTD figure. Returns null when the anchor is
// not a specific month.
function ytdSum(data, field) {
  const pk = data._periodKey
  if (!pk) return null
  const pbp = data.pl_by_period || {}
  const [y] = pk.split('-')
  const months = Object.keys(pbp).filter(m => m.startsWith(y) && m <= pk).sort()
  if (months.length < 2) return null
  return months.reduce((s, m) => s + (pbp[m]?.[field] || 0), 0)
}
const ytdLabel = data => {
  const pk = data._periodKey
  if (!pk) return null
  const pbp = data.pl_by_period || {}
  const [y] = pk.split('-')
  const n = Object.keys(pbp).filter(m => m.startsWith(y) && m <= pk).length
  return n > 1 ? `YTD ${n}M ${y}` : null
}

export function buildKpis(data) {
  const pl = data.pl || {}
  const bs = data.bs || {}
  const monthly = data.monthly || []
  const pk = data._periodKey

  const rev = ngSplit(pl.total_revenue)
  const gp = ngSplit(pl.gross_profit)
  const ni = ngSplit(pl.pat)
  const ta = ngSplit(bs.total_assets)
  const ytdRev = ytdSum(data, 'total_revenue')
  const ytdGp = ytdSum(data, 'gross_profit')
  const ytdPat = ytdSum(data, 'pat')
  const ytdLbl = ytdLabel(data)
  const fmtYtd = v => v == null ? undefined : `${ytdLbl}: ${ngSplit(v).text}${ngSplit(v).unit}`

  return [
    {
      label: 'Revenue',
      valueText: rev.text, unit: rev.unit, value: pl.total_revenue,
      sub: `${(pl.gp_margin ?? 0).toFixed(1)}% gross margin`,
      delta: momDelta(monthly, 'revenue', pk), deltaLabel: 'MoM',
      note: fmtYtd(ytdRev),
      accent: C.brand,
      sparkData: monthly.map(m => ({ v: m.revenue })),
    },
    {
      label: 'Gross Profit',
      valueText: gp.text, unit: gp.unit, value: pl.gross_profit,
      sub: `${(pl.gp_margin ?? 0).toFixed(1)}% of revenue`,
      delta: momDelta(monthly, 'gross_profit', pk), deltaLabel: 'MoM',
      note: fmtYtd(ytdGp),
      accent: C.accent,
      sparkData: monthly.map(m => ({ v: m.gross_profit })),
    },
    {
      label: 'Net Income',
      valueText: ni.text, unit: ni.unit, value: pl.pat,
      sub: `${(pl.pat_margin ?? 0).toFixed(1)}% net margin`,
      delta: momDelta(monthly, 'operating_profit', pk), deltaLabel: 'MoM',
      note: fmtYtd(ytdPat),
      accent: pl.pat >= 0 ? C.green : C.red,
      sparkData: monthly.map(m => ({ v: m.operating_profit })),
    },
    {
      label: 'Total Assets',
      valueText: ta.text, unit: ta.unit, value: bs.total_assets,
      sub: bs.current_ratio ? `${bs.current_ratio.toFixed(2)}× current ratio` : 'Balance sheet',
      note: bs.working_capital !== undefined ? `${ngSplit(bs.working_capital).text}${ngSplit(bs.working_capital).unit} working capital` : undefined,
    },
  ]
}

// Punchy, dynamic finance readings — the "things to watch"
export function buildReadings(data) {
  const pl = data.pl || {}
  const bs = data.bs || {}
  const cf = data.cf || {}
  const ratios = data.ratios || {}
  const monthly = data.monthly || []
  const pk = data._periodKey
  const out = []

  const fmtB = v => fmt.money(v)
  const fmtM = v => fmt.money(v)

  // Revenue momentum
  const revD = momDelta(monthly, 'revenue', pk)
  if (revD !== null) {
    const dir = revD >= 0 ? 'up' : 'down'
    const anchorIdx = monthly.findIndex(m => m.period === pk)
    const priorRev = anchorIdx > 0 ? monthly[anchorIdx - 1].revenue : 0
    out.push({
      tone: revD >= 0 ? 'fav' : 'unfav',
      title: `Revenue ${dir} ${Math.abs(revD).toFixed(1)}% month-on-month`,
      detail: `The period closed at ${fmtB(pl.total_revenue)} against ${fmtB(priorRev)} the month before.`,
    })
  }

  // Gross margin
  if (pl.gp_margin !== undefined) {
    out.push({
      tone: pl.gp_margin >= 20 ? 'fav' : pl.gp_margin >= 10 ? 'warn' : 'unfav',
      title: `Gross margin at ${pl.gp_margin.toFixed(1)}%`,
      detail: `Gross profit of ${fmtB(pl.gross_profit)} on ${fmtB(pl.total_revenue)} of revenue after ${fmtB(pl.total_cogs)} cost of sales.`,
    })
  }

  // Profitability / opex drag
  if (pl.pat !== undefined) {
    const profitable = pl.pat >= 0
    out.push({
      tone: profitable ? 'fav' : 'unfav',
      title: profitable
        ? `Net profit of ${fmtM(Math.abs(pl.pat))} (${(pl.pat_margin ?? 0).toFixed(1)}% margin)`
        : `Net loss of ${fmtM(Math.abs(pl.pat))} for the period`,
      detail: `Operating expenses of ${fmtM(pl.total_opex)} absorbed ${pl.total_revenue ? (pl.total_opex / pl.total_revenue * 100).toFixed(0) : '—'}% of revenue; operating margin ${(pl.op_margin ?? 0).toFixed(1)}%.`,
    })
  }

  // Liquidity
  if (bs.current_ratio !== undefined && bs.current_ratio !== null) {
    const cr = bs.current_ratio
    out.push({
      tone: cr >= 1.5 ? 'fav' : cr >= 1 ? 'warn' : 'unfav',
      title: `Current ratio ${cr.toFixed(2)}×`,
      detail: cr >= 1
        ? `Working capital of ${fmtM(bs.working_capital)} — current assets cover current liabilities.`
        : `Current liabilities exceed current assets; working capital ${fmtM(bs.working_capital)}.`,
    })
  }

  // Cash movement
  if (cf.net_change !== undefined) {
    const up = cf.net_change >= 0
    out.push({
      tone: up ? 'fav' : 'warn',
      title: `Cash ${up ? 'rose' : 'fell'} ${fmtM(Math.abs(cf.net_change))} in the period`,
      detail: `Operating ${fmtM(cf.operating?.total)}, investing ${fmtM(cf.investing?.total)}, financing ${fmtM(cf.financing?.total)}.`,
    })
  }

  // Leverage
  if (ratios.debt_to_equity !== undefined && ratios.debt_to_equity !== null) {
    const de = ratios.debt_to_equity
    out.push({
      tone: de <= 100 ? 'fav' : de <= 200 ? 'warn' : 'unfav',
      title: `Debt-to-equity at ${de.toFixed(0)}%`,
      detail: `Asset turnover ${ratios.asset_turnover ?? '—'}× on total assets of ${fmtB(bs.total_assets)}.`,
    })
  }

  return out
}
