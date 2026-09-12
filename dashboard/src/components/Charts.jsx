import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Legend,
  ComposedChart, Line, LineChart,
} from 'recharts'

/* Mid-tone palette tuned to read on BOTH light and dark grounds.
   Recharts writes colors as SVG attributes, which don't resolve CSS vars,
   so chart series must use concrete values. */
export const CHART = {
  brand: '#d81a37',
  accent: '#1394bd',
  green: '#2f9e6f',
  red: '#d94b6a',
  amber: '#c79a2e',
  magenta: '#d6006c',
  grey: '#9b9797',
}
const COLORS = [CHART.brand, CHART.accent, CHART.green, CHART.amber, CHART.magenta, CHART.grey]
const GRID = 'rgba(128,128,128,0.18)'
const AXIS = 'rgba(128,128,128,0.28)'
const TICK = '#9b9797'

const fmtAxis = v => Math.abs(v) >= 1e9 ? (v / 1e9).toFixed(0) + 'B' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(0) + 'M' : v

const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--border-strong)',
      borderRadius: 4, padding: '10px 14px', fontSize: 12,
      fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
      boxShadow: 'var(--shadow-pop)',
    }}>
      {label && <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '2px 0' }}>
          <span style={{ color: p.color || 'var(--text-secondary)' }}>{p.name}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {typeof p.value === 'number' ? Math.round(p.value).toLocaleString() + suffix : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
      {items.map(l => (
        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--text-secondary)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color }} />
          {l.label}
        </div>
      ))}
    </div>
  )
}

export function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) return null
  const chartData = data.map(d => ({
    name: d.period, Revenue: d.revenue, 'Gross Profit': d.gross_profit, 'Net Income': d.operating_profit,
  }))
  return (
    <div className="chart-card">
      <div className="chart-title">Revenue, gross profit &amp; net income by month</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={{ stroke: AXIS }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
          <Bar dataKey="Revenue" fill={CHART.brand} radius={[2, 2, 0, 0]} barSize={26} />
          <Bar dataKey="Gross Profit" fill={CHART.accent} radius={[2, 2, 0, 0]} barSize={26} />
          <Line type="monotone" dataKey="Net Income" stroke={CHART.green} strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend items={[
        { label: 'Revenue', color: CHART.brand },
        { label: 'Gross Profit', color: CHART.accent },
        { label: 'Net Income', color: CHART.green },
      ]} />
    </div>
  )
}

export function MarginTrendChart({ data }) {
  if (!data || data.length === 0) return null
  const chartData = data.map(d => ({
    name: d.period,
    'Gross %': d.revenue ? Math.round(d.gross_profit / d.revenue * 1000) / 10 : 0,
    'Operating %': d.revenue ? Math.round(d.operating_profit / d.revenue * 1000) / 10 : 0,
  }))
  return (
    <div className="chart-card">
      <div className="chart-title">Margin trend</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -14, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={{ stroke: AXIS }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
          <Tooltip content={<CustomTooltip suffix="%" />} cursor={{ stroke: AXIS }} />
          <Line type="monotone" dataKey="Gross %" stroke={CHART.accent} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Operating %" stroke={CHART.brand} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend items={[
        { label: 'Gross margin', color: CHART.accent },
        { label: 'Operating margin', color: CHART.brand },
      ]} />
    </div>
  )
}

export function CostStructureChart({ data }) {
  if (!data || data.length === 0) return null
  const chartData = data.map(d => ({
    name: d.period,
    'Cost of sales': d.cogs,
    'Operating expenses': d.operating_expenses,
    'Operating profit': d.operating_profit,
  }))
  return (
    <div className="chart-card">
      <div className="chart-title">Cost structure by month</div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={{ stroke: AXIS }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10.5, fill: TICK }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
          <Bar dataKey="Cost of sales" stackId="a" fill={CHART.brand} barSize={24} />
          <Bar dataKey="Operating expenses" stackId="a" fill={CHART.amber} barSize={24} />
          <Bar dataKey="Operating profit" stackId="a" fill={CHART.green} radius={[2, 2, 0, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend items={[
        { label: 'Cost of sales', color: CHART.brand },
        { label: 'Operating expenses', color: CHART.amber },
        { label: 'Operating profit', color: CHART.green },
      ]} />
    </div>
  )
}

export function RevenueDonut({ data, total }) {
  const [activeIdx, setActiveIdx] = useState(null)
  if (!data || data.length === 0) return null
  const chartData = data.filter(d => d.value > 0)
  const totalVal = chartData.reduce((s, d) => s + d.value, 0)
  return (
    <div className="chart-card">
      <div className="chart-title">Revenue composition</div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2}
              dataKey="value" stroke="none" startAngle={90} endAngle={-270}
              onMouseEnter={(_, i) => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]}
                  fillOpacity={activeIdx === null || activeIdx === i ? 0.95 : 0.35}
                  style={{ transition: 'fill-opacity 0.2s', cursor: 'pointer' }} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div className="label-caps" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Total</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600 }}>
            {total ? '₦' + (total / 1e9).toFixed(1) + 'B' : '—'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', marginTop: 12 }}>
        {chartData.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: activeIdx === i ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.2s' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], opacity: activeIdx === null || activeIdx === i ? 1 : 0.35, transition: 'opacity 0.2s' }} />
            {d.name}
            <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {totalVal > 0 ? ((d.value / totalVal) * 100).toFixed(0) + '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarginGauge({ label, value, color = CHART.brand, max = 100 }) {
  const pct = Math.min(Math.abs(value || 0) / max * 100, 100)
  const isNeg = value < 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isNeg ? 'var(--unfav)' : 'var(--text-primary)' }}>
          {value !== null && value !== undefined ? value.toFixed(1) + '%' : '—'}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--hover-bg)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: isNeg ? 'var(--unfav)' : color, borderRadius: 3, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  )
}

let sparkId = 0
export function Sparkline({ data, color = CHART.brand, height = 32 }) {
  if (!data || data.length < 2) return null
  const gid = `spark-${sparkId++}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gid})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
