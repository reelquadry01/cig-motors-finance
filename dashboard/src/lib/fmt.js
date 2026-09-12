const isNil = v => v === null || v === undefined || isNaN(v)

const fmt = {
  n: (v) => isNil(v) ? '—' : Number(v).toLocaleString(),
  n0: (v) => isNil(v) ? '—' : Math.round(v).toLocaleString(),
  n1: (v) => isNil(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  n2: (v) => isNil(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct: (v, d = 1) => isNil(v) ? '—' : Number(v).toFixed(d) + '%',

  // Bare numbers (no currency symbol) — currency is stated once per page/section
  num0: (v) => isNil(v) ? '—' : Math.round(v).toLocaleString(),
  // Accounting format: negatives in parentheses, no currency symbol
  acc0: (v) => isNil(v) ? '—' : v < 0
    ? '(' + Math.round(Math.abs(v)).toLocaleString() + ')'
    : Math.round(v).toLocaleString(),
  numM: (v) => isNil(v) ? '—' : (v / 1e6).toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'M',
  numB: (v) => isNil(v) ? '—' : (v / 1e9).toFixed(2) + 'B',

  // Readable currency for prose/commentary: ₦7.02bn / ₦701m / ₦12k / ₦1,234
  money: (v) => {
    if (isNil(v)) return '—'
    const a = Math.abs(v), s = v < 0 ? '−' : ''
    if (a >= 1e9) return `${s}₦${(a / 1e9).toFixed(2)}bn`
    if (a >= 1e6) return `${s}₦${(a / 1e6).toFixed(1)}m`
    if (a >= 1e3) return `${s}₦${(a / 1e3).toFixed(0)}k`
    return `${s}₦${Math.round(a).toLocaleString()}`
  },

  // Currency-prefixed (use sparingly — headline figures only)
  ng0: (v) => isNil(v) ? '—' : '₦' + Math.round(v).toLocaleString(),
  ng: (v) => isNil(v) ? '—' : '₦' + Math.round(v).toLocaleString(),
  ngB: (v) => isNil(v) ? '—' : '₦' + (v / 1e9).toFixed(2) + 'B',
  ngM: (v) => isNil(v) ? '—' : '₦' + (v / 1e6).toFixed(0) + 'M',

  arrow: (v) => v > 0 ? '▲' : v < 0 ? '▼' : '—',
  sign: (v) => v > 0 ? '+' : '',
  neg: (v) => !isNil(v) && v < 0,
}
export default fmt
