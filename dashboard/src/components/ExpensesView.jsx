import { Receipt, Building2 } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'
import DownloadExcel from './ui/DownloadExcel'

function BreakdownTable({ items, total, totalLabel, accent }) {
  const maxVal = items.reduce((m, i) => Math.max(m, Math.abs(i.value)), 0) || 1
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: '46%' }}>Line</th>
          <th>Amount</th>
          <th>Share</th>
          <th style={{ width: 120 }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td style={{ color: 'var(--text-secondary)' }}>{it.label}</td>
            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.th(it.value)}</td>
            <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{fmt.pct(it.share)}</td>
            <td>
              <div style={{ height: 6, background: 'var(--hover-bg)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (Math.abs(it.value) / maxVal * 100) + '%', background: accent, opacity: 0.85, borderRadius: 3 }} />
              </div>
            </td>
          </tr>
        ))}
        <tr className="row-total">
          <td style={{ fontWeight: 700 }}>{totalLabel}</td>
          <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.th(total)}</td>
          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>100%</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  )
}

export default function ExpensesView({ data }) {
  if (!data) return null
  const pl = data.pl || {}
  const opex = pl.opex_breakdown || []
  const capex = data.capex_breakdown || []
  const totalOpex = pl.total_opex || 0
  const totalCapex = data.capex || 0
  const rev = pl.total_revenue || 0

  return (
    <div className="animate-in">
      <ViewHeader icon={Receipt} title="Costs & expenditure" sub="operating expenses and capex" accent="var(--magenta)"
        meta={`${data.period} · in ₦ thousands`}
        right={<DownloadExcel kind="costs" data={data} />} />

      <div className="pl-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--magenta)' }}>
            <div style={{ padding: '14px 24px 4px' }}>
              <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600 }}>Operating expenses</div>
            </div>
            <div style={{ padding: '4px 24px 16px', overflowX: 'auto' }}>
              <BreakdownTable items={opex} total={totalOpex} totalLabel="Total operating expenses" accent="var(--magenta)" />
            </div>
          </div>

          <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--brand)' }}>
            <div style={{ padding: '14px 24px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--brand)', display: 'inline-flex' }}><Building2 size={16} strokeWidth={1.8} /></span>
              <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600 }}>Capital expenditure</div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)' }}>additions to property, plant &amp; equipment</span>
            </div>
            <div style={{ padding: '4px 24px 16px', overflowX: 'auto' }}>
              {capex.length > 0
                ? <BreakdownTable items={capex} total={totalCapex} totalLabel="Total capital expenditure" accent="var(--brand)" />
                : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No capital expenditure in this period.</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="side-panel tinted" style={{ '--tint': 'var(--magenta)' }}>
            <div className="side-panel-title">Cost intensity</div>
            {[
              { label: 'Cost of sales', value: fmt.th(pl.total_cogs) },
              { label: 'Operating expenses', value: fmt.th(totalOpex) },
              { label: 'Capital expenditure', value: fmt.th(totalCapex) },
              { label: 'Opex as % of revenue', value: fmt.pct(rev ? totalOpex / rev * 100 : 0) },
              { label: 'Cost of sales % of revenue', value: fmt.pct(rev ? (pl.total_cogs || 0) / rev * 100 : 0) },
              { label: 'Largest expense line', value: opex[0]?.label || '—' },
            ].map((row, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{row.label}</span>
                <span className="side-value" style={{ fontSize: 13 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
