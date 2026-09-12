import { Sparkline, CHART } from './Charts'
import fmt from '../lib/fmt'

export default function KpiCards({ items }) {
  if (!items || items.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => {
        const hasDelta = item.delta !== undefined && item.delta !== null
        const deltaPos = item.delta >= 0
        // Semantic colour: green when the metric is improving, red when
        // worsening, neutral when there is no trend to judge.
        const signVar = !hasDelta ? 'var(--text-muted)' : (deltaPos ? 'var(--fav)' : 'var(--unfav)')
        const sparkColor = !hasDelta ? CHART.grey : (deltaPos ? CHART.green : CHART.red)
        return (
          <div key={i} className="kpi-card animate-in" style={{ animationDelay: `${i * 55}ms`, borderLeft: `3px solid ${signVar}` }}>
            <div className="label-caps" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>
              {item.label}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 33, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1, color: item.value < 0 ? 'var(--unfav)' : 'var(--text-primary)' }}>
                {item.valueText}
              </span>
              {item.unit && <span style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: 'var(--text-muted)' }}>{item.unit}</span>}
            </div>

            {item.sub && (
              <div className="label-sub" style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8 }}>
                {item.sub}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 20 }}>
              {item.delta !== undefined && item.delta !== null && (
                <span className={`badge ${deltaPos ? 'badge-fav' : 'badge-unfav'}`}>
                  {fmt.arrow(item.delta)} {Math.abs(item.delta).toFixed(1)}% {item.deltaLabel || ''}
                </span>
              )}
              {item.note && <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-muted)' }}>{item.note}</span>}
            </div>

            {item.sparkData && item.sparkData.length > 1 && (
              <div style={{ marginTop: 12, marginLeft: -4, marginRight: -4, opacity: 0.85 }}>
                <Sparkline data={item.sparkData} color={sparkColor} height={26} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
