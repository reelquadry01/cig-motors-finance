const tabs = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'pnl', label: 'Income statement' },
  { id: 'bs', label: 'Balance sheet' },
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'workingcapital', label: 'Working capital' },
  { id: 'segments', label: 'Segments' },
  { id: 'branches', label: 'Branches' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'ratios', label: 'Ratios' },
  { id: 'budget', label: 'Budget' },
  { id: 'commentary', label: 'Commentary' },
]

export default function TabNav({ active, onChange }) {
  return (
    <nav style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0 24px',
      marginTop: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`nav-tab ${active === t.id ? 'active' : ''}`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
