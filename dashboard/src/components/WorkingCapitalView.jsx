import { RefreshCcw } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'
import { workingCapital } from '../lib/sections'

function CycleTile({ label, days, hint, accent }) {
  return (
    <div className="kpi-card" style={{ background: `color-mix(in srgb, ${accent} 5%, var(--surface-1))`, borderColor: `color-mix(in srgb, ${accent} 16%, var(--border))` }}>
      <div className="label-caps" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 600, color: 'var(--text-primary)' }}>{days === null || days === undefined || isNaN(days) ? '—' : Math.round(days)}</span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, color: 'var(--text-muted)' }}>days</span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8 }}>{hint}</div>
    </div>
  )
}

export default function WorkingCapitalView({ data }) {
  if (!data) return null
  const w = workingCapital(data)

  return (
    <div className="animate-in">
      <ViewHeader icon={RefreshCcw} title="Working capital" sub="liquidity & cash conversion" accent="var(--accent)"
        meta={`${data.period} · balances in ₦ millions`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
        <CycleTile label="Days sales outstanding" days={w.dso} hint="Time to collect receivables" accent="var(--accent)" />
        <CycleTile label="Days inventory outstanding" days={w.dio} hint="Time to sell inventory" accent="var(--warn)" />
        <CycleTile label="Days payables outstanding" days={w.dpo} hint="Time taken to pay suppliers" accent="var(--fav)" />
        <CycleTile label="Cash conversion cycle" days={w.ccc} hint="DSO + DIO − DPO" accent="var(--brand)" />
      </div>

      <div className="pl-grid">
        <div className="card tinted" style={{ '--tint': 'var(--accent)' }}>
          <div className="card-accent-title side-panel-title">Working-capital balances</div>
          {[
            { label: 'Trade receivables', value: w.ar },
            { label: 'Inventories', value: w.inventory },
            { label: 'Trade & other payables', value: w.payables },
            { label: 'Total current assets', value: w.current_assets },
            { label: 'Total current liabilities', value: w.current_liabilities },
            { label: 'Net working capital', value: w.working_capital, strong: true },
          ].map((row, i) => (
            <div key={i} className="side-row" style={row.strong ? { fontWeight: 600 } : undefined}>
              <span className="side-label">{row.label}</span>
              <span className="side-value" style={{ color: row.value < 0 ? 'var(--unfav)' : undefined }}>{fmt.mm(row.value)}</span>
            </div>
          ))}
        </div>

        <div className="card tinted" style={{ '--tint': 'var(--accent)' }}>
          <div className="card-accent-title side-panel-title">Liquidity ratios</div>
          {[
            { label: 'Current ratio', value: w.current_ratio, fmt: v => fmt.n2(v) + '×' },
            { label: 'Quick ratio', value: w.quick_ratio, fmt: v => fmt.n2(v) + '×' },
            { label: 'Days sales outstanding', value: w.dso, fmt: v => Math.round(v) + ' days' },
            { label: 'Days inventory outstanding', value: w.dio, fmt: v => Math.round(v) + ' days' },
            { label: 'Days payables outstanding', value: w.dpo, fmt: v => Math.round(v) + ' days' },
            { label: 'Cash conversion cycle', value: w.ccc, fmt: v => Math.round(v) + ' days' },
          ].map((row, i) => (
            <div key={i} className="side-row">
              <span className="side-label">{row.label}</span>
              <span className="side-value">{row.value === null || row.value === undefined || isNaN(row.value) ? '—' : row.fmt(row.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
