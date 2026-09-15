import { useState, useEffect } from 'react'
import {
  CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp,
  Download, BarChart3, Loader2, ArrowRight,
} from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'

const CHECK_ICONS = {
  pass: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  warn: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
  fail: { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800' },
}

export default function SyncSummary({ connectorId, onClose }) {
  const [checks, setChecks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedCheck, setExpandedCheck] = useState(null)

  useEffect(() => {
    if (!connectorId) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const r = await connectorApi.validateData(connectorId)
        if (!cancelled) { setChecks(r.checks || []); setError(null) }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [connectorId])

  if (loading) {
    return (
      <div className="grid place-items-center py-12 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span className="text-xs">Running validation checks…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>
    )
  }

  const passed = (checks || []).filter(c => c.ok).length
  const failed = (checks || []).filter(c => !c.ok).length
  const total = (checks || []).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Sync Complete</div>
          <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Results & Validation</h3>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 text-center">
          <div className="text-2xl font-extrabold text-neutral-900 dark:text-white">{total}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Total Checks</div>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-center">
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{passed}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Passed</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 text-center ${failed > 0 ? 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'}`}>
          <div className={`text-2xl font-extrabold ${failed > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>{failed}</div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider ${failed > 0 ? 'text-rose-600' : 'text-neutral-500'}`}>Failed</div>
        </div>
      </div>

      <div className="space-y-2">
        {(checks || []).map((check, i) => {
          const severity = !check.ok ? 'fail' : check.warning ? 'warn' : 'pass'
          const style = CHECK_ICONS[severity]
          const Icon = style.icon
          const isExpanded = expandedCheck === i

          return (
            <div key={i} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
              <button
                onClick={() => setExpandedCheck(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <Icon className={`w-5 h-5 ${style.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{check.name}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{check.message}</div>
                </div>
                {check.details && (
                  isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                )}
              </button>
              {isExpanded && check.details && (
                <div className="px-4 pb-3 border-t border-current/10">
                  <pre className="mt-2 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{typeof check.details === 'string' ? check.details : JSON.stringify(check.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <a href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] text-white font-semibold px-4 py-2 text-xs transition-colors">
          <BarChart3 className="w-3.5 h-3.5" /> View Dashboard
        </a>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-4 py-2 text-xs transition-colors">
          <Download className="w-3.5 h-3.5" /> Download Report
        </button>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
