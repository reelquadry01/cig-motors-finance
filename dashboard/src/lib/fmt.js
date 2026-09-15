const isNil = v => v === null || v === undefined || isNaN(v)

// Configurable currency — defaults to ₦, can be changed via setCurrency()
let _curr = '\u20a6'
export function setCurrencySymbol(sym) { if (sym) _curr = sym }
export function getCurrencySymbol() { return _curr }

const fmt = {
  n: (v) => isNil(v) ? '—' : Number(v).toLocaleString(),
  n0: (v) => isNil(v) ? '—' : Math.round(v).toLocaleString(),
  n1: (v) => isNil(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  n2: (v) => isNil(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct: (v, d = 1) => isNil(v) ? '—' : Number(v).toFixed(d) + '%',

  // Bare numbers (no currency symbol)
  num0: (v) => isNil(v) ? '—' : Math.round(v).toLocaleString(),
  acc0: (v) => isNil(v) ? '—' : v < 0
    ? '(' + Math.round(Math.abs(v)).toLocaleString() + ')'
    : Math.round(v).toLocaleString(),
  mm: (v) => {
    if (isNil(v)) return '—'
    const m = v / 1e6
    const s = Math.abs(m).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    return m < 0 ? `(${s})` : s
  },
  th: (v) => {
    if (isNil(v)) return '—'
    const t = v / 1e3
    const s = Math.abs(t).toLocaleString(undefined, { maximumFractionDigits: 0 })
    return t < 0 ? `(${s})` : s
  },
  numM: (v) => isNil(v) ? '—' : (v / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'M',
  numB: (v) => isNil(v) ? '—' : (v / 1e9).toFixed(2) + 'B',

  // Readable currency for prose/commentary
  money: (v) => {
    if (isNil(v)) return '—'
    const a = Math.abs(v), s = v < 0 ? '\u2212' : ''
    if (a >= 1e9) return `${s}${_curr}${(a / 1e9).toFixed(2)}bn`
    if (a >= 1e6) return `${s}${_curr}${(a / 1e6).toFixed(1)}m`
    if (a >= 1e3) return `${s}${_curr}${(a / 1e3).toFixed(0)}k`
    return `${s}${_curr}${Math.round(a).toLocaleString()}`
  },

  // Currency-prefixed (headline figures)
  ng0: (v) => isNil(v) ? '—' : _curr + Math.round(v).toLocaleString(),
  ng: (v) => isNil(v) ? '—' : _curr + Math.round(v).toLocaleString(),
  ngB: (v) => isNil(v) ? '—' : _curr + (v / 1e9).toFixed(2) + 'B',
  ngM: (v) => isNil(v) ? '—' : _curr + (v / 1e6).toFixed(0) + 'M',

  arrow: (v) => v > 0 ? '\u25B2' : v < 0 ? '\u25BC' : '\u2014',
  sign: (v) => v > 0 ? '+' : '',
  neg: (v) => !isNil(v) && v < 0,
}
export default fmt
