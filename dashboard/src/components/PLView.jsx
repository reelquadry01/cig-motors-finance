import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import fmt from '../lib/fmt'

function SectionRow({ title, items, total, margin, bold, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasItems = items && items.length > 0

  if (!hasItems) {
    return (
      <tr className={bold ? 'row-subtotal' : ''}>
        <td style={{ fontWeight: bold ? 600 : 500, color: bold ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: bold ? 13.5 : 11, textTransform: bold ? 'none' : 'uppercase', letterSpacing: bold ? 0 : '0.06em' }}>
          {title}
        </td>
        <td style={{ textAlign: 'right', fontWeight: bold ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
          {fmt.ng0(total)}
        </td>
        <td style={{ textAlign: 'right' }}>
          {margin !== undefined && <span className="badge badge-neutral">{fmt.pct(margin)}</span>}
        </td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>—</td>
      </tr>
    )
  }

  return (
    <>
      <tr
        className="collapse-trigger"
        onClick={() => setOpen(!open)}
      >
        <td style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: bold ? 600 : 500, color: bold ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: bold ? 13.5 : 11, textTransform: bold ? 'none' : 'uppercase', letterSpacing: bold ? 0 : '0.06em' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <ChevronRight size={13} />
          </span>
          {title}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>({items.length})</span>
        </td>
        <td style={{ textAlign: 'right', fontWeight: bold ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>
          {fmt.ng0(total)}
        </td>
        <td style={{ textAlign: 'right' }}>
          {margin !== undefined && <span className="badge badge-neutral">{fmt.pct(margin)}</span>}
        </td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>
          {total > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>100%</span>}
        </td>
      </tr>
      {open && items.map((item, i) => (
        <tr key={i} style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <td style={{ paddingLeft: 28, color: 'var(--text-secondary)' }}>{item.label}</td>
          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.ng0(item.value)}</td>
          <td style={{ textAlign: 'right' }}>—</td>
          <td style={{ textAlign: 'right' }}>—</td>
          <td style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {total > 0 ? fmt.pct(item.value / total * 100) : '—'}
            </span>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function PLView({ data }) {
  if (!data) return null
  const pl = data.pl

  const sections = [
    { title: 'Revenue', items: pl?.revenue, total: pl?.total_revenue, bold: true, defaultOpen: true },
    { title: 'Cost of Sales', items: pl?.cogs, total: pl?.total_cogs },
    { title: 'Gross Profit', total: pl?.gross_profit, bold: true, margin: pl?.gp_margin },
    { title: 'Operating Expenses', items: pl?.opex, total: pl?.total_opex },
    { title: 'Depreciation', items: pl?.depreciation, total: pl?.total_depreciation },
    { title: 'Operating Profit', total: pl?.operating_profit, bold: true, margin: pl?.op_margin },
    { title: 'Other Income', items: pl?.other_income, total: pl?.total_other_income },
    { title: 'Finance Costs', items: pl?.finance_costs, total: pl?.total_finance_costs },
    { title: 'Profit Before Tax', total: pl?.pbt, bold: true, margin: pl?.pbt_margin },
    { title: 'Tax Expense', items: pl?.tax, total: pl?.total_tax },
    { title: 'Net Income', total: pl?.pat, bold: true, margin: pl?.pat_margin },
  ]

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-header">
          Income statement <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— profit or loss</span>
        </h1>
        <div className="section-sub">{data.period} · ₦ millions</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}></th>
                  <th>Amount</th>
                  <th>Margin</th>
                  <th>YoY</th>
                  <th>% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s, i) => <SectionRow key={i} {...s} />)}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="side-panel">
            <div className="side-panel-title">P&L summary</div>
            {[
              { label: 'Revenue', value: pl?.total_revenue },
              { label: 'COGS', value: pl?.total_cogs },
              { label: 'Gross Profit', value: pl?.gross_profit },
              { label: 'Opex', value: pl?.total_opex },
              { label: 'Depreciation', value: pl?.total_depreciation },
              { label: 'Operating Profit', value: pl?.operating_profit },
              { label: 'Finance Costs', value: pl?.total_finance_costs },
              { label: 'Tax', value: pl?.total_tax },
              { label: 'Net Income', value: pl?.pat },
            ].map((row, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{row.label}</span>
                <span className="side-value">{fmt.ng0(row.value)}</span>
              </div>
            ))}
          </div>

          <div className="side-panel">
            <div className="side-panel-title">Margins</div>
            {[
              { label: 'Gross', value: pl?.gp_margin, color: '#4fbde3' },
              { label: 'Operating', value: pl?.op_margin, color: '#c8102e' },
              { label: 'PBT', value: pl?.pbt_margin, color: '#fbbf24' },
              { label: 'Net', value: pl?.pat_margin, color: pl?.pat_margin >= 0 ? '#34d399' : '#f87171' },
            ].map((m, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{m.label}</span>
                <span className="badge" style={{ color: m.color, background: m.color + '18' }}>
                  {fmt.pct(m.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
