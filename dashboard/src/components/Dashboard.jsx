import fmt from '../lib/fmt'
import { MonthlyTrendChart, RevenueDonut, MarginGauge } from './Charts'

export default function Dashboard({ data }) {
  if (!data) return null
  const pl = data.pl
  const bs = data.bs
  const cf = data.cf
  const monthly = data.monthly || []
  const segments = data.segments?.revenue_by_segment || []

  const kpiItems = [
    {
      label: 'Revenue',
      formatted: fmt.ngB(pl?.total_revenue),
      badge: pl?.total_revenue > 0 ? 12.3 : undefined,
      sublabel: 'YTD',
      icon: '📈',
      iconBg: 'var(--brand-soft)',
      sparkData: monthly.map(m => ({ v: m.revenue })),
    },
    {
      label: 'Gross Profit',
      formatted: fmt.ngB(pl?.gross_profit),
      badge: pl?.gp_margin > 20 ? 5.2 : -2.1,
      sublabel: fmt.pct(pl?.gp_margin) + ' margin',
      icon: '💰',
      iconBg: 'var(--accent-soft)',
      sparkData: monthly.map(m => ({ v: m.gross_profit })),
    },
    {
      label: 'Net Income',
      formatted: fmt.ngM(pl?.pat),
      badge: pl?.pat_margin,
      sublabel: fmt.pct(pl?.pat_margin) + ' margin',
      icon: pl?.pat >= 0 ? '✅' : '⚠️',
      iconBg: pl?.pat >= 0 ? 'var(--fav-soft)' : 'var(--unfav-soft)',
      sparkData: monthly.map(m => ({ v: m.operating_profit })),
    },
    {
      label: 'Total Assets',
      formatted: fmt.ngB(bs?.total_assets),
      sublabel: 'Balance sheet',
      icon: '🏦',
      iconBg: 'rgba(167, 139, 250, 0.12)',
    },
  ]

  return (
    <div className="animate-in">
      {/* KPI Row */}
      <div style={{ marginBottom: 28 }}>
        <KpiCards items={kpiItems} monthlyData={monthly} />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, marginBottom: 28 }}>
        <MonthlyTrendChart data={monthly} />
        <RevenueDonut data={segments} total={pl?.total_revenue} />
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 20 }}>
        {/* P&L Summary */}
        <div className="card">
          <div className="chart-title">P&L highlights</div>
          {[
            { label: 'Revenue', value: pl?.total_revenue },
            { label: 'Cost of Sales', value: pl?.total_cogs },
            { label: 'Gross Profit', value: pl?.gross_profit },
            { label: 'Operating Expenses', value: pl?.total_opex },
            { label: 'Net Income', value: pl?.pat },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value">{fmt.ng0(row.value)}</span>
            </div>
          ))}
        </div>

        {/* Balance Sheet */}
        <div className="card">
          <div className="chart-title">Balance sheet snapshot</div>
          {[
            { label: 'Total Assets', value: bs?.total_assets },
            { label: 'Total Liabilities', value: bs?.total_liabilities },
            { label: "Shareholders' Equity", value: bs?.total_equity },
            { label: 'Current Ratio', value: bs?.current_ratio, fmt: v => fmt.n2(v) + 'x' },
            { label: 'Working Capital', value: bs?.working_capital },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value">{row.fmt ? row.fmt(row.value) : fmt.ng0(row.value)}</span>
            </div>
          ))}
        </div>

        {/* Margins */}
        <div className="card">
          <div className="chart-title">Key margins</div>
          <MarginGauge label="Gross Margin" value={pl?.gp_margin} color="#4fbde3" />
          <MarginGauge label="Operating Margin" value={pl?.op_margin} color="#c8102e" />
          <MarginGauge label="Net Margin" value={pl?.pat_margin} color={pl?.pat_margin >= 0 ? '#34d399' : '#f87171'} />
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div className="chart-title" style={{ marginTop: 0 }}>Cash position</div>
          {[
            { label: 'Net Change', value: cf?.net_change },
            { label: 'Closing Cash', value: cf?.closing_cash },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value">{fmt.ngM(row.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
