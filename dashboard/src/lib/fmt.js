const fmt = {
  n: (v) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toLocaleString(),
  n0: (v) => v === null || v === undefined || isNaN(v) ? '—' : Math.round(v).toLocaleString(),
  ng0: (v) => v === null || v === undefined || isNaN(v) ? '—' : '₦' + Math.round(v).toLocaleString(),
  n1: (v) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  n2: (v) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct: (v, d = 1) => v === null || v === undefined || isNaN(v) ? '—' : Number(v).toFixed(d) + '%',
  ng: (v) => v === null || v === undefined || isNaN(v) ? '—' : '₦' + Math.round(v).toLocaleString(),
  ngB: (v) => v === null || v === undefined || isNaN(v) ? '—' : '₦' + (v / 1e9).toFixed(2) + 'B',
  ngM: (v) => v === null || v === undefined || isNaN(v) ? '—' : '₦' + (v / 1e6).toFixed(0) + 'M',
  arrow: (v) => v > 0 ? '▲' : v < 0 ? '▼' : '—',
  sign: (v) => v > 0 ? '+' : '',
}
export default fmt
