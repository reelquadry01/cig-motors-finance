import fmt from '../lib/fmt'

export default function RatiosView({ data }) {
  if (!data) return null
  const r = data.ratios

  const sections = [
    {
      title: 'Liquidity & Efficiency',
      icon: '⚡',
      items: [
        { label: 'Current Ratio', value: r?.current_ratio, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Quick Ratio', value: r?.quick_ratio, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Cash Ratio', value: r?.cash_ratio, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Inventory Turnover', value: r?.inventory_turnover, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Receivables Turnover', value: r?.receivables_turnover, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Days Sales Outstanding', value: r?.days_sales_outstanding, fmt: v => fmt.n0(v) + ' days' },
        { label: 'Days Inventory Outstanding', value: r?.days_inventory_outstanding, fmt: v => fmt.n0(v) + ' days' },
      ],
    },
    {
      title: 'Profitability',
      icon: '📊',
      items: [
        { label: 'Gross Margin', value: r?.gross_margin, fmt: v => fmt.pct(v), color: '#4fbde3' },
        { label: 'Operating Margin', value: r?.operating_margin, fmt: v => fmt.pct(v), color: '#c8102e' },
        { label: 'Net Margin', value: r?.net_margin, fmt: v => fmt.pct(v), color: r?.net_margin >= 0 ? '#34d399' : '#f87171' },
        { label: 'ROE', value: r?.roe, fmt: v => fmt.pct(v) },
        { label: 'ROA', value: r?.roa, fmt: v => fmt.pct(v) },
        { label: 'Asset Turnover', value: r?.asset_turnover, fmt: v => fmt.n2(v) + 'x' },
      ],
    },
    {
      title: 'Leverage',
      icon: '⚖️',
      items: [
        { label: 'Debt-to-Equity', value: r?.debt_to_equity, fmt: v => fmt.n2(v) + '%' },
        { label: 'Equity Multiplier', value: r?.equity_multiplier, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Interest Coverage', value: r?.interest_coverage, fmt: v => fmt.n2(v) + 'x' },
        { label: 'Debt Ratio', value: r?.debt_ratio, fmt: v => fmt.pct(v) },
      ],
    },
  ]

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-header">
          Ratio analysis <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— key metrics</span>
        </h1>
        <div className="section-sub">{data.period}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {sections.map((sec, i) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>{sec.icon}</span>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{sec.title}</div>
            </div>
            {sec.items.map((item, j) => (
              <div key={j} className="side-row">
                <span className="side-label">{item.label}</span>
                <span className="side-value" style={{ color: item.color || 'var(--text-primary)' }}>
                  {item.value !== undefined && item.value !== null ? item.fmt(item.value) : '—'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
