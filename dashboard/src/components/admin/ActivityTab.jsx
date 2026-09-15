// Activity — the full-page audit log. Same store the PipelineTab used to
// show inline, but promoted to its own section so it gets the room it needs
// for filtering and reading long details.
import { useCallback, useEffect, useState } from 'react'
import {
  Loader2, Trash, ChevronDown, ChevronUp, Upload, RotateCcw, Archive,
  Trash2, RefreshCw as SyncIcon, Plug, Cpu, KeyRound, Settings2, Search,
} from 'lucide-react'
import { activityApi } from '../../lib/connectorApi'

const KIND_META = {
  upload:    { icon: Upload,      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950/50',       label: 'Upload' },
  restore:   { icon: RotateCcw,   color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/50', label: 'Restore' },
  backup:    { icon: Archive,     color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-950/50',     label: 'Backup' },
  delete:    { icon: Trash2,      color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-950/50',       label: 'Delete' },
  sync:      { icon: SyncIcon,    color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-950/50',   label: 'Sync' },
  connector: { icon: Plug,        color: 'text-teal-600',    bg: 'bg-teal-100 dark:bg-teal-950/50',       label: 'Connector' },
  pipeline:  { icon: Cpu,         color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-950/50',   label: 'Pipeline' },
  auth:      { icon: KeyRound,    color: 'text-neutral-500', bg: 'bg-neutral-100 dark:bg-neutral-800',    label: 'Auth' },
  system:    { icon: Settings2,   color: 'text-neutral-500', bg: 'bg-neutral-100 dark:bg-neutral-800',    label: 'System' },
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
  const diff = Date.now() - new Date(ts).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString()
}

export default function ActivityTab() {
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState(null)
  const [query, setQuery] = useState('')
  const [clearing, setClearing] = useState(false)

  const load = useCallback(async (kind) => {
    setLoading(true)
    try {
      const data = await activityApi.list(200, kind)
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('Failed to load activity logs', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(kindFilter) }, [kindFilter, load])

  const handleClear = async () => {
    if (!window.confirm('Clear all activity history? A backup is saved on the server.')) return
    setClearing(true)
    try {
      await activityApi.clear()
      setEntries([])
      setTotal(0)
    } catch (e) { console.error('Failed to clear activity', e) }
    finally { setClearing(false) }
  }

  // Client-side text search over action + detail
  const q = query.trim().toLowerCase()
  const visible = q
    ? entries.filter(e => (e.action + ' ' + (e.detail || '')).toLowerCase().includes(q))
    : entries

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions or details…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none text-sm"
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={() => load(kindFilter)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-3 py-2 text-xs"
        >
          Refresh
        </button>
        <button
          onClick={handleClear}
          disabled={clearing || entries.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-400 font-semibold px-3 py-2 text-xs disabled:opacity-40"
        >
          <Trash className="w-3.5 h-3.5" />
          {clearing ? 'Clearing…' : 'Clear history'}
        </button>
      </div>

      {/* Kind chips */}
      <div className="flex flex-wrap gap-1">
        {KIND_FILTERS.map(f => {
          const isActive = kindFilter === f.key
          return (
            <button
              key={f.key || 'all'}
              onClick={() => setKindFilter(f.key)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors
                ${isActive
                  ? 'bg-[#1f3a5f] text-white'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}
              `}
            >
              {f.label}
            </button>
          )
        })}
        <div className="flex-1" />
        <span className="text-[11px] text-neutral-500 self-center">
          {loading ? 'loading…' : `${visible.length} shown · ${total.toLocaleString()} on record`}
        </span>
      </div>

      {/* Feed */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {loading && (
          <div className="grid place-items-center py-12 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="text-sm text-neutral-500 text-center py-12">
            {q ? `No entries match "${q}".` : 'No activity yet.'}
          </div>
        )}
        {!loading && visible.length > 0 && (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visible.map(e => <Row key={e.id} entry={e} />)}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({ entry }) {
  const [expanded, setExpanded] = useState(false)
  const meta = KIND_META[entry.kind] || KIND_META.system
  const Icon = meta.icon
  const hasMeta = entry.metadata && Object.keys(entry.metadata).length > 0

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 p-1.5 rounded-md ${meta.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{entry.action}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          {entry.detail && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">{entry.detail}</div>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-neutral-500">
            <span>{relativeTime(entry.timestamp)}</span>
            <span className="text-neutral-300">·</span>
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
            {hasMeta && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="ml-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 inline-flex items-center gap-0.5"
              >
                {expanded ? <>hide{' '}<ChevronUp className="w-3 h-3" /></> : <>details{' '}<ChevronDown className="w-3 h-3" /></>}
              </button>
            )}
          </div>
          {expanded && hasMeta && (
            <div className="mt-2 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 space-y-0.5">
              {Object.entries(entry.metadata).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[11px] font-mono">
                  <span className="text-neutral-500 shrink-0">{k}:</span>
                  <span className="text-neutral-700 dark:text-neutral-300 break-all">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
