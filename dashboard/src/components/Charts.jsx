import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Sector, Legend,
  ComposedChart, Line,
} from 'recharts'

const COLORS = ['#c8102e', '#4fbde3', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#94a3b8']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(22,23,27,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)',
    }}>
      {label && <div style={{ color: '#9a958e', marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '2px 0' }}>
          <span style={{ color: p.color || '#9a958e' }}>{p.name}</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {typeof p.value === 'number' ? Math.round(p.value).toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) return null

  const chartData = data.map(d => ({
    name: d.period,
    Revenue: d.revenue,
    'Gross Profit': d.gross_profit,
    'Net Income': d.operating_profit,
  }))

  return (
    <div className="chart-card">
      <div className="chart-title">Monthly trend</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10.5, fill: '#6b655e' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: '#6b655e' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v >= 1e9 ? (v/1e9).toFixed(0)+'B' : v >= 1e6 ? (v/1e6).toFixed(0)+'M' : v}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Revenue" fill="#c8102e" radius={[3, 3, 0, 0]} fillOpacity={0.85} barSize={28} />
          <Bar dataKey="Gross Profit" fill="#4fbde3" radius={[3, 3, 0, 0]} fillOpacity={0.75} barSize={28} />
          <Line
            type="monotone"
            dataKey="Net Income"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
        {[
          { label: 'Revenue', color: '#c8102e' },
          { label: 'Gross Profit', color: '#4fbde3' },
          { label: 'Net Income', color: '#34d399' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9a958e' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, opacity: 0.85 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RevenueDonut({ data, total }) {
  if (!data || data.length === 0) return null

  const [activeIdx, setActiveIdx] = useState(null)

  const chartData = data.filter(d => d.value > 0)
  const totalVal = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="chart-card">
      <div className="chart-title">Revenue composition</div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={activeIdx === null || activeIdx === i ? 0.9 : 0.3}
                  style={{ transition: 'fill-opacity 0.2s', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 10, color: '#6b655e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {total ? '₦' + (total / 1e9).toFixed(1) + 'B' : '—'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center', marginTop: 12 }}>
        {chartData.map((d, i) => (
          <div key={d.name} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
            color: activeIdx === i ? '#f0eeeb' : '#9a958e',
            transition: 'color 0.2s',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: 2,
              background: COLORS[i % COLORS.length],
              opacity: activeIdx === null || activeIdx === i ? 1 : 0.3,
              transition: 'opacity 0.2s',
            }} />
            {d.name}
            <span style={{ color: '#6b655e', fontVariantNumeric: 'tabular-nums' }}>
              {totalVal > 0 ? ((d.value / totalVal) * 100).toFixed(0) + '%' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarginGauge({ label, value, color = '#c8102e', max = 100 }) {
  const pct = Math.min(Math.abs(value || 0) / max * 100, 100)
  const isNeg = value < 0

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#9a958e' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isNeg ? '#f87171' : '#f0eeeb' }}>
          {value !== null && value !== undefined ? value.toFixed(1) + '%' : '—'}
        </span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: pct + '%',
          background: isNeg ? '#f87171' : color,
          borderRadius: 2,
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isNeg ? '0 0 8px rgba(248,113,113,0.3)' : `0 0 8px ${color}33`,
        }} />
      </div>
    </div>
  )
}

export function Sparkline({ data, color = '#c8102e', height = 32 }) {
  if (!data || data.length < 2) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#','')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
