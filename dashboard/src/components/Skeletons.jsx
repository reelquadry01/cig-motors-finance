// Skeleton placeholders shown while the dashboard fetches its JSON payload.
// Each skeleton mirrors the shape of the real component so the layout doesn't
// jump when data lands. The .skeleton class + @keyframes shimmer already live
// in index.css; these components just supply the boxes.

// One block — a rounded, shimmering rectangle sized by the caller.
const Block = ({ h = 16, w, r = 6, style }) => (
  <div
    className="skeleton"
    style={{ height: h, width: w, borderRadius: r, ...(style || {}) }}
  />
)

/* Header row: subtitle + big title, right-aligned mode switch */
export function HeaderSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Block h={52} w={180} r={4} />
        <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 18 }}>
          <Block h={10} w={200} style={{ marginBottom: 8 }} />
          <Block h={26} w={280} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[...Array(5)].map((_, i) => <Block key={i} h={30} w={60} />)}
      </div>
    </div>
  )
}

/* KPI cards row — matches the KpiCards layout (4 wide on desktop) */
export function KpiRowSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ padding: 18, background: 'var(--card-bg)', border: '1px solid var(--rule)', borderRadius: 8 }}>
          <Block h={11} w={90} style={{ marginBottom: 12 }} />
          <Block h={30} w={140} style={{ marginBottom: 10 }} />
          <Block h={12} w={110} style={{ marginBottom: 14 }} />
          <Block h={40} w="100%" />
        </div>
      ))}
    </div>
  )
}

/* Watch-list block (6 items in a 3-column grid) */
export function WatchListSkeleton() {
  return (
    <div style={{ padding: 20, background: 'var(--card-bg)', border: '1px solid var(--rule)', borderRadius: 8 }}>
      <Block h={11} w={110} style={{ marginBottom: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Block h={14} w="70%" style={{ marginBottom: 8 }} />
            <Block h={11} w="100%" style={{ marginBottom: 4 }} />
            <Block h={11} w="85%" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* Chart panel — title + big rectangle */
export function ChartSkeleton({ height = 320 }) {
  return (
    <div style={{ padding: 20, background: 'var(--card-bg)', border: '1px solid var(--rule)', borderRadius: 8 }}>
      <Block h={12} w={200} style={{ marginBottom: 16 }} />
      <Block h={height} w="100%" r={4} />
    </div>
  )
}

/* Simple table block — header row + data rows */
export function TableSkeleton({ rows = 8, cols = 4 }) {
  return (
    <div style={{ padding: 16, background: 'var(--card-bg)', border: '1px solid var(--rule)', borderRadius: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `2fr ${'1fr '.repeat(cols - 1)}`, gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--rule)' }}>
        {[...Array(cols)].map((_, i) => <Block key={i} h={10} w="60%" />)}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `2fr ${'1fr '.repeat(cols - 1)}`, gap: 12, padding: '10px 0', borderBottom: r < rows - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
          {[...Array(cols)].map((_, c) => (
            <Block key={c} h={12} w={c === 0 ? '80%' : '55%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* Full dashboard shell — header + KPI row + watch list + two side-by-side charts */
export default function DashboardSkeleton() {
  return (
    <div className="app-shell fade-in" style={{ opacity: 0.9, animation: 'skeleton-fade-in 0.2s ease-out' }}>
      <HeaderSkeleton />
      <div style={{ height: 20 }} />
      <div style={{ display: 'flex', gap: 6, padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
        {[...Array(9)].map((_, i) => <Block key={i} h={20} w={80} />)}
      </div>
      <div style={{ height: 20 }} />
      <KpiRowSkeleton />
      <div style={{ height: 20 }} />
      <WatchListSkeleton />
      <div style={{ height: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <ChartSkeleton height={280} />
        <ChartSkeleton height={280} />
      </div>
    </div>
  )
}
