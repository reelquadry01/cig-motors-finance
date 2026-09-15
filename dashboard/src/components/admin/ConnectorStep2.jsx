import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Info, Download, Table } from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'

export default function ConnectorStep2({ connectorId, connectorType, onLoad }) {
  const [preview, setPreview] = useState(null)
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!connectorId) { setLoading(false); return }
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [pv, vl] = await Promise.allSettled([
          connectorApi.previewData(connectorId, 10),
          connectorApi.validateData(connectorId),
        ])
        if (!cancelled) {
          if (pv.status === 'fulfilled') setPreview(pv.value)
          if (vl.status === 'fulfilled') setValidation(vl.value)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [connectorId])

  const handleLoad = async () => {
    setLoadingData(true)
    try {
      await onLoad()
    } finally {
      setLoadingData(false)
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-16 text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin mb-3" />
        <span className="text-sm">Fetching preview…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">
          {error}
        </div>
        <button
          onClick={onLoad}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8102e] hover:bg-[#a90d26] text-white font-bold py-3 text-sm transition-colors"
        >
          Continue Without Preview
        </button>
      </div>
    )
  }

  const rows = preview?.rows || []
  const columns = preview?.columns || []
  const total = preview?.total || 0

  const checks = validation?.checks || []

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#1f3a5f] dark:text-[#c8102e]" />
          <span className="font-semibold text-neutral-900 dark:text-white">{total.toLocaleString()}</span>
          <span className="text-neutral-500">total rows</span>
        </div>
        {checks.length > 0 && (
          <div className="flex items-center gap-1.5">
            {checks.every(c => c.status === 'pass') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : checks.some(c => c.status === 'fail') ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <Info className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs text-neutral-500">
              {checks.filter(c => c.status === 'pass').length}/{checks.length} checks passed
            </span>
          </div>
        )}
      </div>

      {/* Validation checks */}
      {checks.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {checks.slice(0, 5).map((check, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                {check.status === 'pass' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {check.status === 'warn' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                {check.status === 'fail' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                {check.status === 'info' && <Info className="w-3 h-3 text-blue-600" />}
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-neutral-500 truncate">
                  {check.label}
                </span>
              </div>
              <div className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{check.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Preview table */}
      {preview?.empty ? (
        <div className="text-center py-12 text-sm text-neutral-500">
          No data returned from this source.
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto max-h-[340px]">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                  {columns.map(c => (
                    <th key={c} className="text-left py-2.5 px-3 font-semibold whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                    {row.map((cell, j) => (
                      <td key={j} className="py-2 px-3 font-mono text-neutral-800 dark:text-neutral-200 whitespace-nowrap max-w-[200px] truncate">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Load button */}
      <button
        onClick={handleLoad}
        disabled={loadingData}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8102e] hover:bg-[#a90d26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 text-sm transition-colors shadow-sm"
      >
        {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loadingData ? 'Loading…' : 'Load Data'}
      </button>
    </div>
  )
}
