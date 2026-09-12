import { Layers } from 'lucide-react'
import fmt from '../lib/fmt'
import { RevenueDonut } from './Charts'
import ViewHeader from './ui/ViewHeader'
import { segmentPL } from '../lib/sections'

export default function SegmentsView({ data }) {
  if (!data) return null
  const rows = segmentPL(data)
  const revSeg = data.segments?.revenue_by_segment || []
  const tot = rows.reduce((a, r) => ({
    revenue: a.revenue + r.revenue, cogs: a.cogs + r.cogs, gross_profit: a.gross_profit + r.gross_profit,
  }), { revenue: 0, cogs: 0, gross_profit: 0 })

  return (
    <div className="animate-in">
      <ViewHeader icon={Layers} title="Segment performance" sub="contribution by business line" accent="var(--warn)"
        meta={`${data.period} · in ₦ millions`} />

      <div className="pl-grid">
        <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--warn)' }}>
          <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Segment</th>
                  <th>Revenue</th>
                  <th>Cost of sales</th>
                  <th>Gross profit</th>
                  <th>Margin</th>
                  <th>Rev mix</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.segment}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(r.revenue)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(r.cogs)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.gross_profit < 0 ? 'var(--unfav)' : undefined }}>{fmt.mm(r.gross_profit)}</td>
                    <td style={{ textAlign: 'right' }}><span className={`badge ${r.gp_margin >= 0 ? 'badge-fav' : 'badge-unfav'}`}>{fmt.pct(r.gp_margin)}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{fmt.pct(r.mix)}</td>
                  </tr>
                ))}
                <tr className="row-total">
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(tot.revenue)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(tot.cogs)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tot.gross_profit < 0 ? 'var(--unfav)' : undefined }}>{fmt.mm(tot.gross_profit)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt.pct(tot.revenue ? tot.gross_profit / tot.revenue * 100 : 0)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card tinted" style={{ '--tint': 'var(--warn)' }}>
          <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Revenue mix</div>
          {revSeg.length > 0
            ? <RevenueDonut data={revSeg} total={data.pl?.total_revenue} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No segment data</div>}
        </div>
      </div>
    </div>
  )
}
