import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Loader2, CheckCircle2, XCircle, Circle, ChevronRight,
  Play, Clock, Upload, RotateCcw, Archive, Trash2, RefreshCw as SyncIcon,
  Plug, Cpu, KeyRound, Settings2, ChevronDown, ChevronUp, Trash,
} from 'lucide-react'
import { api } from '../../lib/api'
import { activityApi } from '../../lib/connectorApi'

const KIND_META = {
  upload:    { icon: Upload,      color: 'text-blue-600',    bg: 'bg-blue-100',    label: 'Upload' },
  restore:   { icon: RotateCcw,   color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Restore' },
  backup:    { icon: Archive,     color: 'text-amber-600',   bg: 'bg-amber-100',   label: 'Backup' },
  delete:    { icon: Trash2,      color: 'text-rose-600',    bg: 'bg-rose-100',    label: 'Delete' },
  sync:      { icon: SyncIcon,    color: 'text-purple-600',  bg: 'bg-purple-100',  label: 'Sync' },
  connector: { icon: Plug,        color: 'text-teal-600',    bg: 'bg-teal-100',    label: 'Connector' },
  pipeline:  { icon: Cpu,         color: 'text-orange-600',  bg: 'bg-orange-100',  label: 'Pipeline' },
  auth:      { icon: KeyRound,    color: 'text-neutral-500', bg: 'bg-neutral-100', label: 'Auth' },
  system:    { icon: Settings2,   color: 'text-neutral-500', bg: 'bg-neutral-100', label: 'System' },
}

const KIND_FILTERS = [
  { key: null, label: 'All' },
  { key: 'upload', label: 'Upload' },
  { key: 'restore', label: 'Restore' },
  { key: 'backup', label: 'Backup' },
  { key: 'delete', label: 'Delete' },
  { key: 'sync', label: 'Sync' },
  { key: 'connector', label: 'Connector' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'auth', label: 'Auth' },
  { key: 'system', label: 'System' },
]

function relativeTime(ts) {
  if (!ts) return ''
  const now = Date.now()
  const then = new Date(ts).getTime()
  const diffMs = now - then
  const secs = Math.floor(diffMs / 1000)
  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString()
}

function StatusPill({ status }) {
  const map = {
    queued: ['bg-neutral-100 text-neutral-700', 'Queued'],
    running: ['bg-sky-100 text-sky-800 animate-pulse', 'Running'],
    completed: ['bg-emerald-100 text-emerald-800', 'Complete'],
    failed: ['bg-rose-100 text-rose-800', 'Failed'],
  }
  const [cls, label] = map[status] || map.queued
  return <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${cls}`}>{label}</span>
}

function StepIcon({ status }) {
  if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
  if (status === 'running') return <Loader2 className="w-4 h-4 text-[#1f3a5f] animate-spin shrink-0" />
  if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
  return <Circle className="w-4 h-4 text-neutral-300 shrink-0" />
}

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
          Idle. Upload a file or run the pipeline to start.
        </div>
      ) : (
        <div className="space-y-2.5">
          {job.steps?.map((s, i) => (
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

function ActivityLogItem({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const meta = KIND_META[entry.kind] || KIND_META.system
  const Icon = meta.icon
  const hasMeta = entry.metadata && Object.keys(entry.metadata).length > 0

  return (
    <li className="flex items-start gap-2.5 text-xs group">
      <div className={`shrink-0 mt-0.5 p-1 rounded-md ${meta.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">{entry.action}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        {entry.detail && (
          <div className="text-neutral-500 mt-0.5 truncate">{entry.detail}</div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-neutral-400 text-[10.5px]">{relativeTime(entry.timestamp)}</span>
          {hasMeta && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
        {expanded && hasMeta && (
          <div className="mt-1.5 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2.5 py-2">
            {Object.entries(entry.metadata).map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[10.5px] font-mono">
                <span className="text-neutral-500 shrink-0">{k}:</span>
                <span className="text-neutral-700 dark:text-neutral-300 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

function ActivityHistory({ sessionItems = [] }) {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState(null)
  const [clearing, setClearing] = useState(false)

  const loadLogs = useCallback(async (kind) => {
    setLoading(true)
    try {
      const data = await activityApi.list(50, kind)
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Failed to load activity logs', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs(kindFilter) }, [kindFilter, loadLogs])

  const handleClear = async () => {
    if (!window.confirm('Clear all activity history? A backup will be saved on the server.')) return
    setClearing(true)
    try {
      await activityApi.clear()
      setEntries([])
      setTotal(0)
    } catch (e) {
      console.error('Failed to clear activity', e)
    } finally {
      setClearing(false)
    }
  }

  const nothing = !loading && entries.length === 0 && sessionItems.length === 0

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">Activity</div>
          <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">
            Recent
            {total > 0 && <span className="text-sm font-normal text-neutral-400 ml-1">({total.toLocaleString()})</span>}
          </h3>
        </div>
        <button
          onClick={handleClear}
          disabled={clearing || entries.length === 0}
          className="text-[11px] text-neutral-400 hover:text-rose-600 disabled:opacity-40 transition-colors flex items-center gap-1"
          title="Clear the persistent history (a backup is saved on the server)"
        >
          <Trash className="w-3 h-3" />
          {clearing ? 'Clearing…' : 'Clear history'}
        </button>
      </div>

      {/* Kind filter chips — only visible when there's history to filter */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {KIND_FILTERS.map(f => (
            <button
              key={f.key || 'all'}
              onClick={() => setKindFilter(f.key)}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors ${
                kindFilter === f.key
                  ? 'bg-[#1f3a5f] text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
        </div>
      )}
      {nothing && (
        <div className="text-xs text-neutral-500 py-8 text-center">No activity yet.</div>
      )}
      {!loading && !nothing && (
        <ul className="space-y-3 max-h-[520px] overflow-auto pr-1">
          {/* Session items — this-tab actions, newest first, faintly tagged */}
          {sessionItems.map(it => <SessionItem key={it.id} it={it} />)}
          {/* Divider between session and persistent, only when both exist */}
          {sessionItems.length > 0 && entries.length > 0 && (
            <li className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-1">
              <span className="text-[9.5px] tracking-[0.14em] uppercase text-neutral-400">Earlier</span>
            </li>
          )}
          {entries.map(entry => (
            <ActivityLogItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Session-only activity items rendered inline at the top of the unified
 * activity feed. Same shape as the persistent items so users see one stream.
 */
function SessionItem({ it }) {
  const icon = it.kind === 'success'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    : it.kind === 'error'
      ? <XCircle className="w-3.5 h-3.5 text-rose-600" />
      : <Clock className="w-3.5 h-3.5 text-neutral-400" />
  return (
    <li className="flex items-start gap-2.5 text-xs">
      <div className="shrink-0 mt-0.5 p-1 rounded-md bg-neutral-100 dark:bg-neutral-800">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">{it.message}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
            Session
          </span>
        </div>
        {it.detail && <div className="text-neutral-500 mt-0.5 truncate">{String(it.detail).split('\n')[0]}</div>}
        <div className="text-neutral-400 text-[10.5px] mt-0.5">{it.at.toLocaleTimeString()}</div>
      </div>
    </li>
  )
}

export default function PipelineTab() {
  const [activeJob, setActiveJob] = useState(null)
  const [activity, setActivity] = useState([])
  const [rerunBusy, setRerunBusy] = useState(false)
  const [jobHistory, setJobHistory] = useState([])

  const pushActivity = (kind, message, detail) =>
    setActivity(a => [{ id: Date.now(), kind, message, detail, at: new Date() }, ...a].slice(0, 20))

  const pollJob = useCallback((jobId) => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      try {
        const j = await api.jobStatus(jobId)
        setActiveJob(j)
        if (j.status === 'running' || j.status === 'queued') setTimeout(tick, 700)
        else if (j.status === 'completed') {
          pushActivity('success', 'Pipeline complete — dashboard refreshed')
          setJobHistory(h => [{ ...j, jobId, completedAt: new Date() }, ...h].slice(0, 10))
        }
        else if (j.status === 'failed') {
          pushActivity('error', 'Pipeline failed', j.error)
          setJobHistory(h => [{ ...j, jobId, completedAt: new Date() }, ...h].slice(0, 10))
        }
      } catch (e) { stopped = true; pushActivity('error', 'Pipeline status lookup failed', e.message) }
    }
    tick()
    return () => { stopped = true }
  }, [])

  const handleRerun = async () => {
    setRerunBusy(true)
    try {
      const r = await api.rerunPipeline()
      pushActivity('info', 'Pipeline running (manual)…')
      pollJob(r.jobId)
    } catch (e) { pushActivity('error', 'Manual re-run failed', e.message) }
    finally { setRerunBusy(false) }
  }

  return (
    <div className="space-y-6">
      {/* Section 1 — Live pipeline: the re-run button lives here, next to
          what it acts on. No separate quick-actions bar hovering above. */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Live pipeline</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">
              Kick a run off against whatever is currently in <code className="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-[10.5px]">data/current</code>.
            </p>
          </div>
          <button
            onClick={handleRerun}
            disabled={rerunBusy || activeJob?.status === 'running'}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-3 py-1.5 text-xs transition-colors"
          >
            {rerunBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Re-run pipeline
          </button>
        </div>
        <PipelinePanel job={activeJob} />
      </section>

      {/* Section 2 — Job history: only shown once there's something to show */}
      {jobHistory.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Job history</h2>
              <p className="text-[11.5px] text-neutral-500 mt-0.5">Pipeline runs from this session, newest first.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">
            {jobHistory.map((j, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <StatusPill status={j.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    {j.status === 'completed' ? 'Pipeline completed' : j.status === 'failed' ? 'Pipeline failed' : 'Running…'}
                  </div>
                  <div className="text-[10.5px] text-neutral-500 truncate">
                    {j.completedAt?.toLocaleString()}{j.error && ` · ${j.error.split('\n')[0]}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Session activity — a small inline feed of this-tab events. The
          full audit log now lives in its own Activity section in the sidebar. */}
      {activity.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">This session</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">
              Recent actions on this tab. See <a href="#activity" className="text-[#1f3a5f] hover:underline font-semibold">Activity</a> for the full audit log.
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <ul className="space-y-2.5">
              {activity.map(it => <SessionItem key={it.id} it={it} />)}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
