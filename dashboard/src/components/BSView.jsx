import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import fmt from '../lib/fmt'

function SectionRow({ title, items, total, bold, defaultOpen = false }) {
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
        <td style={{ textAlign: 'right' }}>—</td>
      </tr>
    )
  }

  return (
    <>
      <tr className="collapse-trigger" onClick={() => setOpen(!open)}>
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
          {total > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>100%</span>}
        </td>
      </tr>
      {open && items.map((item, i) => (
        <tr key={i} style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <td style={{ paddingLeft: 28, color: 'var(--text-secondary)' }}>{item.label}</td>
          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.ng0(item.value)}</td>
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

export default function BSView({ data }) {
  if (!data) return null
  const bs = data.bs

  const sections = [
    { title: 'Current Assets', items: bs?.current_assets, total: bs?.total_current_assets, defaultOpen: true },
    { title: 'Non-current Assets', items: bs?.non_current_assets, total: bs?.total_non_current_assets },
    { title: 'Total Assets', total: bs?.total_assets, bold: true },
    { title: 'Current Liabilities', items: bs?.current_liabilities, total: bs?.total_current_liabilities },
    { title: 'Non-current Liabilities', items: bs?.non_current_liabilities, total: bs?.total_non_current_liabilities },
    { title: 'Total Liabilities', total: bs?.total_liabilities, bold: true },
    { title: "Shareholders' Equity", items: bs?.equity, total: bs?.total_equity },
    { title: 'Total Equity & Liabilities', total: (bs?.total_equity || 0) + (bs?.total_liabilities || 0), bold: true },
  ]

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-header">
          Balance sheet <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— financial position</span>
        </h1>
        <div className="section-sub">{data.period} · ₦ millions</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}></th>
                  <th>Amount</th>
                  <th>% of Assets</th>
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
            <div className="side-panel-title">Snapshot</div>
            {[
              { label: 'Total Assets', value: bs?.total_assets },
              { label: 'Total Liabilities', value: bs?.total_liabilities },
              { label: 'Net Assets', value: bs?.net_assets },
              { label: "Equity", value: bs?.total_equity },
            ].map((row, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{row.label}</span>
                <span className="side-value">{fmt.ng0(row.value)}</span>
              </div>
            ))}
          </div>

          <div className="side-panel">
            <div className="side-panel-title">Liquidity</div>
            {[
              { label: 'Current Assets', value: bs?.total_current_assets },
              { label: 'Current Liabilities', value: bs?.total_current_liabilities },
              { label: 'Working Capital', value: bs?.working_capital },
              { label: 'Current Ratio', value: bs?.current_ratio, fmt: v => fmt.n2(v) + 'x' },
              { label: 'Quick Ratio', value: bs?.quick_ratio, fmt: v => fmt.n2(v) + 'x' },
            ].map((row, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{row.label}</span>
                <span className="side-value">{row.fmt ? row.fmt(row.value) : fmt.ng0(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
