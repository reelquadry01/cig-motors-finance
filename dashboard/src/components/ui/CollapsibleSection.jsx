import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export default function CollapsibleSection({ title, items, total, margin, defaultOpen = false, bold = false }) {
  const [open, setOpen] = useState(defaultOpen)

  if (!items || items.length === 0) {
    return (
      <tr className="border-t border-white/10">
        <td colSpan={4} className={`py-2.5 ${bold ? 'font-semibold text-white' : 'text-label-sm uppercase tracking-[0.06em] text-soft'}`}>
          {title}
        </td>
        <td className={`py-2.5 text-right tabular-nums ${bold ? 'font-semibold text-white' : 'text-soft'}`}>
          {total !== undefined ? fmtNum(total) : '—'}
          {margin !== undefined && <span className="text-xs text-soft ml-2">{fmtPct(margin)}</span>}
        </td>
      </tr>
    )
  }

  return (
    <>
      <tr
        className="border-t border-white/10 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
        onClick={() => setOpen(!open)}
      >
        <td colSpan={4} className={`py-2.5 flex items-center gap-1.5 ${bold ? 'font-semibold text-white' : 'text-label-sm uppercase tracking-[0.06em] text-soft'}`}>
          <span className="text-soft w-4">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {title}
          <span className="text-[11px] text-subtle ml-1">({items.length})</span>
        </td>
        <td className={`py-2.5 text-right tabular-nums ${bold ? 'font-semibold text-white' : 'text-soft'}`}>
          {fmtNum(total)}
          {margin !== undefined && <span className="text-xs text-soft ml-2">{fmtPct(margin)}</span>}
        </td>
      </tr>
      {open && items.map((item, i) => (
        <tr key={i} className="table-row">
          <td className="py-1.5 pr-8 pl-7">{item.label}</td>
          <td className="py-1.5 text-right tabular-nums">{fmtNum(item.value)}</td>
          <td className="py-1.5 text-right tabular-nums text-soft">—</td>
          <td className="py-1.5 text-right tabular-nums">—</td>
          <td className="py-1.5 text-right tabular-nums">
            <span className="text-[11px] text-subtle">
              {fmtPct(item.value / total * 100)}
            </span>
          </td>
        </tr>
      ))}
    </>
  )
}

function fmtNum(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return Math.round(v).toLocaleString()
}

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return Number(v).toFixed(1) + '%'
}
