import fmt from '../lib/fmt'
import { RevenueDonut } from './Charts'

export default function SegmentsView({ data }) {
  if (!data) return null
  const revSeg = data.segments?.revenue_by_segment || []
  const opexCat = data.segments?.opex_by_category || []

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-header">
          Segments & expenses <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— breakdown</span>
        </h1>
        <div className="section-sub">{data.period}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Revenue by segment</div>
          {revSeg.length > 0 ? (
            <RevenueDonut data={revSeg} total={data.pl?.total_revenue} />
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No segment data</div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Operating expenses by category</div>
          {opexCat.length > 0 ? (
            <>
              {opexCat.map((c, i) => (
                <div key={i} className="side-row">
                  <span className="side-label">{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (c.share || 0) + '%', background: '#c8102e', borderRadius: 2, opacity: 0.7 }} />
                    </div>
                    <span className="side-value" style={{ minWidth: 60, textAlign: 'right' }}>{fmt.ng0(c.value)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{fmt.pct(c.share)}</span>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
              <div className="side-row" style={{ fontWeight: 600 }}>
                <span>Total Opex</span>
                <span className="side-value">{fmt.ng0(data.pl?.total_opex)}</span>
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
