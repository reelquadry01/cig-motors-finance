import fmt from '../lib/fmt'

export default function CommentaryView({ data }) {
  if (!data) return null
  const c = data.commentary
  if (!c) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>No commentary generated</div>

  const sections = [
    { title: 'P&L Commentary', body: c.pnl, icon: '📈' },
    { title: 'Balance Sheet', body: c.balance_sheet, icon: '🏦' },
    { title: 'Cash Flow', body: c.cash_flow, icon: '💰' },
    { title: 'Key Ratios', body: c.ratios, icon: '📊' },
    { title: 'Executive Summary', body: c.executive_summary, icon: '📋' },
  ]

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-header">
          Commentary <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— notes & actions</span>
        </h1>
        <div className="section-sub">{data.period}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.filter(s => s.body).map((sec, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>{sec.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sec.title}</div>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, textWrap: 'pretty' }}>
                {sec.body}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.red_flags && c.red_flags.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>🚨</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--unfav)' }}>Red flags</div>
              </div>
              {c.red_flags.map((flag, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < c.red_flags.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{flag.title || flag}</div>
                  {flag.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{flag.detail}</div>}
                </div>
              ))}
            </div>
          )}

          {c.quick_wins && c.quick_wins.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>✅</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fav)' }}>Quick wins</div>
              </div>
              {c.quick_wins.map((win, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < c.quick_wins.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{win.title || win}</div>
                  {win.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{win.detail}</div>}
                </div>
              ))}
            </div>
          )}

          {c.pending_data && c.pending_data.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(251,191,36,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15 }}>⏳</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warn)' }}>Pending data</div>
              </div>
              {c.pending_data.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < c.pending_data.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title || p}</div>
                  {p.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.detail}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
