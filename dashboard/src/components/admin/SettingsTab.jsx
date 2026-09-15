// Settings — read-only info about the console + dataset actions.
//
// Two blocks:
//   1. Current configuration — what the console is running against
//      (company, currency, session length, upload limit, hosting).
//   2. Dataset — one-click load sample data, one-click clear everything.
//      Every mutating action here takes a backup first, so it's reversible
//      from each file's own menu on the Files page.
import { useState } from 'react'
import { Info, Sparkles, AlertTriangle, Loader2, Download } from 'lucide-react'
import { api } from '../../lib/api'

const ROWS = [
  { key: 'Company', value: 'CIG Motors Co. Ltd.', help: 'Baked into the pipeline config. Change it in pipeline/config.py.' },
  { key: 'Currency', value: 'Nigerian Naira (₦)', help: 'Presented in thousands (₦\'000) on the dashboard and Excel model.' },
  { key: 'Session length', value: '30 minutes of inactivity', help: 'Backend env var TOKEN_TTL_MINUTES on Render.' },
  { key: 'Upload limit', value: '50 MB per file', help: 'Backend env var MAX_UPLOAD_MB.' },
  { key: 'Pipeline timeout', value: '60 seconds', help: 'Backend env var PIPELINE_TIMEOUT_S.' },
  { key: 'Hosting', value: 'Render — free tier', help: 'Data survives redeploys only on Starter and above.' },
]

export default function SettingsTab() {
  return (
    <div className="space-y-8">
      {/* 1. Current configuration ─────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Configuration</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">A read-only snapshot of the console's current setup.</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {ROWS.map(r => (
              <li key={r.key} className="px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-40 shrink-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {r.key}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{r.value}</div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">{r.help}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
          <div className="text-[11.5px] text-sky-800 dark:text-sky-200 leading-relaxed">
            To change these values, edit them where they actually live — Render's environment variables for the
            session / upload / timeout knobs, and <code className="px-1 rounded bg-white/50 dark:bg-black/30">pipeline/config.py</code> for
            firm identity.
          </div>
        </div>
      </section>

      {/* 2. Dataset actions ──────────────────────────────────────── */}
      <DatasetSection />
    </div>
  )
}

/* ─── Dataset actions: Load sample, Clear all ──────────────────── */
function DatasetSection() {
  const [busy, setBusy] = useState(null)          // 'sample' | 'clear' | null
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const loadSample = async () => {
    setBusy('sample'); setError(null); setSuccess(null)
    try {
      const r = await api.loadSample()
      setSuccess(`Loaded ${r.copied.length} sample file${r.copied.length === 1 ? '' : 's'} — pipeline is running.`)
    } catch (e) { setError(e.message) }
    finally { setBusy(null) }
  }

  const clearAll = async () => {
    setBusy('clear'); setError(null); setSuccess(null)
    try {
      const r = await api.clearAll()
      setSuccess(r.removed.length
        ? `Cleared ${r.removed.length} file${r.removed.length === 1 ? '' : 's'} (backed up first).`
        : 'Nothing to clear — data/current was already empty.')
      setConfirmClear(false)
    } catch (e) { setError(e.message) }
    finally { setBusy(null) }
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Dataset</h2>
        <p className="text-[11.5px] text-neutral-500 mt-0.5">Reset to sample data, or wipe everything currently loaded.</p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 px-4 py-2.5 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 px-4 py-2.5 text-xs">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Load sample */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/15 to-sky-500/0 text-sky-600 grid place-items-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#1f3a5f] dark:text-white">Load sample data</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Copies the bundled Sample GL &amp; Statement Mapping into <code className="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-[10.5px]">data/current</code> and runs the pipeline.
            Any existing files are backed up first — restore them from each file's menu.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={loadSample}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 text-white font-semibold px-3 py-2 text-xs"
            >
              {busy === 'sample' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Load sample
            </button>
            <a
              href="https://github.com/reelquadry01/cig-motors-finance/raw/master/Sample%20GL_complete_dirty.xlsx"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold px-3 py-2"
              title="Download the raw sample GL so you can play with the upload flow"
            >
              <Download className="w-3.5 h-3.5" /> Sample GL (.xlsx)
            </a>
          </div>
        </div>

        {/* Clear all */}
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-neutral-900 p-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/15 to-rose-500/0 text-rose-600 grid place-items-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#1f3a5f] dark:text-white">Clear all current data</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Removes every file from <code className="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-[10.5px]">data/current</code> so you can start clean.
            A backup is taken first, and each file's menu on the Files page shows the restore points.
          </p>
          <div className="mt-4">
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-400 font-semibold px-3 py-2 text-xs disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Clear everything
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAll}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-3 py-2 text-xs"
                >
                  {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Yes, clear all
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  disabled={busy !== null}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200 px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
