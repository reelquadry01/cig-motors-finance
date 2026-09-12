import { Sun, Moon } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(key) {
  if (!key || !key.includes('-')) return key || ''
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

export default function Header({ data, periodFilter, onPeriodChange, theme, onToggleTheme }) {
  const mode = periodFilter?.mode || 'latest'
  const months = data?.available_periods?.months || []
  const years = data?.available_periods?.years || []
  const dateMin = data?.available_periods?.date_min
  const dateMax = data?.available_periods?.date_max

  const setMode = (newMode, opts = {}) => onPeriodChange?.({ mode: newMode, ...opts })

  const modes = [
    { id: 'latest', label: 'Latest' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'daily', label: 'Daily' },
    { id: 'yearly', label: 'Yearly' },
    { id: 'range', label: 'Range' },
  ]

  const onModeClick = (id) => {
    if (id === 'latest') setMode('latest')
    else if (id === 'monthly') setMode('monthly', { period: months[months.length - 1] })
    else if (id === 'daily') setMode('daily', { period: dateMax })
    else if (id === 'yearly') setMode('yearly', { period: years[years.length - 1] })
    else if (id === 'range') setMode('range', { periodFrom: dateMin, periodTo: dateMax })
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
          <div className="mode-switch">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => onModeClick(m.id)}
                className={`btn-mode ${mode === m.id ? 'active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'monthly' && (
            <select value={periodFilter?.period || ''} onChange={e => setMode('monthly', { period: e.target.value })} className="select-input">
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          )}

          {mode === 'daily' && (
            <input
              type="date"
              className="select-input"
              value={periodFilter?.period || dateMax || ''}
              min={dateMin || undefined}
              max={dateMax || undefined}
              onChange={e => setMode('daily', { period: e.target.value })}
            />
          )}

          {mode === 'yearly' && (
            <select value={periodFilter?.period || ''} onChange={e => setMode('yearly', { period: e.target.value })} className="select-input">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {mode === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <input
                type="date"
                className="select-input"
                value={periodFilter?.periodFrom || dateMin || ''}
                min={dateMin || undefined}
                max={dateMax || undefined}
                onChange={e => setMode('range', { periodFrom: e.target.value, periodTo: periodFilter?.periodTo || dateMax })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
              <input
                type="date"
                className="select-input"
                value={periodFilter?.periodTo || dateMax || ''}
                min={dateMin || undefined}
                max={dateMax || undefined}
                onChange={e => setMode('range', { periodFrom: periodFilter?.periodFrom || dateMin, periodTo: e.target.value })}
              />
            </div>
          )}

          <button
            className="icon-btn"
            onClick={onToggleTheme}
            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>

      <div className="divider-brand" />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', padding: '10px 0', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.period}</span>
        <span>·</span>
        <span>Figures tie to the trial balance</span>
        <span>·</span>
        <span>Figures in ₦ thousands (₦'000)</span>
        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
          {data.data_sources?.gl_transactions?.toLocaleString()} txns · {data.data_sources?.gl_accounts} accounts
        </span>
      </div>
    </div>
  )
}
