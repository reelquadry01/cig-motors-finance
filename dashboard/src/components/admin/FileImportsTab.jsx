import { useState, useEffect, useRef } from 'react'
import {
  FileSpreadsheet, Upload as UploadIcon, Download, Loader2, MoreVertical,
  Table as TableIcon, History, Trash2, RotateCcw, RefreshCw, Play, X,
  ChevronRight,
} from 'lucide-react'
import { api } from '../../lib/api'
import DiffModal from './DiffModal'

const TYPE_ICONS = {
  gl: FileSpreadsheet, mapping: FileSpreadsheet, budget: FileSpreadsheet,
  account_summary: FileSpreadsheet, prior_period: FileSpreadsheet,
}
const TYPE_ACCENT = {
  gl: 'from-rose-500/10 to-rose-500/0 text-rose-600',
  mapping: 'from-sky-500/10 to-sky-500/0 text-sky-600',
  budget: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600',
  account_summary: 'from-amber-500/10 to-amber-500/0 text-amber-600',
  prior_period: 'from-violet-500/10 to-violet-500/0 text-violet-600',
}
const TYPE_ORDER = ['gl', 'mapping', 'budget', 'account_summary', 'prior_period']
const labelOf = t => ({
  gl: 'GL data', mapping: 'Statement mapping', budget: 'Budget',
  account_summary: 'Account summary', prior_period: 'Prior period',
}[t] || t)

function pollJob(jobId, setActiveJob, pushActivity) {
  let stopped = false
  const tick = async () => {
    if (stopped) return
    try {
      const j = await api.jobStatus(jobId)
      setActiveJob(j)
      if (j.status === 'running' || j.status === 'queued') setTimeout(tick, 700)
      else if (j.status === 'completed') pushActivity('success', 'Pipeline complete — dashboard refreshed')
      else if (j.status === 'failed') pushActivity('error', 'Pipeline failed', j.error)
    } catch (e) { stopped = true; pushActivity('error', 'Pipeline status lookup failed', e.message) }
  }
  tick()
  return () => { stopped = true }
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button disabled={disabled} onClick={onClick} className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${disabled ? 'text-neutral-300 cursor-not-allowed' : danger ? 'text-rose-700 hover:bg-rose-50' : 'text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />{label}
    </button>
  )
}

function UploadCard({ fileType, info, onDiffReady, onError, onMenu }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const Icon = TYPE_ICONS[fileType] || FileSpreadsheet

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try { const r = await api.upload(fileType, file); onDiffReady({ fileType, ...r }) }
    catch (e) { onError(e.message) }
    finally { setUploading(false) }
  }

  const hasFile = !!info?.lastUpdated
  const openAction = (mode) => { setMenuOpen(false); onMenu(mode) }

  return (
    <div className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${TYPE_ACCENT[fileType]?.replace('text-', 'from-').replace('/10', '/60').replace('to-', 'to-').split(' ').slice(0, 2).join(' ') || ''}`} />
      <div className="absolute top-3 right-3" ref={menuRef}>
        <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 rounded-md text-neutral-400 hover:text-[#1f3a5f] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" title="File actions">
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
            <MenuItem icon={TableIcon} label="Preview current" disabled={!hasFile} onClick={() => openAction('preview')} />
            <MenuItem icon={Download} label="Download current" disabled={!hasFile} onClick={() => openAction('download')} />
            <MenuItem icon={History} label="Restore backup" onClick={() => openAction('backups')} />
            <div className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
            <MenuItem icon={Trash2} label="Remove current" danger disabled={!hasFile} onClick={() => openAction('delete')} />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 mb-4 pr-8">
        <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${TYPE_ACCENT[fileType]} grid place-items-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.14em] font-semibold uppercase text-neutral-500">{fileType.replace('_', ' ')}</div>
          <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight mt-0.5 truncate">{info?.label || labelOf(fileType)}</div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] mb-4">
        <dt className="text-neutral-500">Rows</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">
          {info?.rows === undefined || info?.rows === null ? <span className="text-neutral-400">—</span> : info.rows === -1 ? <span className="text-rose-600">error</span> : info.rows.toLocaleString()}
        </dd>
        <dt className="text-neutral-500">Columns</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">{info?.columns ?? '—'}</dd>
        <dt className="text-neutral-500">Updated</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right">{info?.lastUpdated || <span className="text-neutral-400">never</span>}</dd>
        <dt className="text-neutral-500">Size</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">{info?.sizeKB ? info.sizeKB + ' KB' : <span className="text-neutral-400">—</span>}</dd>
      </dl>

      <div className="flex items-center gap-2 mb-3">
        <a href={api.templateUrl(fileType)} className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1f3a5f] hover:text-[#c8102e]">
          <Download className="w-3.5 h-3.5" /> Download template
        </a>
      </div>

      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <div onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f) }}
        className={`cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 ${dragging ? 'border-[#c8102e] bg-[#c8102e]/5 scale-[1.01]' : 'border-neutral-300 dark:border-neutral-700 hover:border-[#1f3a5f] hover:bg-[#1f3a5f]/5'} px-4 py-6 grid place-items-center text-center`}>
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-[#1f3a5f]">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs font-semibold">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full grid place-items-center transition-colors ${dragging ? 'bg-[#c8102e] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
              <UploadIcon className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Drop file or <span className="text-[#c8102e]">click to browse</span></div>
            <div className="text-[10.5px] text-neutral-500">.xlsx up to 50 MB</div>
          </div>
        )}
      </div>
    </div>
  )
}

function PreviewModal({ fileType, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => { api.preview(fileType, 20).then(setData).catch(e => setError(e.message)) }, [fileType])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between shrink-0">
          <div>
            <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Preview</div>
            <h2 className="text-xl font-extrabold text-[#1f3a5f] dark:text-white">{labelOf(fileType)}</h2>
            <div className="text-xs text-neutral-500 mt-1">{data ? `${data.shown} of ${data.total.toLocaleString()} rows` : 'Loading…'}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button>
        </div>
        <div className="flex-1 overflow-auto">
          {error && <div className="p-6 text-sm text-rose-700">{error}</div>}
          {!error && !data && <div className="p-6 grid place-items-center text-neutral-500"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {data && !data.empty && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-[11.5px] border-collapse">
                <thead><tr className="border-b border-neutral-300 text-neutral-500">{data.columns.map(c => <th key={c} className="text-left py-1.5 pr-3 font-semibold whitespace-nowrap">{c}</th>)}</tr></thead>
                <tbody>{data.rows.map((row, i) => <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">{row.map((cell, j) => <td key={j} className="py-1.5 pr-3 font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap max-w-[220px] truncate">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BackupsModal({ fileType, onClose, onRestored, onError }) {
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => { api.listBackups(fileType).then(r => setRows(r.backups)).catch(e => onError(e.message)) }, [fileType])

  const restore = async (filename) => {
    setBusy(filename)
    try { const r = await api.restore(fileType, filename); onRestored(filename, r.jobId) }
    catch (e) { onError(e.message); setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between shrink-0">
          <div>
            <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Admin</div>
            <h2 className="text-xl font-extrabold text-[#1f3a5f] dark:text-white">Restore — {labelOf(fileType)}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {rows == null && <div className="grid place-items-center py-8 text-neutral-500"><Loader2 className="w-5 h-5 animate-spin" /></div>}
          {rows && rows.length === 0 && <div className="text-center py-8 text-sm text-neutral-500">No backups yet.</div>}
          {rows && rows.length > 0 && (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map(b => (
                <li key={b.filename} className="py-2.5 flex items-center gap-3">
                  <History className="w-4 h-4 text-neutral-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-neutral-800 dark:text-neutral-200 truncate">{b.timestamp ? new Date(b.timestamp).toLocaleString() : b.filename}</div>
                    <div className="text-[10.5px] text-neutral-500 truncate">{b.filename} · {b.sizeKB} KB</div>
                  </div>
                  <button disabled={busy === b.filename} onClick={() => restore(b.filename)} className="inline-flex items-center gap-1.5 rounded-md bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 text-white text-[11px] font-semibold px-2.5 py-1">
                    {busy === b.filename ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ fileType, onCancel, onDone, onError }) {
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { await api.deleteFile(fileType); onDone() } catch (e) { onError(e.message); setBusy(false) } }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div>
            <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Admin</div>
            <h2 className="text-xl font-extrabold text-[#1f3a5f] dark:text-white">Remove {labelOf(fileType)}?</h2>
            <div className="text-xs text-neutral-500 mt-1">A backup is taken first — you can restore it any time.</div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button>
        </div>
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <div className="flex-1 text-[11.5px] text-neutral-500">A fresh backup is taken first.</div>
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-semibold text-neutral-600 hover:bg-neutral-100">Cancel</button>
          <button disabled={busy} onClick={run} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FileImportsTab() {
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [activePrompt, setActivePrompt] = useState(null)
  const [activeJob, setActiveJob] = useState(null)
  const [overlay, setOverlay] = useState(null)
  const [rerunBusy, setRerunBusy] = useState(false)
  const [activity, setActivity] = useState([])

  const pushActivity = (kind, message, detail) =>
    setActivity(a => [{ id: Date.now(), kind, message, detail, at: new Date() }, ...a].slice(0, 20))

  const refreshStatus = () => {
    api.dataStatus()
      .then(r => { setStatus(r); setStatusError(null) })
      .catch(e => { setStatusError(e.message) })
  }

  useEffect(() => { refreshStatus() }, [])
  useEffect(() => { if (activeJob?.status === 'completed') refreshStatus() }, [activeJob?.status])

  return (
    <div className="space-y-6">
      {statusError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">{statusError}</div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm px-3 py-2">
        <button onClick={async () => { setRerunBusy(true); try { const r = await api.rerunPipeline(); pushActivity('info', 'Pipeline running…'); pollJob(r.jobId, setActiveJob, pushActivity) } catch (e) { pushActivity('error', 'Manual re-run failed', e.message) } finally { setRerunBusy(false) } }}
          disabled={rerunBusy} className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 text-white font-semibold px-3 py-1.5 text-xs transition-colors">
          {rerunBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}Re-run pipeline
        </button>
        <button onClick={refreshStatus} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-3 py-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh status
        </button>
        <div className="flex-1" />
        <a href="/" className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-[#1f3a5f]">Open dashboard <ChevronRight className="w-3.5 h-3.5" /></a>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Import Files</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">Upload configuration files — GL data can also come from Data Sources tab</p>
          </div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/50 px-4 py-3 mb-4">
          <p className="text-xs text-sky-800 dark:text-sky-200">
            <strong>GL Data:</strong> Upload manually here, OR connect to your ERP/database via the <strong>Data Sources</strong> tab for automatic sync.
            <br />
            <strong>Statement Mapping &amp; Budget:</strong> Always uploaded here as CSV/Excel files — these define how your GL accounts map to financial statements.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TYPE_ORDER.map(t => (
            <UploadCard key={t} fileType={t} info={status?.files?.[t]}
              onDiffReady={(payload) => setActivePrompt(payload)}
              onError={(msg) => pushActivity('error', `Upload failed — ${t}`, msg)}
              onMenu={async (mode) => {
                if (mode === 'download') {
                  // No modal — just trigger the download.
                  try {
                    await api.downloadFile(t)
                    pushActivity('info', `${labelOf(t)} downloaded`)
                  } catch (e) {
                    pushActivity('error', `${labelOf(t)} download failed`, e.message)
                  }
                  return
                }
                setOverlay({ fileType: t, mode })
              }}
            />
          ))}
        </div>
      </section>

      {activity.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Recent Activity</h2>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <ul className="space-y-2.5 max-h-[200px] overflow-auto pr-1">
              {activity.map(it => (
                <li key={it.id} className="flex items-start gap-2.5 text-xs">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${it.kind === 'success' ? 'bg-emerald-500' : it.kind === 'error' ? 'bg-rose-500' : 'bg-neutral-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-800 dark:text-neutral-200 font-medium">{it.message}</div>
                    {it.detail && <div className="text-neutral-500 truncate">{String(it.detail).split('\n')[0]}</div>}
                    <div className="text-neutral-400 text-[10.5px] mt-0.5">{it.at.toLocaleTimeString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activePrompt && (
        <DiffModal payload={activePrompt} onClose={() => setActivePrompt(null)}
          onConfirm={async (action) => {
            const { uploadId, fileType } = activePrompt
            setActivePrompt(null)
            try {
              const r = await api.confirm(uploadId, action)
              pushActivity('info', `${labelOf(fileType)} — ${action === 'cancel' ? 'cancelled' : 'merged'}`)
              if (r.status === 'pipeline_running') { pushActivity('info', 'Pipeline running…'); pollJob(r.jobId, setActiveJob, pushActivity) }
            } catch (e) { pushActivity('error', 'Confirm failed', e.message) }
          }}
        />
      )}
      {overlay?.mode === 'preview' && <PreviewModal fileType={overlay.fileType} onClose={() => setOverlay(null)} />}
      {overlay?.mode === 'backups' && (
        <BackupsModal fileType={overlay.fileType} onClose={() => setOverlay(null)}
          onRestored={(filename, jobId) => { setOverlay(null); pushActivity('success', `${labelOf(overlay.fileType)} restored`, filename); pollJob(jobId, setActiveJob, pushActivity) }}
          onError={(msg) => pushActivity('error', 'Restore failed', msg)}
        />
      )}
      {overlay?.mode === 'delete' && (
        <DeleteConfirm fileType={overlay.fileType} onCancel={() => setOverlay(null)}
          onDone={() => { setOverlay(null); pushActivity('info', `${labelOf(overlay.fileType)} removed from current`); refreshStatus() }}
          onError={(msg) => pushActivity('error', 'Delete failed', msg)}
        />
      )}
    </div>
  )
}
