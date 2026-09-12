import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportStatement } from '../../lib/excelExport'

export default function DownloadExcel({ kind, data, label = 'Excel' }) {
  const [busy, setBusy] = useState(false)
  const onClick = async () => {
    if (busy) return
    setBusy(true)
    try { await exportStatement(kind, data) } catch (e) { console.error('Excel export failed', e) }
    setBusy(false)
  }
  return (
    <button className="btn-mode" onClick={onClick} disabled={busy}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '6px 12px' }}
      title="Download this statement as an Excel file with live formulas">
      {busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
      {busy ? 'Preparing…' : label}
    </button>
  )
}
