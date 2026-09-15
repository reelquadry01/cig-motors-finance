import { useSettings } from '../contexts/SettingsContext'
import cigLogo from '../assets/cig-gac-logo.png'
import { BarChart3, FileSpreadsheet, FileText, Calculator, MessageSquare, TrendingUp } from 'lucide-react'

const FEATURES = [
  { icon: BarChart3, title: 'GL Import & Clean', desc: 'Upload raw GL data. Auto-clean duplicates, fix dates, normalize accounts.' },
  { icon: FileSpreadsheet, title: 'Auto P&L / B.S / Cash Flow', desc: 'Statements built from your mapping — IAS 7 cash flow, double-entry balanced.' },
  { icon: Calculator, title: 'Ratio Analysis', desc: '30+ ratios computed live — margins, liquidity, leverage, efficiency, returns.' },
  { icon: TrendingUp, title: 'Budget vs Actual', desc: 'Upload a budget template. Variance analysis with MoM and YTD tracking.' },
  { icon: MessageSquare, title: 'Auto Commentary', desc: 'CFO-style narrative generated from your numbers. Materiality thresholds, trend flags.' },
  { icon: FileText, title: 'Excel & PDF Export', desc: 'Big-4 quality packs. Live Excel formulas, print-ready PDF with your branding.' },
]

export default function Landing() {
  const { settings } = useSettings()

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Nav */}
      <nav className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={settings.logo_url || cigLogo} alt={settings.company_name} className="h-8 w-auto" />
            <span className="text-sm font-bold text-[var(--brand-navy)] dark:text-white">{settings.company_short_name || settings.company_name}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[var(--brand)] transition-colors">Dashboard</a>
            <a href="/admin" className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[var(--brand)] transition-colors">Admin</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--brand-navy)] dark:text-white leading-tight">
          Financial intelligence,<br />automated.
        </h1>
        <p className="mt-5 text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
          Upload your GL data. Get a complete management reporting pack — P&L, balance sheet, cash flow, ratios, commentary — in minutes, not days.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:opacity-90 text-white font-semibold px-6 py-3 text-sm transition-opacity">
            View Dashboard
          </a>
          <a href="/admin" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold px-6 py-3 text-sm transition-colors">
            Sign In to Admin
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-extrabold text-center text-[var(--brand-navy)] dark:text-white">
            What you get
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">
            From raw GL to boardroom-ready reports.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
                <div className="w-10 h-10 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] grid place-items-center mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{f.title}</h3>
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-extrabold text-center text-[var(--brand-navy)] dark:text-white">
            See it in action
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 text-center">
            A clean, distraction-free interface built for finance teams.
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Executive Dashboard', desc: 'KPIs at a glance — revenue, margins, cash position.' },
              { label: 'Financial Statements', desc: 'P&L, balance sheet, cash flow with expandable details.' },
              { label: 'Ratio Analysis', desc: '30+ ratios with trend indicators and benchmarks.' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="aspect-[16/10] bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">Screenshot {i + 1}</span>
                </div>
                <div className="p-4">
                  <div className="text-sm font-bold text-neutral-900 dark:text-white">{s.label}</div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <img src={settings.logo_url || cigLogo} alt="" className="h-5 w-auto opacity-60" />
            <span>{settings.company_name || 'Company'} · {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="hover:text-[var(--brand)] transition-colors">Dashboard</a>
            <a href="/admin" className="hover:text-[var(--brand)] transition-colors">Admin</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
