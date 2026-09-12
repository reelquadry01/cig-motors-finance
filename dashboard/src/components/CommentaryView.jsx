import { FileText, ClipboardList, TrendingUp, Scale, Wallet, BarChart3, AlertTriangle, CheckCircle2 } from 'lucide-react'
import ViewHeader from './ui/ViewHeader'
import { buildCfoCommentary, buildActions } from '../lib/cfoCommentary'

const ICONS = { clipboard: ClipboardList, trending: TrendingUp, scale: Scale, wallet: Wallet, bars: BarChart3 }
const TONE = { fav: 'var(--fav)', unfav: 'var(--unfav)', warn: 'var(--warn)', neutral: 'var(--accent)' }

export default function CommentaryView({ data }) {
  if (!data) return null
  const sections = buildCfoCommentary(data)
  const actions = buildActions(data)

  return (
    <div className="animate-in">
      <ViewHeader icon={FileText} title="Commentary" sub="review & actions" accent="var(--brand)" meta={`${data.period} · figures in Naira (bn = billion, m = million)`} />

      <div className="pl-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((sec, i) => {
            const Icon = ICONS[sec.icon] || FileText
            const tint = TONE[sec.tone] || 'var(--accent)'
            return (
              <div key={i} className="card tinted" style={{ '--tint': tint }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: tint, display: 'inline-flex' }}><Icon size={18} strokeWidth={1.75} /></span>
                  <div className="card-accent-title" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{sec.title}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {sec.paras.map((p, j) => (
                    <p key={j} style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, textWrap: 'pretty' }}>{p}</p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="side-panel tinted" style={{ '--tint': 'var(--brand)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ color: 'var(--brand)', display: 'inline-flex' }}><AlertTriangle size={16} strokeWidth={1.9} /></span>
              <div className="card-accent-title side-panel-title" style={{ margin: 0 }}>Recommended actions</div>
            </div>
            {actions.map((a, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < actions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--brand)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="side-panel" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', marginTop: 1 }}><CheckCircle2 size={15} strokeWidth={1.8} /></span>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Commentary is generated live from the figures for <strong style={{ color: 'var(--text-secondary)' }}>{data.period}</strong> and updates with the period and date-range filters.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
