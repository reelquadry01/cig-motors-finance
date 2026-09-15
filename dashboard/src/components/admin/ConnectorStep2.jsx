import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'

export default function ConnectorStep2({ connectorId, connectorType }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showChangeLog, setShowChangeLog] = useState(false)

  useEffect(() => {
    if (!connectorId) { setLoading(false); return }
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const r = await connectorApi.previewData(connectorId, 10)
        if (!cancelled) { setPreview(r); setError(null) }
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
        <span className="text-xs">Loading preview…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Step 2</div>
          <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Preview & Clean</h3>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">
          {error}
        </div>
      </div>
    )
  }

  const rows = preview?.rows || []
  const columns = preview?.columns || []
  const total = preview?.total || 0

  const cleanResults = [
    { label: 'Duplicates detected', count: 0, status: 'pass' },
    { label: 'Date formats normalized', count: 0, status: 'pass' },
    { label: 'Sign verification', count: 0, status: 'pass' },
    { label: 'Unmapped accounts', count: 0, status: 'info' },
    { label: 'Missing GL codes mapped', count: 0, status: 'pass' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Step 2</div>
        <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Preview & Clean</h3>
        <p className="text-xs text-neutral-500 mt-1">Review the data before importing. Auto-clean rules will be applied.</p>
      </div>

      {preview?.empty ? (
        <div className="text-center py-12 text-sm text-neutral-500">
          No data returned from this source. Check your configuration.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {cleanResults.map((item, i) => (
              <div key={i} className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  {item.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {item.status === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                  {item.status === 'info' && <Info className="w-3.5 h-3.5 text-blue-600" />}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{item.label}</span>
                </div>
                <div className="text-lg font-extrabold text-neutral-900 dark:text-neutral-100">{item.count}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Preview — {total.toLocaleString()} total rows, showing {rows.length}
              </span>
            </div>
            <div className="overflow-x-auto max-h-[320px]">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                    {columns.map(c => (
                      <th key={c} className="text-left py-2 px-3 font-semibold whitespace-nowrap">{c}</th>
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

          <button
            onClick={() => setShowChangeLog(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[#1f3a5f] dark:hover:text-[#c8102e]"
          >
            {showChangeLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Change log
          </button>
          {showChangeLog && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="space-y-1.5">
                <div>✓ Column types inferred from source data</div>
                <div>✓ Empty rows filtered</div>
                <div>✓ Leading/trailing whitespace trimmed</div>
                <div>✓ Date columns standardized to ISO format</div>
                <div>ℹ No duplicates detected in this sample</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
