import { useState } from 'react'
import { X, Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react'
import { exportWorkbook } from '../lib/excelExport'
import { exportPdf } from '../lib/pdfExport'
import { buildCfoCommentary } from '../lib/cfoCommentary'
import { useSettings } from '../contexts/SettingsContext'
import ReportModelSelector from './ReportModelSelector'

export default function ExportCenter({ open, onClose, data }) {
  const [selectedModel, setSelectedModel] = useState('three_statement')
  const [format, setFormat] = useState('excel')
  const [busy, setBusy] = useState(false)
  const { settings } = useSettings()
  if (!open) return null

  const run = async () => {
    if (busy || !selectedModel) return
    setBusy(true)
    try {
      const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''
      window.open(`${API_BASE}/api/export/${selectedModel}?format=${format}`, '_blank')
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
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{data.period} · select a model and format</div>
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

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Report Model
          </div>
          <ReportModelSelector industry={settings?.industry} selected={selectedModel} onChange={setSelectedModel} />

          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.5 }}>
            {format === 'excel'
              ? "One workbook in ₦'000 with a Summary tab and Ratios that reference the statement sheets via live formulas; the income statement is a monthly model with an FY total."
              : "One PDF pack in ₦'000 — cover page plus each selected report, formatted for print."}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-mode" onClick={onClose}>Cancel</button>
          <button className="btn-mode active" onClick={run} disabled={busy || !selectedModel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: !selectedModel ? 0.5 : 1 }}>
            {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
            {busy ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
