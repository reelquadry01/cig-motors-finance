// Admin page — password gate, upload cards, diff prompt, pipeline progress,
// activity log. Styled with Tailwind against the existing CIG brand palette
// (navy + brand red + neutral surfaces).
//
// Kept in a single file because every piece talks to every other piece
// (upload → diff → confirm → job) and splitting them would just add prop
// drilling. Sub-views (UploadCard, DiffModal, PipelinePanel, ActivityLog)
// are defined below the main component.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Lock, Upload as UploadIcon, FileSpreadsheet, Download, Check, X,
  RefreshCw, AlertTriangle, Clock, Loader2, ChevronRight, LogOut,
  CheckCircle2, XCircle, Circle, Eye, EyeOff, MoreVertical, Play,
  History, Trash2, Table as TableIcon, RotateCcw,
} from 'lucide-react'
import { api, getToken, setToken, clearToken } from '../lib/api'
import cigLogo from '../assets/cig-gac-logo.png'

const TYPE_ICONS = {
  gl: FileSpreadsheet,
  mapping: FileSpreadsheet,
  budget: FileSpreadsheet,
  account_summary: FileSpreadsheet,
  prior_period: FileSpreadsheet,
}
const TYPE_ACCENT = {
  gl: 'from-rose-500/10 to-rose-500/0 text-rose-600',
  mapping: 'from-sky-500/10 to-sky-500/0 text-sky-600',
  budget: 'from-emerald-500/10 to-emerald-500/0 text-emerald-600',
  account_summary: 'from-amber-500/10 to-amber-500/0 text-amber-600',
  prior_period: 'from-violet-500/10 to-violet-500/0 text-violet-600',
}
const TYPE_ORDER = ['gl', 'mapping', 'budget', 'account_summary', 'prior_period']

/* ────────────────────────────────────────────────── */

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [activePrompt, setActivePrompt] = useState(null)   // { fileType, diff, uploadId }
  const [activeJob, setActiveJob] = useState(null)         // job dict
  const [activity, setActivity] = useState([])
  // Per-card overlays. Only one open at a time, keyed by { fileType, mode }
  const [overlay, setOverlay] = useState(null)             // { fileType, mode: 'preview'|'backups'|'delete' }
  const [rerunBusy, setRerunBusy] = useState(false)

  const pushActivity = (kind, message, detail) =>
    setActivity(a => [{ id: Date.now(), kind, message, detail, at: new Date() }, ...a].slice(0, 20))

  const refreshStatus = () => {
    api.dataStatus()
      .then(r => { setStatus(r); setStatusError(null) })
      .catch(e => { setStatusError(e.message); if (e.message === 'Not authenticated') setAuthed(false) })
  }

  useEffect(() => { if (authed) refreshStatus() }, [authed])
  // Refresh once when a job completes
  useEffect(() => {
    if (activeJob?.status === 'completed') refreshStatus()
  }, [activeJob?.status])

  if (!authed) {
    return (
      <PasswordGate
        onAuthed={() => { setAuthed(true); pushActivity('info', 'Signed in') }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f2] via-white to-[#faf7f2] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <TopBar
        onSignOut={() => { clearToken(); setAuthed(false); setStatus(null); pushActivity('info', 'Signed out') }}
        onRefresh={refreshStatus}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <PageHead />

        <QuickActions
          busy={rerunBusy}
          onRerun={async () => {
            setRerunBusy(true)
            try {
              const r = await api.rerunPipeline()
              pushActivity('info', 'Pipeline running (manual)…')
              pollJob(r.jobId, setActiveJob, pushActivity)
            } catch (e) {
              pushActivity('error', 'Manual re-run failed', e.message)
            } finally { setRerunBusy(false) }
          }}
          onRefresh={refreshStatus}
        />

        {statusError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">
            {statusError}
          </div>
        )}

        <section className="mt-6">
          <SectionTitle title="Data sources" subtitle="Drop new files or manage what's live" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {TYPE_ORDER.map(t => (
              <UploadCard
                key={t}
                fileType={t}
                info={status?.files?.[t]}
                onDiffReady={(payload) => setActivePrompt(payload)}
                onError={(msg) => pushActivity('error', `Upload failed — ${t}`, msg)}
                onMenu={(mode) => setOverlay({ fileType: t, mode })}
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <SectionTitle title="Pipeline & activity" subtitle="Live progress and recent operations" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PipelinePanel job={activeJob} />
            </div>
            <ActivityLog items={activity} />
          </div>
        </section>

        <footer className="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs text-neutral-500">
          CIG Motors Co. Ltd. · Finance Data Prep · Admin console
        </footer>
      </main>

      {activePrompt && (
        <DiffModal
          payload={activePrompt}
          onClose={() => setActivePrompt(null)}
          onConfirm={async (action) => {
            const { uploadId, fileType } = activePrompt
            setActivePrompt(null)
            try {
              const r = await api.confirm(uploadId, action)
              pushActivity('info', `${labelOf(fileType)} — ${action === 'cancel' ? 'cancelled' : 'merged'}`)
              if (r.status === 'pipeline_running') {
                pushActivity('info', 'Pipeline running…')
                pollJob(r.jobId, setActiveJob, pushActivity)
              }
            } catch (e) {
              pushActivity('error', 'Confirm failed', e.message)
            }
          }}
        />
      )}

      {overlay?.mode === 'preview' && (
        <PreviewModal fileType={overlay.fileType} onClose={() => setOverlay(null)} />
      )}
      {overlay?.mode === 'backups' && (
        <BackupsModal
          fileType={overlay.fileType}
          onClose={() => setOverlay(null)}
          onRestored={(filename, jobId) => {
            setOverlay(null)
            pushActivity('success', `${labelOf(overlay.fileType)} restored`, filename)
            pollJob(jobId, setActiveJob, pushActivity)
          }}
          onError={(msg) => pushActivity('error', 'Restore failed', msg)}
        />
      )}
      {overlay?.mode === 'delete' && (
        <DeleteConfirm
          fileType={overlay.fileType}
          onCancel={() => setOverlay(null)}
          onDone={() => {
            setOverlay(null)
            pushActivity('info', `${labelOf(overlay.fileType)} removed from current`)
            refreshStatus()
          }}
          onError={(msg) => pushActivity('error', 'Delete failed', msg)}
        />
      )}
    </div>
  )
}

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
      if (j.status === 'running' || j.status === 'queued') {
        setTimeout(tick, 700)
      } else if (j.status === 'completed') {
        pushActivity('success', 'Pipeline complete — dashboard refreshed')
      } else if (j.status === 'failed') {
        pushActivity('error', 'Pipeline failed', j.error)
      }
    } catch (e) {
      stopped = true
      pushActivity('error', 'Pipeline status lookup failed', e.message)
    }
  }
  tick()
  return () => { stopped = true }
}

/* ────────────────────────────────────────────────── */
/* Password gate                                       */
/* ────────────────────────────────────────────────── */
function PasswordGate({ onAuthed }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!key) return
    setBusy(true); setError('')
    try {
      const r = await api.login(key)
      setToken(r.token)
      onAuthed()
    } catch (err) {
      setError(err.message || 'Sign-in failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#1f3a5f] via-[#1a1a1a] to-[#c8102e]/70">
      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={cigLogo} alt="CIG Motors" className="h-10 w-auto" />
          <div className="border-l border-neutral-300 pl-3">
            <div className="text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-500">Admin console</div>
            <h1 className="text-xl font-extrabold text-[#1f3a5f] leading-tight">Finance Data Prep</h1>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Admin key</span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <input
                type={reveal ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
                placeholder="Enter shared admin key"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-neutral-300 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none text-sm bg-white"
              />
              <button
                type="button"
                onClick={() => setReveal(v => !v)}
                aria-label={reveal ? 'Hide key' : 'Show key'}
                title={reveal ? 'Hide key' : 'Show key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#1f3a5f] rounded-md hover:bg-neutral-100 transition-colors"
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || !key}
            className="w-full rounded-lg bg-[#c8102e] hover:bg-[#a90d26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors shadow-sm"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</span>
            ) : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 text-[11px] text-neutral-500 text-center">
          For internal use. Sessions expire after 30 minutes of inactivity.
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────── */
/* Top bar                                             */
/* ────────────────────────────────────────────────── */
function TopBar({ onSignOut, onRefresh }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-neutral-950/85 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-4">
        <a href="/" className="flex items-center gap-3">
          <img src={cigLogo} alt="CIG Motors" className="h-9 w-auto" />
          <div className="border-l border-neutral-300 dark:border-neutral-700 pl-3">
            <div className="text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Admin console</div>
            <div className="text-sm font-extrabold text-[#1f3a5f] dark:text-white leading-tight">Finance Data Prep</div>
          </div>
        </a>
        <div className="flex-1" />
        <a href="/" className="text-xs font-medium text-neutral-600 hover:text-[#1f3a5f] flex items-center gap-1">
          View dashboard <ChevronRight className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={onRefresh}
          className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onSignOut}
          className="text-xs font-medium text-neutral-600 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-rose-50"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </header>
  )
}

function PageHead() {
  return (
    <div className="mb-8">
      <div className="text-[10.5px] tracking-[0.16em] font-semibold uppercase text-neutral-500 mb-1">Data pipeline management</div>
      <h1 className="text-3xl font-extrabold text-[#1f3a5f] dark:text-white tracking-tight leading-tight">Upload &amp; refresh</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 max-w-2xl">
        Drop the latest GL extract, statement mapping, or budget file into one of the cards below. We show you what changed before merging, run the pipeline, and refresh the dashboard.
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────────── */
/* Upload card                                         */
/* ────────────────────────────────────────────────── */
function UploadCard({ fileType, info, onDiffReady, onError, onMenu }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const Icon = TYPE_ICONS[fileType] || FileSpreadsheet

  // Click-outside closes the menu
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const r = await api.upload(fileType, file)
      onDiffReady({ fileType, ...r })
    } catch (e) { onError(e.message) }
    finally { setUploading(false) }
  }

  const hasFile = !!info?.lastUpdated
  const openAction = (mode) => { setMenuOpen(false); onMenu(mode) }

  return (
    <div className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${TYPE_ACCENT[fileType].replace('text-', 'from-').replace('/10', '/60').replace('to-', 'to-').split(' ').slice(0,2).join(' ')}`} />

      {/* ⋯ menu */}
      <div className="absolute top-3 right-3" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="p-1.5 rounded-md text-neutral-400 hover:text-[#1f3a5f] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="File actions"
          aria-label="File actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
            <MenuItem icon={TableIcon} label="Preview current" disabled={!hasFile} onClick={() => openAction('preview')} />
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
          <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight mt-0.5 truncate">
            {info?.label || labelOf(fileType)}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] mb-4">
        <dt className="text-neutral-500">Rows</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">
          {info?.rows === undefined || info?.rows === null
            ? <span className="text-neutral-400">—</span>
            : info.rows === -1
              ? <span className="text-rose-600">error</span>
              : info.rows.toLocaleString()}
        </dd>
        <dt className="text-neutral-500">Columns</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">{info?.columns ?? '—'}</dd>
        <dt className="text-neutral-500">Updated</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right">{info?.lastUpdated || <span className="text-neutral-400">never</span>}</dd>
        <dt className="text-neutral-500">Size</dt>
        <dd className="text-neutral-900 dark:text-neutral-100 text-right font-mono tabular-nums">{info?.sizeKB ? info.sizeKB + ' KB' : <span className="text-neutral-400">—</span>}</dd>
      </dl>

      <div className="flex items-center gap-2 mb-3">
        <a
          href={api.templateUrl(fileType)}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1f3a5f] hover:text-[#c8102e]"
        >
          <Download className="w-3.5 h-3.5" /> Download template
        </a>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files?.[0]; if (f) upload(f)
        }}
        className={`
          cursor-pointer rounded-xl border-2 border-dashed
          transition-all duration-200
          ${dragging
            ? 'border-[#c8102e] bg-[#c8102e]/5 scale-[1.01]'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-[#1f3a5f] hover:bg-[#1f3a5f]/5'}
          px-4 py-6 grid place-items-center text-center
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-[#1f3a5f]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-semibold">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-9 h-9 rounded-full grid place-items-center transition-colors ${dragging ? 'bg-[#c8102e] text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
              <UploadIcon className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              Drop file or <span className="text-[#c8102e]">click to browse</span>
            </div>
            <div className="text-[10.5px] text-neutral-500">.xlsx up to 50 MB</div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────── */
/* Diff modal                                          */
/* ────────────────────────────────────────────────── */
function DiffModal({ payload, onClose, onConfirm }) {
  const { fileType, diff } = payload
  const cellHeaders = useMemo(() => {
    // Take the union of preview cell keys, so the table columns are stable
    const s = new Set()
    ;(diff.preview || []).forEach(p => Object.keys(p.cells || {}).forEach(k => s.add(k)))
    return Array.from(s).slice(0, 5)
  }, [diff])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Upload summary</div>
              <h2 className="text-xl font-extrabold text-[#1f3a5f] dark:text-white">{labelOf(fileType)}</h2>
              <div className="text-xs text-neutral-500 mt-1">
                Diff key{diff.keys?.length > 1 ? 's' : ''}: <span className="font-mono">{(diff.keys || []).join(', ') || '—'}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100"><X className="w-4 h-4 text-neutral-500" /></button>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Existing" value={diff.existing?.rows} sub="rows" tint="neutral" />
            <Stat label="Uploaded" value={diff.uploaded?.rows} sub="rows" tint="neutral" />
            <Stat label="New" value={diff.new} sub="rows to add" tint="emerald" />
            <Stat label="Modified" value={diff.modified} sub="rows changed" tint="amber" />
          </div>
          {!!diff.duplicates && (
            <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              {diff.duplicates} duplicate rows will be skipped on append.
            </div>
          )}
        </div>

        {diff.preview?.length > 0 && (
          <div className="px-6 py-4 max-h-[280px] overflow-auto">
            <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-2">Preview</div>
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-200">
                  <th className="text-left py-1.5 pr-2 font-semibold">Change</th>
                  {cellHeaders.map(h => <th key={h} className="text-left py-1.5 pr-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {diff.preview.map((p, i) => (
                  <tr key={i} className="border-b border-neutral-100 last:border-0">
                    <td className="py-1.5 pr-2">
                      <ChangeBadge kind={p.change} />
                    </td>
                    {cellHeaders.map(h => (
                      <td key={h} className="py-1.5 pr-2 font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
                        {String(p.cells?.[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-3">
          <div className="flex-1 text-[11px] text-neutral-500 leading-relaxed">
            <div><strong className="text-neutral-700">Append</strong> keeps existing rows, adds new ones.</div>
            <div><strong className="text-neutral-700">Replace</strong> overwrites everything with this upload.</div>
          </div>
          <button
            onClick={() => onConfirm('cancel')}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
          >Cancel</button>
          <button
            onClick={() => onConfirm('append')}
            disabled={diff.first_run && diff.new === 0}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >Append new</button>
          <button
            onClick={() => onConfirm('replace')}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#c8102e] hover:bg-[#a90d26] text-white"
          >Replace all</button>
        </div>
      </div>
    </div>
  )
}

const Stat = ({ label, value, sub, tint }) => {
  const tints = {
    neutral: 'bg-neutral-100 text-neutral-900',
    emerald: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
  }
  return (
    <div className={`rounded-lg ${tints[tint]} px-3 py-2`}>
      <div className="text-[10px] tracking-[0.12em] font-semibold uppercase opacity-70">{label}</div>
      <div className="text-lg font-extrabold tabular-nums font-mono">{value?.toLocaleString?.() ?? '—'}</div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </div>
  )
}

const ChangeBadge = ({ kind }) => {
  const styles = {
    new: 'bg-emerald-100 text-emerald-800',
    modified: 'bg-amber-100 text-amber-800',
    duplicate: 'bg-neutral-200 text-neutral-600',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${styles[kind] || styles.duplicate}`}>
      {kind}
    </span>
  )
}

/* ────────────────────────────────────────────────── */
/* Pipeline progress panel                             */
/* ────────────────────────────────────────────────── */
function PipelinePanel({ job }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">Pipeline</div>
          <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Live progress</h3>
        </div>
        {job?.status && <StatusPill status={job.status} />}
      </div>

      {!job ? (
        <div className="grid place-items-center py-10 text-sm text-neutral-500">
          Idle. Upload a file to run the pipeline.
        </div>
      ) : (
        <div className="space-y-2.5">
          {job.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <StepIcon status={s.status} />
              <span className={`flex-1 ${s.status === 'done' ? 'text-neutral-800 dark:text-neutral-200' : s.status === 'running' ? 'text-[#1f3a5f] font-semibold' : 'text-neutral-500'}`}>
                {s.name}
              </span>
              {s.duration && <span className="text-[11px] font-mono text-neutral-500">{s.duration.toFixed(2)}s</span>}
            </div>
          ))}
          {job.status === 'completed' && (
            <a href="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              View dashboard <ChevronRight className="w-4 h-4" />
            </a>
          )}
          {job.status === 'failed' && job.error && (
            <details className="mt-4 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800">
              <summary className="cursor-pointer font-semibold">Pipeline failed. Show details</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px]">{job.error}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

const StatusPill = ({ status }) => {
  const map = {
    queued:    ['bg-neutral-100 text-neutral-700', 'Queued'],
    running:   ['bg-sky-100 text-sky-800 animate-pulse', 'Running'],
    completed: ['bg-emerald-100 text-emerald-800', 'Complete'],
    failed:    ['bg-rose-100 text-rose-800', 'Failed'],
  }
  const [cls, label] = map[status] || map.queued
  return <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${cls}`}>{label}</span>
}

const StepIcon = ({ status }) => {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
  if (status === 'running') return <Loader2 className="w-4 h-4 text-[#1f3a5f] animate-spin shrink-0" />
  if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
  return <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
}

/* ────────────────────────────────────────────────── */
/* Activity log                                        */
/* ────────────────────────────────────────────────── */
function ActivityLog({ items }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">Activity</div>
          <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Recent</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-neutral-500 py-6 text-center">No activity yet.</div>
      ) : (
        <ul className="space-y-2.5 max-h-[340px] overflow-auto pr-1">
          {items.map(it => (
            <li key={it.id} className="flex items-start gap-2.5 text-xs">
              <ActivityIcon kind={it.kind} />
              <div className="flex-1 min-w-0">
                <div className="text-neutral-800 dark:text-neutral-200 font-medium">{it.message}</div>
                {it.detail && <div className="text-neutral-500 truncate">{String(it.detail).split('\n')[0]}</div>}
                <div className="text-neutral-400 text-[10.5px] mt-0.5">{it.at.toLocaleTimeString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const ActivityIcon = ({ kind }) => {
  if (kind === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
  if (kind === 'error') return <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
  return <Clock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
}

/* ────────────────────────────────────────────────── */
/* Quick actions + section title                        */
/* ────────────────────────────────────────────────── */
function QuickActions({ onRerun, onRefresh, busy }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm px-3 py-2">
      <button
        onClick={onRerun}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 text-xs transition-colors"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
        Re-run pipeline
      </button>
      <button
        onClick={onRefresh}
        className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-3 py-1.5 text-xs"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Refresh status
      </button>
      <div className="flex-1" />
      <a
        href="/"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-[#1f3a5f]"
      >
        Open dashboard <ChevronRight className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[11.5px] text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`
        w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors
        ${disabled
          ? 'text-neutral-300 cursor-not-allowed'
          : danger
            ? 'text-rose-700 hover:bg-rose-50'
            : 'text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
      `}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </button>
  )
}

/* ────────────────────────────────────────────────── */
/* Modal shell                                          */
/* ────────────────────────────────────────────────── */
function ModalShell({ title, subtitle, onClose, children, footer, size = 'lg' }) {
  const w = size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-lg' : size === 'xl' ? 'max-w-4xl' : 'max-w-2xl'
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full ${w} rounded-2xl bg-white dark:bg-neutral-950 shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between shrink-0">
          <div>
            <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Admin</div>
            <h2 className="text-xl font-extrabold text-[#1f3a5f] dark:text-white">{title}</h2>
            {subtitle && <div className="text-xs text-neutral-500 mt-1">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────── */
/* Preview modal                                        */
/* ────────────────────────────────────────────────── */
function PreviewModal({ fileType, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    api.preview(fileType, 20)
      .then(setData)
      .catch(e => setError(e.message))
  }, [fileType])

  return (
    <ModalShell
      title={`Preview — ${labelOf(fileType)}`}
      subtitle={data ? `${data.shown} of ${data.total.toLocaleString()} rows shown · first ${data.shown}` : 'Loading…'}
      onClose={onClose}
      size="xl"
    >
      {error && (
        <div className="p-6 text-sm text-rose-700">{error}</div>
      )}
      {!error && !data && (
        <div className="p-6 grid place-items-center text-neutral-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
      {data && data.empty && (
        <div className="p-8 text-center text-sm text-neutral-500">No file yet. Upload one first.</div>
      )}
      {data && !data.empty && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-[11.5px] border-collapse">
            <thead>
              <tr className="border-b border-neutral-300 text-neutral-500">
                {data.columns.map(c => (
                  <th key={c} className="text-left py-1.5 pr-3 font-semibold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1.5 pr-3 font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap max-w-[220px] truncate">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  )
}

/* ────────────────────────────────────────────────── */
/* Backups modal — restore                              */
/* ────────────────────────────────────────────────── */
function BackupsModal({ fileType, onClose, onRestored, onError }) {
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    api.listBackups(fileType)
      .then(r => setRows(r.backups))
      .catch(e => onError(e.message))
  }, [fileType])

  const restore = async (filename) => {
    setBusy(filename)
    try {
      const r = await api.restore(fileType, filename)
      onRestored(filename, r.jobId)
    } catch (e) { onError(e.message); setBusy(null) }
  }

  return (
    <ModalShell
      title={`Restore backup — ${labelOf(fileType)}`}
      subtitle={rows ? `${rows.length} backup${rows.length === 1 ? '' : 's'} available` : 'Loading…'}
      onClose={onClose}
      size="md"
    >
      <div className="p-4">
        {rows == null && (
          <div className="grid place-items-center py-8 text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {rows && rows.length === 0 && (
          <div className="text-center py-8 text-sm text-neutral-500">
            No backups yet. A backup is taken every time a file is replaced.
          </div>
        )}
        {rows && rows.length > 0 && (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map(b => (
              <li key={b.filename} className="py-2.5 flex items-center gap-3">
                <History className="w-4 h-4 text-neutral-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-neutral-800 dark:text-neutral-200 truncate">
                    {b.timestamp ? new Date(b.timestamp).toLocaleString() : b.filename}
                  </div>
                  <div className="text-[10.5px] text-neutral-500 truncate">{b.filename} · {b.sizeKB} KB</div>
                </div>
                <button
                  disabled={busy === b.filename}
                  onClick={() => restore(b.filename)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 text-white text-[11px] font-semibold px-2.5 py-1"
                >
                  {busy === b.filename
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RotateCcw className="w-3.5 h-3.5" />}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalShell>
  )
}

/* ────────────────────────────────────────────────── */
/* Delete confirm                                       */
/* ────────────────────────────────────────────────── */
function DeleteConfirm({ fileType, onCancel, onDone, onError }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try { await api.deleteFile(fileType); onDone() }
    catch (e) { onError(e.message); setBusy(false) }
  }
  return (
    <ModalShell
      title={`Remove ${labelOf(fileType)}?`}
      subtitle="The current file will be moved to backups — you can restore it any time."
      onClose={onCancel}
      size="sm"
      footer={(
        <>
          <div className="flex-1 text-[11.5px] text-neutral-500">A fresh backup is taken first.</div>
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-semibold text-neutral-600 hover:bg-neutral-100">Cancel</button>
          <button
            disabled={busy}
            onClick={run}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Remove
          </button>
        </>
      )}
    >
      <div className="p-6 text-sm text-neutral-700">
        Removing the current <strong className="text-[#1f3a5f]">{labelOf(fileType)}</strong> won't lose it — a backup is taken first, and you can restore it from the file's menu.
      </div>
    </ModalShell>
  )
}
