import { Target } from 'lucide-react'
import fmt from '../lib/fmt'
import ViewHeader from './ui/ViewHeader'
import { budgetVariance } from '../lib/sections'

export default function BudgetView({ data }) {
  if (!data) return null
  const lines = budgetVariance(data)

  return (
    <div className="animate-in">
      <ViewHeader icon={Target} title="Budget vs actual" sub="variance analysis" accent="var(--accent)"
        meta={`${data.period}${lines ? ' · in ₦ millions' : ''}`} />

      {!lines ? (
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', width: 52, height: 52, borderRadius: 'var(--radius-lg)', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'var(--accent-soft)', marginBottom: 16 }}>
            <Target size={24} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No budget loaded for this period</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            Variance analysis will appear here automatically once budget figures are supplied. Populate <strong>Budget_Template.xlsx</strong> (budget by GL code and month) and re-run the pipeline — the dashboard reads it and lights up this section with actual-vs-budget and variance columns.
          </div>
        </div>
      ) : (
        <div className="card tinted" style={{ padding: 0, overflow: 'hidden', '--tint': 'var(--accent)' }}>
          <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Line item</th>
                  <th>Actual</th>
                  <th>Budget</th>
                  <th>Variance</th>
                  <th>Var %</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const fav = l.var_abs >= 0
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{l.label}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(l.actual)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt.mm(l.budget)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: fav ? 'var(--fav)' : 'var(--unfav)' }}>{fmt.mm(l.var_abs)}</td>
                      <td style={{ textAlign: 'right' }}>{l.var_pct === null ? '—' : <span className={`badge ${fav ? 'badge-fav' : 'badge-unfav'}`}>{fmt.pct(l.var_pct)}</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
