import { useState } from 'react'
import { ChevronRight, ArrowLeftRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'
import { CHART } from './Charts'

const COLORS = [CHART.brand, CHART.accent, CHART.green, CHART.amber, CHART.magenta]

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
        <td style={{ textAlign: 'right' }}>—</td>
      </tr>
      {open && items.map((item, i) => (
        <tr key={i} style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <td style={{ paddingLeft: 28, color: 'var(--text-secondary)' }}>{item.label}</td>
          <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.ng0(item.value)}</td>
          <td style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {total !== 0 ? fmt.pct(item.value / total * 100) : '—'}
            </span>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function CFView({ data }) {
  if (!data) return null
  const cf = data.cf

  const sections = [
    { title: 'Operating Activities', items: cf?.operating?.items, total: cf?.operating?.total, defaultOpen: true },
    { title: 'Investing Activities', items: cf?.investing?.items, total: cf?.investing?.total },
    { title: 'Financing Activities', items: cf?.financing?.items, total: cf?.financing?.total },
  ]

  const donutData = [
    { name: 'Operations', value: Math.abs(cf?.operating?.total || 0) },
    { name: 'Investing', value: Math.abs(cf?.investing?.total || 0) },
    { name: 'Financing', value: Math.abs(cf?.financing?.total || 0) },
  ].filter(d => d.value > 0)

  return (
    <div className="animate-in">
      <ViewHeader icon={ArrowLeftRight} title="Cash flow" sub="movements" accent="var(--fav)"
        meta={`${data.period} · ₦ millions`} />

      <div className="pl-grid">
        <div>
          <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--fav)' }}>
            <div style={{ padding: '16px 24px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}></th>
                    <th>Amount</th>
                    <th>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s, i) => <SectionRow key={i} {...s} />)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Net Change in Cash</span>
            <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: cf?.net_change >= 0 ? 'var(--fav)' : 'var(--unfav)' }}>
              {fmt.ng0(cf?.net_change)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="chart-card">
            <div className="chart-title">Cash flow split</div>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip formatter={v => fmt.ng0(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Net</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: cf?.net_change >= 0 ? 'var(--fav)' : 'var(--unfav)' }}>
                  {fmt.ngM(cf?.net_change)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', justifyContent: 'center', marginTop: 8 }}>
              {donutData.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: COLORS[i] }} />
                  {d.name}
                </div>
              ))}
            </div>
          </div>

          <div className="side-panel tinted" style={{ '--tint': 'var(--fav)' }}>
            <div className="side-panel-title">Cash summary</div>
            {[
              { label: 'Opening', value: cf?.opening_cash },
              { label: 'Net Change', value: cf?.net_change },
              { label: 'Closing', value: cf?.closing_cash },
            ].map((row, i) => (
              <div key={i} className="side-row">
                <span className="side-label">{row.label}</span>
                <span className="side-value" style={{ color: i === 1 && row.value < 0 ? 'var(--unfav)' : undefined }}>
                  {fmt.ngM(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
