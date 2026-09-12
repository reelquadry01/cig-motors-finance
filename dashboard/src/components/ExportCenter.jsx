import { useState } from 'react'
import { X, Download, Loader2, FileSpreadsheet, FileText, CheckSquare, Square } from 'lucide-react'
import { exportWorkbook } from '../lib/excelExport'
import { exportPdf } from '../lib/pdfExport'
import { buildCfoCommentary } from '../lib/cfoCommentary'

const REPORTS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'management-pl', label: 'Management P&L' },
  { id: 'income', label: 'Income statement' },
  { id: 'balancesheet', label: 'Balance sheet' },
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'workingcapital', label: 'Working capital' },
  { id: 'costs', label: 'Costs (opex + capex)' },
  { id: 'segments', label: 'Segment performance' },
  { id: 'budget', label: 'Budget vs Actual' },
  { id: 'ratios', label: 'Ratios' },
  { id: 'trend', label: 'Monthly trend' },
  { id: 'commentary', label: 'Commentary' },
]

export default function ExportCenter({ open, onClose, data }) {
  const [sel, setSel] = useState(() => new Set(REPORTS.map(r => r.id)))
  const [format, setFormat] = useState('excel')
  const [busy, setBusy] = useState(false)
  if (!open) return null

  const allOn = sel.size === REPORTS.length
  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel(allOn ? new Set() : new Set(REPORTS.map(r => r.id)))

  const run = async () => {
    if (busy || sel.size === 0) return
    setBusy(true)
    const ids = REPORTS.filter(r => sel.has(r.id)).map(r => r.id)
    try {
      if (format === 'excel') await exportWorkbook(ids, data, buildCfoCommentary)
      else await exportPdf(ids, data, buildCfoCommentary)
      onClose()
    } catch (e) { console.error('Export failed', e) }
    setBusy(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(20,18,16,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Export reports</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{data.period} · select what to download</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['excel', 'Excel workbook', FileSpreadsheet], ['pdf', 'PDF report', FileText]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setFormat(id)} className={`btn-mode ${format === id ? 'active' : ''}`}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 12px', fontSize: 13 }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <button onClick={toggleAll} className="btn-mode" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            {allOn ? <CheckSquare size={15} /> : <Square size={15} />} {allOn ? 'Clear all' : 'Select all'}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 14px' }}>
            {REPORTS.map(r => {
              const on = sel.has(r.id)
              return (
                <label key={r.id} className="collapse-trigger" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 8px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                  <span style={{ color: on ? 'var(--brand)' : 'var(--text-muted)', display: 'inline-flex' }}>{on ? <CheckSquare size={17} /> : <Square size={17} />}</span>
                  <input type="checkbox" checked={on} onChange={() => toggle(r.id)} style={{ display: 'none' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, color: 'var(--text-primary)' }}>{r.label}</span>
                </label>
              )
            })}
          </div>

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5 }}>
            {format === 'excel'
              ? "One workbook in ₦'000 with a Summary tab and Ratios that reference the statement sheets via live formulas; the income statement is a monthly model with an FY total."
              : "One PDF pack in ₦'000 — cover page plus each selected report, formatted for print."}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-mode" onClick={onClose}>Cancel</button>
          <button className="btn-mode active" onClick={run} disabled={busy || sel.size === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: sel.size === 0 ? 0.5 : 1 }}>
            {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            {busy ? 'Preparing…' : `Download ${sel.size || ''}`.trim()}
          </button>
        </div>
      </div>
    </div>
  )
}
