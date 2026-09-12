export const fmt = {
  n: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return Number(v).toLocaleString()
  },
  n0: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return Math.round(v).toLocaleString()
  },
  n1: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  },
  n2: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  pct: (v, d = 1) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    return Number(v).toFixed(d) + '%'
  },
  ng: (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—'
    const n = Math.round(v)
    return '₦' + n.toLocaleString()
  },
  badge: (v) => v >= 0 ? '▲' : '▼',
}
