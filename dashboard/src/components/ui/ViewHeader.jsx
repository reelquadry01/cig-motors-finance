// Colorful section header: a lucide icon in a tinted chip + title + accent rule.
export default function ViewHeader({ icon: Icon, title, sub, meta, accent = 'var(--brand)', right }) {
  return (
    <div className="view-head" style={{ '--vh-accent': accent }}>
      <div className="view-head-icon">
        {Icon && <Icon size={19} strokeWidth={1.75} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <h1 className="section-header" style={{ marginBottom: 2 }}>
          {title}
          {sub && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {sub}</span>}
        </h1>
        {meta && <div className="section-sub" style={{ marginBottom: 0 }}>{meta}</div>}
      </div>
      {right && <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>{right}</div>}
    </div>
  )
}
