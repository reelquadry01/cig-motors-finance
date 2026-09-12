const MONTH_LABELS = {
  '2025-01': 'Jan 2025', '2025-02': 'Feb 2025', '2025-03': 'Mar 2025',
  '2025-04': 'Apr 2025', '2025-05': 'May 2025', '2025-06': 'Jun 2025',
  '2025-07': 'Jul 2025', '2025-08': 'Aug 2025', '2025-09': 'Sep 2025',
  '2025-10': 'Oct 2025', '2025-11': 'Nov 2025', '2025-12': 'Dec 2025',
  '2026-01': 'Jan 2026',
}

function fmtMonth(key) {
  if (MONTH_LABELS[key]) return MONTH_LABELS[key]
  if (!key || !key.includes('-')) return key || ''
  const [y, m] = key.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

export default function Header({ data, periodFilter, onPeriodChange }) {
  const mode = periodFilter?.mode || 'latest'
  const months = data?.available_periods?.months || []
  const years = data?.available_periods?.years || []

  const setMode = (newMode, opts = {}) => {
    onPeriodChange?.({ mode: newMode, ...opts })
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Monthly management report
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1 }}>
            <span style={{ color: 'var(--brand)' }}>CIG Motors</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — Finance</span>
          </h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
            {[
              { id: 'latest', label: 'Latest' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'range', label: 'Range' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === 'latest') setMode('latest')
                  else if (m.id === 'monthly') setMode('monthly', { period: months[months.length - 1] })
                  else if (m.id === 'yearly') setMode('yearly', { period: years[years.length - 1] })
                  else if (m.id === 'range') setMode('range', { periodFrom: months[0], periodTo: months[months.length - 1] })
                }}
                className={`btn-mode ${mode === m.id ? 'active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'monthly' && (
            <select
              value={periodFilter?.period || ''}
              onChange={e => setMode('monthly', { period: e.target.value })}
              className="select-input"
            >
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          )}

          {mode === 'yearly' && (
            <select
              value={periodFilter?.period || ''}
              onChange={e => setMode('yearly', { period: e.target.value })}
              className="select-input"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {mode === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={periodFilter?.periodFrom || ''}
                onChange={e => setMode('range', { periodFrom: e.target.value, periodTo: periodFilter?.periodTo || months[months.length - 1] })}
                className="select-input"
              >
                {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
              <select
                value={periodFilter?.periodTo || ''}
                onChange={e => setMode('range', { periodFrom: periodFilter?.periodFrom || months[0], periodTo: e.target.value })}
                className="select-input"
              >
                {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="divider-brand" />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', padding: '10px 0', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.period}</span>
        <span>·</span>
        <span>Figures tie to the trial balance</span>
        <span>·</span>
        <span>₦ millions</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
          {data.data_sources?.gl_transactions?.toLocaleString()} txns · {data.data_sources?.gl_accounts} accounts
        </span>
      </div>
    </div>
  )
}
