import { Sparkline } from './Charts'
import fmt from '../lib/fmt'

export default function KpiCards({ items, monthlyData }) {
  if (!items || items.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div key={i} className="kpi-card" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="animate-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                {item.label}
              </div>
              {item.icon && (
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: item.iconBg || 'var(--brand-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                }}>
                  {item.icon}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {item.formatted}
              </span>
              {item.unit && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.unit}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              {item.badge !== undefined && item.badge !== null && (
                <span className={`badge ${item.badge >= 0 ? 'badge-fav' : 'badge-unfav'}`}>
                  {fmt.arrow(item.badge)} {Math.abs(item.badge).toFixed(1)}%
                </span>
              )}
              {item.sublabel && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sublabel}</span>
              )}
            </div>

            {item.sparkData && (
              <div style={{ marginTop: 10, marginLeft: -4, marginRight: -4 }}>
                <Sparkline data={item.sparkData} color={item.badge >= 0 ? '#34d399' : '#f87171'} height={28} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
