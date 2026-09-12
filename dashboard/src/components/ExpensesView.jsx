import { Receipt } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'

export default function ExpensesView({ data }) {
  if (!data) return null
  const pl = data.pl || {}
  const items = pl.opex_breakdown || []
  const totalOpex = pl.total_opex || 0
  const rev = pl.total_revenue || 0
  const maxVal = items.reduce((m, i) => Math.max(m, Math.abs(i.value)), 0) || 1

  return (
    <div className="animate-in">
      <ViewHeader icon={Receipt} title="Operating expenses" sub="cost analysis" accent="var(--magenta)"
        meta={`${data.period} · in ₦ millions`} />

      <div className="pl-grid">
        <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--magenta)' }}>
          <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '46%' }}>Expense line</th>
                  <th>Amount</th>
                  <th>Share</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-secondary)' }}>{it.label}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(it.value)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{fmt.pct(it.share)}</td>
                    <td>
                      <div style={{ height: 6, background: 'var(--hover-bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: (Math.abs(it.value) / maxVal * 100) + '%', background: 'var(--magenta)', opacity: 0.85, borderRadius: 3 }} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td style={{ fontWeight: 700 }}>Total operating expenses</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(totalOpex)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>100%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="side-panel tinted" style={{ '--tint': 'var(--magenta)' }}>
            <div className="side-panel-title">Cost intensity</div>
            {[
              { label: 'Total operating expenses', value: fmt.mm(totalOpex) },
              { label: 'Opex as % of revenue', value: fmt.pct(rev ? totalOpex / rev * 100 : 0) },
              { label: 'Cost of sales % of revenue', value: fmt.pct(rev ? (pl.total_cogs || 0) / rev * 100 : 0) },
              { label: 'Largest expense line', value: items[0]?.label || '—' },
              { label: 'Expense lines tracked', value: String(items.length) },
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
