import { PieChart as PieIcon } from 'lucide-react'
import fmt from '../lib/fmt'
import { RevenueDonut } from './Charts'
import ViewHeader from './ui/ViewHeader'

export default function SegmentsView({ data }) {
  if (!data) return null
  const revSeg = data.segments?.revenue_by_segment || []
  const opexCat = data.segments?.opex_by_category || []

  return (
    <div className="animate-in">
      <ViewHeader icon={PieIcon} title="Segments & expenses" sub="breakdown" accent="var(--warn)" meta={data.period} />

      <div className="segments-grid">
        <div className="card tinted" style={{ '--tint': 'var(--warn)' }}>
          <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Revenue by segment</div>
          {revSeg.length > 0 ? (
            <RevenueDonut data={revSeg} total={data.pl?.total_revenue} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No segment data</div>
          )}
        </div>

        <div className="card tinted" style={{ '--tint': 'var(--accent)' }}>
          <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Operating expenses by category</div>
          {opexCat.length > 0 ? (
            <>
              {opexCat.map((c, i) => (
                <div key={i} className="side-row">
                  <span className="side-label">{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'var(--hover-bg)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (c.share || 0) + '%', background: 'var(--brand)', borderRadius: 2, opacity: 0.85 }} />
                    </div>
                    <span className="side-value" style={{ minWidth: 60, textAlign: 'right' }}>{fmt.acc0(c.value)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{fmt.pct(c.share)}</span>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              <div className="side-row" style={{ fontWeight: 600 }}>
                <span>Total Opex</span>
                <span className="side-value">{fmt.acc0(data.pl?.total_opex)}</span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No expense data</div>
          )}
        </div>
      </div>
    </div>
  )
}
