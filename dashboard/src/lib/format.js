export function fmtM(n) {
  if (n == null || isNaN(n)) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`
  return `${sign}${abs.toFixed(0)}`
}

export function fmtFull(n) {
  if (n == null || isNaN(n)) return '-'
  return n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '-'
  return `${n.toFixed(1)}%`
}

export function fmtRatio(n) {
  if (n == null || isNaN(n)) return '-'
  return `${n.toFixed(2)}x`
}

export function fmtSigned(n) {
  if (n == null || isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (n > 0) return `+${fmtFull(abs)}`
  if (n < 0) return `(${fmtFull(abs)})`
  return fmtFull(0)
}

export function fmtMoney(n) {
  if (n == null || isNaN(n)) return '-'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e9) return `${sign}₦${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${sign}₦${(abs / 1e6).toFixed(0)}M`
  return `${sign}₦${fmtFull(abs)}`
}
