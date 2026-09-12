import { useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'

/* Account-level leaf row (deepest level of a breakdown) */
function LeafRow({ label, value, revenueTotal, indent = 44 }) {
  return (
    <tr style={{ animation: 'fadeIn 0.15s ease-out' }}>
      <td style={{ paddingLeft: indent, color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(value)}</td>
      <td style={{ textAlign: 'right' }}>—</td>
      <td style={{ textAlign: 'right' }}>—</td>
      <td style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {revenueTotal ? fmt.pct(Math.abs(value) / Math.abs(revenueTotal) * 100) : '—'}
        </span>
      </td>
    </tr>
  )
}

/* Segment-level group row that expands to its account lines */
function GroupRow({ group, sectionTotal, revenueTotal }) {
  const [open, setOpen] = useState(false)
  const items = group.items || []
  return (
    <>
      <tr className="collapse-trigger" onClick={() => setOpen(!open)}>
        <td style={{ paddingLeft: 28 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 500 }}>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <ChevronRight size={12} />
            </span>
            {group.group}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>({items.length})</span>
          </span>
        </td>
        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt.mm(group.value)}</td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {sectionTotal ? fmt.pct(Math.abs(group.value) / Math.abs(sectionTotal) * 100) : '—'}
          </span>
        </td>
      </tr>
      {open && items.map((it, i) => (
        <LeafRow key={i} label={it.label} value={it.value} revenueTotal={sectionTotal} indent={48} />
      ))}
    </>
  )
}

/* Top-level statement line. Supports:
   - breakdown: array of segment groups (Revenue / COGS) -> nested expand
   - items: flat list of account lines (other sections)
   - neither: a computed subtotal line (Gross Profit, PBT, ...) */
function SectionRow({ title, items, breakdown, total, margin, bold, revenueTotal, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasBreakdown = breakdown && breakdown.length > 0
  const hasItems = items && items.length > 0
  const expandable = hasBreakdown || hasItems
  const childCount = hasBreakdown ? breakdown.length : (items?.length || 0)

  const labelStyle = {
    fontWeight: bold ? 600 : 500,
    color: bold ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: bold ? 13.5 : 11,
    textTransform: bold ? 'none' : 'uppercase',
    letterSpacing: bold ? 0 : '0.06em',
  }

  if (!expandable) {
    return (
      <tr className={bold ? 'row-subtotal' : ''}>
        <td style={labelStyle}>{title}</td>
        <td style={{ textAlign: 'right', fontWeight: bold ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(total)}</td>
        <td style={{ textAlign: 'right' }}>{margin !== undefined && <span className="badge badge-neutral">{fmt.pct(margin)}</span>}</td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>—</td>
      </tr>
    )
  }

  return (
    <>
      <tr className="collapse-trigger" onClick={() => setOpen(!open)}>
        <td>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...labelStyle }}>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <ChevronRight size={13} />
            </span>
            {title}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>({childCount})</span>
          </span>
        </td>
        <td style={{ textAlign: 'right', fontWeight: bold ? 700 : 500, fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(total)}</td>
        <td style={{ textAlign: 'right' }}>{margin !== undefined && <span className="badge badge-neutral">{fmt.pct(margin)}</span>}</td>
        <td style={{ textAlign: 'right' }}>—</td>
        <td style={{ textAlign: 'right' }}>{total !== 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>100%</span>}</td>
      </tr>
      {open && hasBreakdown && breakdown.map((g, i) => (
        <GroupRow key={i} group={g} sectionTotal={total} revenueTotal={revenueTotal} />
      ))}
      {open && !hasBreakdown && items.map((item, i) => (
        <LeafRow key={i} label={item.label} value={item.value} revenueTotal={total} indent={28} />
      ))}
    </>
  )
}

export default function PLView({ data }) {
  if (!data) return null
  const pl = data.pl
  const rev = pl?.total_revenue

  const sections = [
    { title: 'Revenue', breakdown: pl?.revenue_breakdown, items: pl?.revenue, total: pl?.total_revenue, bold: true, defaultOpen: true },
    { title: 'Cost of Sales', breakdown: pl?.cogs_breakdown, items: pl?.cogs, total: pl?.total_cogs },
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
      <ViewHeader icon={FileText} title="Income statement" sub="profit or loss" accent="var(--brand)"
        meta={`${data.period} · in ₦ millions · expand Revenue or Cost of Sales for the segment & product-line breakdown`} />

      <div className="pl-grid">
        <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--brand)' }}>
          <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
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
                {sections.map((s, i) => <SectionRow key={i} {...s} revenueTotal={rev} />)}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="side-panel tinted" style={{ '--tint': 'var(--brand)' }}>
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
                <span className="side-value">{fmt.mm(row.value)}</span>
              </div>
            ))}
          </div>

          <div className="side-panel tinted" style={{ '--tint': 'var(--brand)' }}>
            <div className="side-panel-title">Margins</div>
            {[
              { label: 'Gross', value: pl?.gp_margin, color: 'var(--accent)' },
              { label: 'Operating', value: pl?.op_margin, color: 'var(--brand)' },
              { label: 'PBT', value: pl?.pbt_margin, color: 'var(--warn)' },
              { label: 'Net', value: pl?.pat_margin, color: pl?.pat_margin >= 0 ? 'var(--fav)' : 'var(--unfav)' },
            ].map((m, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{m.label}</span>
                <span className="badge" style={{ color: m.color, background: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
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
