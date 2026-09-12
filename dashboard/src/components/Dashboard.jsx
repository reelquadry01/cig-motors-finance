import fmt from '../lib/fmt'
import KpiCards from './KpiCards'
import { MonthlyTrendChart, RevenueDonut, MarginGauge, MarginTrendChart, CostStructureChart } from './Charts'
import { buildKpis, buildReadings } from '../lib/insights'

const TONE_COLOR = { fav: 'var(--fav)', unfav: 'var(--unfav)', warn: 'var(--warn)', neutral: 'var(--text-muted)' }

function ThingsToWatch({ readings }) {
  if (!readings || readings.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 28 }}>
      <div className="chart-title" style={{ marginBottom: 18 }}>Things to watch</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px 40px' }}>
        {readings.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 700, color: TONE_COLOR[r.tone] || 'var(--brand)', minWidth: 18 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ data }) {
  if (!data) return null
  const pl = data.pl
  const bs = data.bs
  const cf = data.cf
  const monthly = data.monthly || []
  const segments = data.segments?.revenue_by_segment || []

  const kpiItems = buildKpis(data)
  const readings = buildReadings(data)

  return (
    <div className="animate-in">
      {/* KPI Row */}
      <div style={{ marginBottom: 28 }}>
        <KpiCards items={kpiItems} />
      </div>

      {/* Dynamic finance readings */}
      <ThingsToWatch readings={readings} />

      {/* Charts Grid */}
      <div className="dash-charts">
        <MonthlyTrendChart data={monthly} />
        <RevenueDonut data={segments} total={pl?.total_revenue} />
      </div>

      {/* Secondary charts */}
      <div className="dash-charts-2">
        <MarginTrendChart data={monthly} />
        <CostStructureChart data={monthly} />
      </div>

      {/* Bottom Row */}
      <div className="dash-bottom">
        <div className="card">
          <div className="chart-title">P&amp;L highlights</div>
          {[
            { label: 'Revenue', value: pl?.total_revenue },
            { label: 'Cost of Sales', value: pl?.total_cogs },
            { label: 'Gross Profit', value: pl?.gross_profit },
            { label: 'Operating Expenses', value: pl?.total_opex },
            { label: 'Net Income', value: pl?.pat },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value" style={row.value < 0 ? { color: 'var(--unfav)' } : undefined}>{fmt.th(row.value)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="chart-title">Balance sheet snapshot</div>
          {[
            { label: 'Total Assets', value: bs?.total_assets },
            { label: 'Total Liabilities', value: bs?.total_liabilities },
            { label: "Shareholders' Equity", value: bs?.total_equity },
            { label: 'Current Ratio', value: bs?.current_ratio, fmt: v => fmt.n2(v) + '×' },
            { label: 'Working Capital', value: bs?.working_capital },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value" style={row.value < 0 ? { color: 'var(--unfav)' } : undefined}>{row.fmt ? row.fmt(row.value) : fmt.th(row.value)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="chart-title">Key margins</div>
          <MarginGauge label="Gross Margin" value={pl?.gp_margin} color="var(--accent)" />
          <MarginGauge label="Operating Margin" value={pl?.op_margin} color="var(--brand)" />
          <MarginGauge label="Net Margin" value={pl?.pat_margin} color={pl?.pat_margin >= 0 ? 'var(--fav)' : 'var(--unfav)'} />
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
          <div className="chart-title" style={{ marginTop: 0 }}>Cash position</div>
          {[
            { label: 'Net Change', value: cf?.net_change },
            { label: 'Closing Cash', value: cf?.closing_cash },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value" style={row.value < 0 ? { color: 'var(--unfav)' } : undefined}>{fmt.th(row.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
