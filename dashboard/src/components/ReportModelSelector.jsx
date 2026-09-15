import { useState, useEffect } from 'react'
import { FileSpreadsheet, BarChart3, TrendingUp, Calculator, Shield, DollarSign, Activity, PieChart } from 'lucide-react'

const MODEL_ICONS = {
  three_statement: FileSpreadsheet,
  variance: BarChart3,
  forecast: TrendingUp,
  management: PieChart,
  cash_liquidity: DollarSign,
  audit: Shield,
  ratios: Calculator,
  valuation: Activity,
}

export default function ReportModelSelector({ industry, selected, onChange }) {
  const [models, setModels] = useState([])

  useEffect(() => {
    const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''
    fetch(`${API_BASE}/api/models?industry=${industry || ''}`)
      .then(r => r.json())
      .then(setModels)
      .catch(() => setModels([]))
  }, [industry])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {models.map(m => {
        const Icon = MODEL_ICONS[m.id] || FileSpreadsheet
        const isActive = selected === m.id
        return (
          <button key={m.id} onClick={() => onChange(m.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              isActive
                ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-sm'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
            }`}>
            <Icon className={`w-5 h-5 mb-2 ${isActive ? 'text-[var(--brand)]' : 'text-neutral-400'}`} />
            <div className="text-sm font-bold text-neutral-900 dark:text-white">{m.name}</div>
            <div className="text-[10.5px] text-neutral-500 mt-1 leading-relaxed">{m.description}</div>
          </button>
        )
      })}
    </div>
  )
}
