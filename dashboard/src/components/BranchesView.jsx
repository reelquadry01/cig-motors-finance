import { MapPin } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'
import { branchPerf } from '../lib/sections'

export default function BranchesView({ data }) {
  if (!data) return null
  const rows = branchPerf(data)
  const maxRev = rows.reduce((m, r) => Math.max(m, r.revenue), 0) || 1
  const tot = rows.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cogs: a.cogs + r.cogs, gross_profit: a.gross_profit + r.gross_profit }), { revenue: 0, cogs: 0, gross_profit: 0 })

  return (
    <div className="animate-in">
      <ViewHeader icon={MapPin} title="Branch performance" sub="by location" accent="var(--fav)"
        meta={`${data.period} · in ₦ millions · locations inferred from account descriptions`} />

      <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--fav)' }}>
        <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '26%' }}>Branch</th>
                <th>Revenue</th>
                <th>Cost of sales</th>
                <th>Gross profit</th>
                <th>Margin</th>
                <th style={{ width: 130 }}>Rev share</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.branch}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(r.revenue)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(r.cogs)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.gross_profit < 0 ? 'var(--unfav)' : undefined }}>{fmt.mm(r.gross_profit)}</td>
                  <td style={{ textAlign: 'right' }}><span className={`badge ${r.gp_margin >= 0 ? 'badge-fav' : 'badge-unfav'}`}>{fmt.pct(r.gp_margin)}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--hover-bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: (r.revenue / maxRev * 100) + '%', background: 'var(--fav)', opacity: 0.85, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>{fmt.pct(r.mix)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="row-total">
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(tot.revenue)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(tot.cogs)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tot.gross_profit < 0 ? 'var(--unfav)' : undefined }}>{fmt.mm(tot.gross_profit)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.pct(tot.revenue ? tot.gross_profit / tot.revenue * 100 : 0)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
