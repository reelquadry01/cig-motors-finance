// Overview — the admin console's front page. A quick read on what's live
// and what's happened lately, so someone opening the console at 9am sees
// the health of the pipeline at a glance without hunting.
//
// KPI cards on top:
//   • Connectors — count + how many are active
//   • Files — count + how many are populated
//   • Last pipeline run — status pill + relative time
//   • Activity today — event count
//
// Below the cards: two side-by-side blocks
//   • Data at a glance — every file type with its row count + last-updated
//   • Recent activity — the 6 most recent items with a link to Activity
import { useCallback, useEffect, useState } from 'react'
import {
  Plug, FolderInput, Workflow, Activity as ActivityIcon,
  CheckCircle2, XCircle, ArrowRight, Loader2, AlertTriangle, Clock,
} from 'lucide-react'
import { api } from '../../lib/api'
import { connectorApi, activityApi } from '../../lib/connectorApi'

const FILE_TYPE_LABEL = {
  gl: 'General ledger',
  mapping: 'Statement mapping',
  budget: 'Budget',
  account_summary: 'Account summary',
  prior_period: 'Prior period',
}

function relativeTime(ts) {
  if (!ts) return null
  const then = new Date(ts).getTime()
  const diff = Date.now() - then
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function OverviewTab({ onGoTo }) {
  const [files, setFiles] = useState(null)
  const [connectors, setConnectors] = useState(null)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [f, c, a] = await Promise.all([
        api.dataStatus().catch(() => null),
        connectorApi.listConnectors().catch(() => ({ connectors: [] })),
        activityApi.list(6, null).catch(() => ({ entries: [], total: 0 })),
      ])
      setFiles(f?.files || {})
      setConnectors(c?.connectors || [])
      setActivity(a)
    } catch (e) {
      setError(e.message || 'Could not load overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const connectorsActive = (connectors || []).filter(c => c.status?.status === 'idle' || c.status?.status === 'syncing').length
  const filesPopulated = Object.values(files || {}).filter(f => (f?.rows || 0) > 0).length
  const totalFiles = Object.keys(files || {}).length

  // Last pipeline event we know about
  const lastPipeline = (activity?.entries || []).find(e => e.kind === 'pipeline' && (e.action?.includes('completed') || e.action?.includes('failed')))

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPI row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Plug}
          label="Connectors"
          value={loading ? '—' : (connectors?.length ?? 0)}
          sub={loading ? ' ' : `${connectorsActive} active`}
          accent="from-sky-500/10 to-sky-500/0 text-sky-600"
          onClick={() => onGoTo?.('connectors')}
        />
        <KpiCard
          icon={FolderInput}
          label="Files"
          value={loading ? '—' : `${filesPopulated}/${totalFiles}`}
          sub={loading ? ' ' : `${filesPopulated} loaded`}
          accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600"
          onClick={() => onGoTo?.('files')}
        />
        <KpiCard
          icon={Workflow}
          label="Last pipeline"
          value={
            loading ? '—'
              : !lastPipeline ? 'Never'
                : (lastPipeline.action?.includes('completed') ? 'OK' : 'Failed')
          }
          sub={loading ? ' ' : relativeTime(lastPipeline?.timestamp) || 'no runs yet'}
          accent={lastPipeline?.action?.includes('failed')
            ? 'from-rose-500/10 to-rose-500/0 text-rose-600'
            : 'from-amber-500/10 to-amber-500/0 text-amber-600'}
          onClick={() => onGoTo?.('pipeline')}
        />
        <KpiCard
          icon={ActivityIcon}
          label="Activity"
          value={loading ? '—' : (activity?.total ?? 0).toLocaleString()}
          sub={loading ? ' ' : 'events on record'}
          accent="from-violet-500/10 to-violet-500/0 text-violet-600"
          onClick={() => onGoTo?.('activity')}
        />
      </section>

      {/* Two blocks side by side */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Files at a glance */}
        <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Data sources</h2>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">Every input the pipeline reads from.</p>
            </div>
            <button
              onClick={() => onGoTo?.('files')}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1f3a5f] hover:underline"
            >
              Manage files <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="grid place-items-center py-10 text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {Object.entries(files || {}).map(([type, f]) => {
                const populated = (f?.rows || 0) > 0
                return (
                  <li key={type} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${populated ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                      title={populated ? 'Loaded' : 'Empty'}
                    />
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex-1 truncate">
                      {FILE_TYPE_LABEL[type] || f?.label || type}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 tabular-nums">
                      {populated ? (f.rows || 0).toLocaleString() + ' rows' : '—'}
                    </span>
                    <span className="text-[11px] text-neutral-400 w-20 text-right shrink-0">
                      {f?.lastUpdated || 'never'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Recent</h2>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">Latest 6 events.</p>
            </div>
            <button
              onClick={() => onGoTo?.('activity')}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#1f3a5f] hover:underline"
            >
              All activity <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="grid place-items-center py-10 text-neutral-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : !activity?.entries?.length ? (
            <div className="text-xs text-neutral-500 py-6 text-center">Nothing yet.</div>
          ) : (
            <ul className="space-y-2.5">
              {activity.entries.slice(0, 6).map(e => (
                <li key={e.id} className="flex items-start gap-2 text-xs">
                  <EventDot kind={e.kind} action={e.action} />
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-800 dark:text-neutral-200 font-medium truncate">{e.action}</div>
                    <div className="text-neutral-400 text-[10.5px]">{relativeTime(e.timestamp) || ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:shadow-md transition-shadow"
    >
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} grid place-items-center mb-3`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[10px] tracking-[0.14em] font-semibold uppercase text-neutral-500">{label}</div>
      <div className="text-2xl font-extrabold text-[#1f3a5f] dark:text-white tabular-nums mt-0.5">{value}</div>
      <div className="text-[11px] text-neutral-500 mt-0.5">{sub}</div>
    </button>
  )
}

function EventDot({ kind, action }) {
  const isFail = kind === 'pipeline' && action?.toLowerCase().includes('failed')
  if (isFail) return <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
  if (kind === 'pipeline' && action?.toLowerCase().includes('completed'))
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
  return <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
}
