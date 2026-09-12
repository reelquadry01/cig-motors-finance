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
import WorkingCapitalView from './components/WorkingCapitalView'
import BranchesView from './components/BranchesView'
import ExpensesView from './components/ExpensesView'
import BudgetView from './components/BudgetView'

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
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cig-theme') || 'light' } catch { return 'light' }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('cig-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/dashboard_data.json`)
      .then(r => { if (!r.ok) throw new Error('Data not found'); return r.json() })
      .then(d => { setRawData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const data = rawData ? applyPeriodFilter(rawData, periodFilter) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)', color: 'var(--text-muted)', fontSize: 14 }}>
      Loading dashboard...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-0)', color: 'var(--unfav)', fontSize: 14 }}>
      {error}
    </div>
  )

  const viewMap = {
    dashboard: Dashboard,
    pnl: PLView,
    bs: BSView,
    cashflow: CFView,
    workingcapital: WorkingCapitalView,
    ratios: RatiosView,
    segments: SegmentsView,
    branches: BranchesView,
    expenses: ExpensesView,
    budget: BudgetView,
    commentary: CommentaryView,
  }
  const ViewComponent = viewMap[activeTab]

  return (
    <div className="app-shell">
      <Header data={data} periodFilter={periodFilter} onPeriodChange={setPeriodFilter} theme={theme} onToggleTheme={toggleTheme} />
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
  if (!filter || filter.mode === 'latest') return { ...raw, _periodKey: raw.period }
  const plByPeriod = raw.pl_by_period || {}
  const plByDay = raw.pl_by_day || {}
  const months = raw.available_periods?.months || []
  const days = raw.available_periods?.days || []

  if (filter.mode === 'monthly' && filter.period) {
    if (plByPeriod[filter.period]) return { ...raw, pl: plByPeriod[filter.period], period: fmtMonth(filter.period), _periodKey: filter.period }
    return raw
  }
  if (filter.mode === 'daily' && filter.period) {
    if (plByDay[filter.period]) return { ...raw, pl: plByDay[filter.period], period: fmtDate(filter.period), _periodKey: null }
    return { ...raw, pl: emptyPl(raw.pl), period: fmtDate(filter.period), _periodKey: null }
  }
  if (filter.mode === 'yearly' && filter.period) {
    const ym = months.filter(m => m.startsWith(filter.period))
    if (ym.length > 0) return { ...raw, pl: mergePeriods(ym, plByPeriod), period: filter.period, _periodKey: null }
    return raw
  }
  if (filter.mode === 'range' && filter.periodFrom && filter.periodTo) {
    // Day-level range: merge every active day in [from, to]
    const rd = days.filter(d => d >= filter.periodFrom && d <= filter.periodTo)
    const label = `${fmtDate(filter.periodFrom)} – ${fmtDate(filter.periodTo)}`
    if (rd.length > 0) return { ...raw, pl: mergePeriods(rd, plByDay), period: label, _periodKey: null }
    return { ...raw, pl: emptyPl(raw.pl), period: label, _periodKey: null }
  }
  return raw
}

function emptyPl(template) {
  const zeroKeys = ['total_revenue','total_cogs','gross_profit','total_opex','total_depreciation','operating_profit','total_other_income','total_finance_costs','pbt','total_tax','pat','gp_margin','op_margin','pbt_margin','pat_margin']
  const m = { ...template }
  for (const k of zeroKeys) m[k] = 0
  for (const k of ['revenue','cogs','opex','depreciation','other_income','finance_costs','tax','revenue_breakdown','cogs_breakdown']) m[k] = []
  return m
}

function mergeBreakdown(groupLists) {
  // groupLists: array of breakdown arrays ([{group, value, items:[{label,value}]}])
  const groups = {}
  for (const list of groupLists) {
    for (const g of (list || [])) {
      if (!groups[g.group]) groups[g.group] = { group: g.group, value: 0, items: {} }
      groups[g.group].value += g.value || 0
      for (const it of (g.items || [])) {
        if (!groups[g.group].items[it.label]) groups[g.group].items[it.label] = { label: it.label, value: 0 }
        groups[g.group].items[it.label].value += it.value || 0
      }
    }
  }
  const total = Object.values(groups).reduce((s, g) => s + g.value, 0)
  return Object.values(groups)
    .map(g => ({
      group: g.group,
      value: Math.round(g.value),
      share: total ? Math.round(g.value / total * 1000) / 10 : 0,
      items: Object.values(g.items)
        .map(it => ({ label: it.label, value: Math.round(it.value), share: g.value ? Math.round(it.value / g.value * 1000) / 10 : 0 }))
        .sort((a, b) => b.value - a.value),
    }))
    .sort((a, b) => b.value - a.value)
}

function mergePeriods(periods, source) {
  const keys = ['total_revenue','total_cogs','gross_profit','total_opex','total_depreciation','operating_profit','total_other_income','total_finance_costs','pbt','total_tax','pat']
  const itemKeys = ['revenue','cogs','opex','depreciation','other_income','finance_costs','tax']
  const m = { ...source[periods[0]] }
  for (const k of keys) m[k] = periods.reduce((s, p) => s + (source[p]?.[k] || 0), 0)
  for (const k of itemKeys) {
    const all = periods.flatMap(p => source[p]?.[k] || [])
    const g = {}
    for (const i of all) { if (!g[i.label]) g[i.label] = { label: i.label, value: 0 }; g[i.label].value += i.value }
    m[k] = Object.values(g).map(i => ({ ...i, value: Math.round(i.value) }))
  }
  m.revenue_breakdown = mergeBreakdown(periods.map(p => source[p]?.revenue_breakdown))
  m.cogs_breakdown = mergeBreakdown(periods.map(p => source[p]?.cogs_breakdown))
  m.gp_margin = m.total_revenue ? Math.round(m.gross_profit / m.total_revenue * 1000) / 10 : 0
  m.op_margin = m.total_revenue ? Math.round(m.operating_profit / m.total_revenue * 1000) / 10 : 0
  m.pbt_margin = m.total_revenue ? Math.round(m.pbt / m.total_revenue * 1000) / 10 : 0
  m.pat_margin = m.total_revenue ? Math.round(m.pat / m.total_revenue * 1000) / 10 : 0
  return m
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(key) {
  if (!key) return ''
  const [y, mo] = key.split('-')
  return `${MONTHS_SHORT[parseInt(mo, 10) - 1]} ${y}`
}

function fmtDate(key) {
  if (!key) return ''
  const [y, mo, d] = key.split('-')
  if (!d) return fmtMonth(key)
  return `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(mo, 10) - 1]} ${y}`
}
