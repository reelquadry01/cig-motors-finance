import { useState } from 'react'
import { RefreshCw, LogOut } from 'lucide-react'
import { getToken, clearToken } from '../../lib/api'
import cigLogo from '../../assets/cig-gac-logo.png'
import PasswordGate from './PasswordGate'
import DataSourcesTab from './DataSourcesTab'
import FileImportsTab from './FileImportsTab'
import PipelineTab from './PipelineTab'

const TABS = [
  { key: 'sources', label: 'Data Sources' },
  { key: 'files', label: 'File Imports' },
  { key: 'pipeline', label: 'Pipeline' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [activeTab, setActiveTab] = useState('sources')
  const [refreshKey, setRefreshKey] = useState(0)

  if (!authed) {
    return <PasswordGate onAuthed={() => setAuthed(true)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7f2] via-white to-[#faf7f2] dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-neutral-950/85 backdrop-blur border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-4">
          <a href="/" className="flex items-center gap-3">
            <img src={cigLogo} alt="CIG Motors" className="h-9 w-auto" />
            <div className="border-l border-neutral-300 dark:border-neutral-700 pl-3">
              <div className="text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Admin console</div>
              <div className="text-sm font-extrabold text-[#1f3a5f] dark:text-white leading-tight">Finance Data Prep</div>
            </div>
          </a>
          <div className="flex-1" />
          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 p-0.5">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150
                  ${activeTab === t.key
                    ? 'bg-[#1f3a5f] dark:bg-[#c8102e] text-white shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[#1f3a5f] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'}
                `}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/"
            className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-[#1f3a5f] dark:hover:text-white flex items-center gap-1"
          >
            View dashboard
          </a>
          <button
            onClick={() => { clearToken(); setAuthed(false) }}
            className="text-xs font-medium text-neutral-600 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <div className="text-[10.5px] tracking-[0.16em] font-semibold uppercase text-neutral-500 mb-1">Data pipeline management</div>
          <h1 className="text-3xl font-extrabold text-[#1f3a5f] dark:text-white tracking-tight leading-tight">
            {TABS.find(t => t.key === activeTab)?.label}
          </h1>
        </div>

        <div key={refreshKey}>
          {activeTab === 'sources' && <DataSourcesTab />}
          {activeTab === 'files' && <FileImportsTab />}
          {activeTab === 'pipeline' && <PipelineTab />}
        </div>

        <footer className="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-4 text-xs text-neutral-500">
          CIG Motors Co. Ltd. · Finance Data Prep · Admin console
        </footer>
      </main>
    </div>
  )
}
