import { useState, useEffect, Component } from 'react'
import Header from './components/Header'
import TabNav from './components/TabNav'
import Dashboard from './components/Dashboard'
import PLView from './components/PLView'
import BSView from './components/BSView'
import CFView from './components/CFView'
import RatiosView from './components/RatiosView'
import SegmentsView from './components/SegmentsView'
import CommentaryView from './components/CommentaryView'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#f87171', background: 'rgba(248,113,113,0.05)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Component error:</div>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: '#fca5a5' }}>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, padding: '6px 14px', background: '#c8102e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [rawData, setRawData] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [periodFilter, setPeriodFilter] = useState({ mode: 'latest' })

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/dashboard_data.json`)
      .then(r => { if (!r.ok) throw new Error('Data not found'); return r.json() })
      .then(d => { setRawData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const data = rawData ? applyPeriodFilter(rawData, periodFilter) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0f12', color: '#6b655e', fontSize: 14 }}>
      Loading dashboard...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0f12', color: '#f87171', fontSize: 14 }}>
      {error}
    </div>
  )

  const viewMap = {
    dashboard: Dashboard,
    pnl: PLView,
    bs: BSView,
    cashflow: CFView,
    ratios: RatiosView,
    segments: SegmentsView,
    commentary: CommentaryView,
  }
  const ViewComponent = viewMap[activeTab]

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '32px 40px' }}>
      <Header data={data} periodFilter={periodFilter} onPeriodChange={setPeriodFilter} />
      <TabNav active={activeTab} onChange={setActiveTab} />
      <div style={{ marginTop: 24 }}>
        <ErrorBoundary key={activeTab}>
          <ViewComponent data={data} />
        </ErrorBoundary>
      </div>
    </div>
  )
}

function applyPeriodFilter(raw, filter) {
  if (!filter || filter.mode === 'latest') return raw
  const plByPeriod = raw.pl_by_period || {}
  const months = raw.available_periods?.months || []
  let targetPeriod = null, periodLabel = raw.period
  if (filter.mode === 'monthly' && filter.period) {
    targetPeriod = filter.period
    periodLabel = fmtMonth(filter.period)
  } else if (filter.mode === 'yearly' && filter.period) {
    const ym = months.filter(m => m.startsWith(filter.period))
    if (ym.length > 0) return { ...raw, pl: mergePeriods(ym, plByPeriod), period: filter.period }
    return raw
  } else if (filter.mode === 'range' && filter.periodFrom && filter.periodTo) {
    const rm = months.filter(m => m >= filter.periodFrom && m <= filter.periodTo)
    if (rm.length > 0) return { ...raw, pl: mergePeriods(rm, plByPeriod), period: `${fmtMonth(filter.periodFrom)} – ${fmtMonth(filter.periodTo)}` }
    return raw
  }
  if (targetPeriod && plByPeriod[targetPeriod]) return { ...raw, pl: plByPeriod[targetPeriod], period: periodLabel }
  return raw
}

function mergePeriods(periods, plByPeriod) {
  const keys = ['total_revenue','total_cogs','gross_profit','total_opex','total_depreciation','operating_profit','total_other_income','total_finance_costs','pbt','total_tax','pat']
  const itemKeys = ['revenue','cogs','opex','depreciation','other_income','finance_costs','tax']
  const m = { ...plByPeriod[periods[0]] }
  for (const k of keys) m[k] = periods.reduce((s, p) => s + (plByPeriod[p]?.[k] || 0), 0)
  for (const k of itemKeys) {
    const all = periods.flatMap(p => plByPeriod[p]?.[k] || [])
    const g = {}
    for (const i of all) { if (!g[i.label]) g[i.label] = { label: i.label, value: 0 }; g[i.label].value += i.value }
    m[k] = Object.values(g).map(i => ({ ...i, value: Math.round(i.value) }))
  }
  m.gp_margin = m.total_revenue ? Math.round(m.gross_profit / m.total_revenue * 1000) / 10 : 0
  m.op_margin = m.total_revenue ? Math.round(m.operating_profit / m.total_revenue * 1000) / 10 : 0
  m.pbt_margin = m.total_revenue ? Math.round(m.pbt / m.total_revenue * 1000) / 10 : 0
  m.pat_margin = m.total_revenue ? Math.round(m.pat / m.total_revenue * 1000) / 10 : 0
  return m
}

function fmtMonth(key) {
  if (!key) return ''
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [y, mo] = key.split('-')
  return `${m[parseInt(mo, 10) - 1]} ${y}`
}
