// Admin console — sidebar + main area, industry-standard shape.
//
// Structure (like Vercel / Supabase / Retool admin):
//   ┌────────────┬───────────────────────────────────────┐
//   │  Logo      │  Section eyebrow + title + subtitle   │
//   │            │  ┌─────────────────────────────────┐  │
//   │  Overview  │  │                                 │  │
//   │  ─ DATA ─  │  │  section content                │  │
//   │  Connect.. │  │                                 │  │
//   │  Files     │  │                                 │  │
//   │  Pipeline  │  └─────────────────────────────────┘  │
//   │  ─ ADMIN ─ │                                       │
//   │  Activity  │  Footer                               │
//   │  Settings  │                                       │
//   │            │                                       │
//   │  Sign out  │                                       │
//   └────────────┴───────────────────────────────────────┘
//
// Left column: brand + navigation + sign out (never scrolls).
// Right column: what you're looking at.
//
// A URL hash keeps the active section between refreshes and shareable — so
// #files always lands on Files for anyone who bookmarks it. On mobile the
// sidebar collapses into a top drawer.
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Plug, FolderInput, Workflow, Activity as ActivityIcon,
  Settings2, LogOut, ChevronRight, ExternalLink, Menu, X,
} from 'lucide-react'
import { getToken, clearToken } from '../../lib/api'
import cigLogo from '../../assets/cig-gac-logo.png'
import PasswordGate from './PasswordGate'
import DataSourcesTab from './DataSourcesTab'
import FileImportsTab from './FileImportsTab'
import PipelineTab from './PipelineTab'
import OverviewTab from './OverviewTab'
import ActivityTab from './ActivityTab'
import SettingsTab from './SettingsTab'

// Sections in the sidebar. Each has a stable key that also drives the URL hash.
// `group` clusters items under a small caps divider label; sections with no
// group render at the top of the sidebar.
const SECTIONS = [
  {
    key: 'overview', label: 'Overview', icon: LayoutDashboard,
    title: 'Overview',
    subtitle: 'A quick read on connectors, files and the pipeline in one place.',
    render: (ctx) => <OverviewTab onGoTo={ctx.goto} />,
  },
  {
    key: 'connectors', label: 'Connectors', icon: Plug, group: 'Data',
    title: 'Connectors',
    subtitle: 'Connect to your ERP, database or API to pull GL transactions automatically.',
    render: () => <DataSourcesTab />,
  },
  {
    key: 'files', label: 'Files', icon: FolderInput, group: 'Data',
    title: 'Files',
    subtitle: 'Upload the GL, statement mapping, budget and other source files by hand.',
    render: () => <FileImportsTab />,
  },
  {
    key: 'pipeline', label: 'Pipeline', icon: Workflow, group: 'Data',
    title: 'Pipeline',
    subtitle: 'Run the pipeline and watch every step, live.',
    render: () => <PipelineTab />,
  },
  {
    key: 'activity', label: 'Activity', icon: ActivityIcon, group: 'Admin',
    title: 'Activity',
    subtitle: 'Every upload, sync, restore and pipeline run — with filters.',
    render: () => <ActivityTab />,
  },
  {
    key: 'settings', label: 'Settings', icon: Settings2, group: 'Admin',
    title: 'Settings',
    subtitle: 'Firm identity, session limits and other console preferences.',
    render: () => <SettingsTab />,
  },
]

const SECTIONS_BY_KEY = Object.fromEntries(SECTIONS.map(s => [s.key, s]))

function readHash() {
  const h = (typeof window !== 'undefined' && window.location.hash) || ''
  const key = h.replace('#', '')
  return SECTIONS_BY_KEY[key] ? key : 'overview'
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [activeKey, setActiveKey] = useState(readHash)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Keep the hash in sync so the page is bookmark-able and back-nav works.
  useEffect(() => {
    if (!authed) return
    const target = '#' + activeKey
    if (window.location.hash !== target) {
      history.replaceState(null, '', target)
    }
  }, [activeKey, authed])

  useEffect(() => {
    const onHash = () => setActiveKey(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!authed) return <PasswordGate onAuthed={() => setAuthed(true)} />

  const active = SECTIONS_BY_KEY[activeKey] || SECTIONS[0]
  const goto = (k) => { setActiveKey(k); setDrawerOpen(false) }

  return (
    <div className="min-h-screen bg-[#faf7f2] dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200">
      {/* Mobile menu button */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-neutral-950/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setDrawerOpen(v => !v)}
          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Toggle navigation"
        >
          {drawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
        <img src={cigLogo} alt="CIG Motors" className="h-7 w-auto" />
        <div className="text-sm font-extrabold text-[#1f3a5f] dark:text-white">Admin console</div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 lg:px-8 lg:py-6">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
          {/* Sidebar */}
          <Sidebar
            active={activeKey}
            onGo={goto}
            drawerOpen={drawerOpen}
            onCloseDrawer={() => setDrawerOpen(false)}
            onSignOut={() => { clearToken(); setAuthed(false) }}
          />

          {/* Main area */}
          <main className="min-w-0 py-6 lg:py-2">
            {/* Section head — same skeleton every time so pages feel consistent */}
            <div className="mb-6">
              <nav
                className="flex items-center gap-1 text-[10.5px] tracking-[0.16em] font-semibold uppercase text-neutral-500 mb-1"
                aria-label="Breadcrumb"
              >
                <span>Admin</span>
                <ChevronRight className="w-3 h-3 text-neutral-300" />
                <span className="text-[#1f3a5f] dark:text-white">{active.label}</span>
              </nav>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#1f3a5f] dark:text-white tracking-tight leading-tight">
                {active.title}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1.5 max-w-2xl">
                {active.subtitle}
              </p>
            </div>

            {/* Section content */}
            <div key={activeKey}>{active.render({ goto })}</div>

            <footer className="mt-16 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span>CIG Motors Co. Ltd. · Finance Data Prep</span>
              <span className="text-neutral-300">·</span>
              <span>v1</span>
              <div className="flex-1" />
              <span className="text-[10.5px] text-neutral-400" title="Built by QA">Built by QA</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}

/* ─── Sidebar ──────────────────────────────────────────────────────── */
function Sidebar({ active, onGo, drawerOpen, onCloseDrawer, onSignOut }) {
  // Group sections into buckets keyed by their `group` prop; ungrouped items
  // render at the very top.
  const buckets = {}
  const ungrouped = []
  for (const s of SECTIONS) {
    if (s.group) (buckets[s.group] = buckets[s.group] || []).push(s)
    else ungrouped.push(s)
  }

  return (
    <>
      {/* Mobile drawer scrim */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onCloseDrawer}
        />
      )}

      <aside
        className={`
          fixed lg:sticky lg:top-6 inset-y-0 left-0 z-50 lg:z-auto
          w-64 lg:w-auto shrink-0
          bg-white dark:bg-neutral-900 lg:bg-transparent lg:dark:bg-transparent
          border-r border-neutral-200 dark:border-neutral-800 lg:border-0
          transform transition-transform duration-200
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          lg:h-[calc(100vh-3rem)]
        `}
      >
        {/* Brand */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 lg:border-0">
          <a href="/" className="flex items-center gap-3">
            <img src={cigLogo} alt="CIG Motors" className="h-9 w-auto" />
            <div className="border-l border-neutral-300 dark:border-neutral-700 pl-3">
              <div className="text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-500 dark:text-neutral-400">Admin</div>
              <div className="text-sm font-extrabold text-[#1f3a5f] dark:text-white leading-tight">Finance Data Prep</div>
            </div>
          </a>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {ungrouped.length > 0 && (
            <NavGroup items={ungrouped} active={active} onGo={onGo} />
          )}
          {Object.entries(buckets).map(([label, items]) => (
            <div key={label}>
              <div className="px-3 pt-2 pb-1 text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-400">{label}</div>
              <NavGroup items={items} active={active} onGo={onGo} />
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 space-y-1 border-t border-neutral-200 dark:border-neutral-800">
          <a
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-[#1f3a5f] dark:hover:text-white"
          >
            <ExternalLink className="w-4 h-4" /> View dashboard
          </a>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-700"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

function NavGroup({ items, active, onGo }) {
  return (
    <ul className="space-y-0.5">
      {items.map(s => {
        const Icon = s.icon
        const isActive = s.key === active
        return (
          <li key={s.key}>
            <button
              onClick={() => onGo(s.key)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-[#1f3a5f] text-white shadow-sm dark:bg-[#c8102e]'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-[#1f3a5f] dark:hover:text-white'}
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{s.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
