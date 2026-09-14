import { Gauge, Zap, BarChart3, Scale, TrendingUp } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'

export default function RatiosView({ data }) {
  if (!data) return null
  const r = data.ratios

  const sections = [
    {
      title: 'Liquidity & Efficiency',
      icon: Zap,
      tint: 'var(--accent)',
      items: [
        { label: 'Current Ratio', value: r?.current_ratio, fmt: v => fmt.n2(v) + '×' },
        { label: 'Quick Ratio', value: r?.quick_ratio, fmt: v => fmt.n2(v) + '×' },
        { label: 'Cash Ratio', value: r?.cash_ratio, fmt: v => fmt.n2(v) + '×' },
        { label: 'Inventory Turnover', value: r?.inventory_turnover, fmt: v => fmt.n2(v) + '×' },
        { label: 'Receivables Turnover', value: r?.receivables_turnover, fmt: v => fmt.n2(v) + '×' },
        { label: 'Days Sales Outstanding', value: r?.days_sales_outstanding, fmt: v => fmt.n0(v) + ' days' },
        { label: 'Days Inventory Outstanding', value: r?.days_inventory_outstanding, fmt: v => fmt.n0(v) + ' days' },
      ],
    },
    {
      title: 'Profitability',
      icon: BarChart3,
      tint: 'var(--brand)',
      items: [
        { label: 'Gross Margin', value: r?.gross_margin, fmt: v => fmt.pct(v) },
        { label: 'Operating Margin', value: r?.operating_margin, fmt: v => fmt.pct(v) },
        { label: 'Net Margin', value: r?.net_margin, fmt: v => fmt.pct(v), color: r?.net_margin >= 0 ? 'var(--fav)' : 'var(--unfav)' },
        { label: 'EBITDA', value: r?.ebitda, fmt: v => fmt.th(v) },
        { label: 'EBITDA Margin', value: r?.ebitda_margin, fmt: v => fmt.pct(v) },
        { label: 'ROE', value: r?.roe, fmt: v => fmt.pct(v) },
        { label: 'ROA', value: r?.roa, fmt: v => fmt.pct(v) },
        { label: 'Asset Turnover', value: r?.asset_turnover, fmt: v => fmt.n2(v) + '×' },
        { label: 'Effective Tax Rate', value: r?.effective_tax_rate, fmt: v => fmt.pct(v) },
      ],
    },
    {
      title: 'Leverage',
      icon: Scale,
      tint: 'var(--magenta)',
      items: [
        { label: 'Debt-to-Equity', value: r?.debt_to_equity, fmt: v => fmt.n2(v) + '%' },
        { label: 'Equity Multiplier', value: r?.equity_multiplier, fmt: v => fmt.n2(v) + '×' },
        { label: 'Interest Coverage', value: r?.interest_coverage, fmt: v => r?.interest_coverage !== null ? fmt.n2(v) + '×' : 'N/A' },
        { label: 'Debt Ratio', value: r?.debt_ratio, fmt: v => fmt.pct(v) },
        { label: 'Net Debt', value: r?.net_debt, fmt: v => fmt.th(v) },
        { label: 'Net Debt / EBITDA', value: r?.net_debt_to_ebitda, fmt: v => fmt.n2(v) + '×' },
      ],
    },
    {
      title: 'Working Capital',
      icon: TrendingUp,
      tint: 'var(--fav)',
      items: [
        { label: 'Working Capital', value: r?.working_capital, fmt: v => fmt.th(v) },
      ],
    },
  ]

  return (
    <div className="animate-in">
      <ViewHeader icon={Gauge} title="Ratio analysis" sub="key metrics" accent="var(--magenta)" meta={data.period} />

      <div className="ratios-grid">
        {sections.map((sec, i) => {
          const Icon = sec.icon
          return (
            <div key={i} className="card tinted" style={{ '--tint': sec.tint }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ color: sec.tint, display: 'inline-flex' }}><Icon size={17} strokeWidth={1.75} /></span>
                <div className="card-accent-title" style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{sec.title}</div>
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
          )
        })}
      </div>
    </div>
  )
}
