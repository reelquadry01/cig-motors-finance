import { useMemo } from 'react'
import { X, AlertTriangle } from 'lucide-react'

const labelOf = t => ({
  gl: 'GL data', mapping: 'Statement mapping', budget: 'Budget',
  account_summary: 'Account summary', prior_period: 'Prior period',
}[t] || t)

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

export default function DiffModal({ payload, onClose, onConfirm }) {
  const { fileType, diff } = payload
  const cellHeaders = useMemo(() => {
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
                    <td className="py-1.5 pr-2"><ChangeBadge kind={p.change} /></td>
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
