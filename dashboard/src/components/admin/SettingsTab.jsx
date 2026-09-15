import { useState, useEffect } from 'react'
import { Save, Loader2, Info, Sparkles, AlertTriangle, Download, CheckCircle2, Copy } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'
import { updateSettings } from '../../lib/settingsApi'
import { api } from '../../lib/api'

export default function SettingsTab() {
  const { settings, refresh } = useSettings()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setForm(settings) }, [settings])

  const update = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false) }

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)
    try {
      await updateSettings(form)
      await refresh()
      setSaved(true)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      {/* Company Profile */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Company Profile</h2>
          <p className="text-[11.5px] text-neutral-500 mt-0.5">Customize the name, logo, colors, and currency. Changes apply everywhere — dashboard, PDF, Excel exports.</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5">
          {/* Company Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Company Name (Full)</span>
              <input type="text" value={form.company_name || ''} onChange={e => update('company_name', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Short Name</span>
              <input type="text" value={form.company_short_name || ''} onChange={e => update('company_short_name', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Industry</span>
              <select value={form.industry || 'automotive'} onChange={e => update('industry', e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors">
                <option value="automotive">Automotive / Dealership</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="saas">SaaS / Technology</option>
                <option value="banking">Financial Services / Banking</option>
                <option value="hospitality">Hospitality / Hotels</option>
                <option value="services">Professional Services</option>
                <option value="retail">Retail / FMCG</option>
                <option value="nonprofit">Non-Profit / NGO</option>
                <option value="oilgas">Oil & Gas / Mining</option>
                <option value="realestate">Real Estate / REITs</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="agriculture">Agriculture / Agri-business</option>
                <option value="telecom">Telecommunications</option>
                <option value="construction">Construction / EPC</option>
                <option value="transport">Transport / Logistics</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Tagline</span>
              <input type="text" value={form.tagline || ''} onChange={e => update('tagline', e.target.value)}
                placeholder="e.g. Monthly management report"
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
            </label>
          </div>

          {/* Currency */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Currency</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Code</span>
                <input type="text" value={form.currency_code || ''} onChange={e => update('currency_code', e.target.value)}
                  placeholder="NGN" maxLength={5}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Symbol</span>
                <input type="text" value={form.currency_symbol || ''} onChange={e => update('currency_symbol', e.target.value)}
                  placeholder="$" maxLength={5}
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Name</span>
                <input type="text" value={form.currency_name || ''} onChange={e => update('currency_name', e.target.value)}
                  placeholder="Nigerian Naira"
                  className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
              </label>
            </div>
          </div>

          {/* Colors */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Brand Colors</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Primary Color</span>
                <div className="flex items-center gap-3 mt-1.5">
                  <input type="color" value={form.primary_color || '#c8102e'} onChange={e => update('primary_color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer" />
                  <input type="text" value={form.primary_color || ''} onChange={e => update('primary_color', e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Secondary Color</span>
                <div className="flex items-center gap-3 mt-1.5">
                  <input type="color" value={form.secondary_color || '#1f3a5f'} onChange={e => update('secondary_color', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer" />
                  <input type="text" value={form.secondary_color || ''} onChange={e => update('secondary_color', e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none" />
                </div>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg" style={{ background: form.primary_color || '#c8102e' }} />
              <div className="w-8 h-8 rounded-lg" style={{ background: form.secondary_color || '#1f3a5f' }} />
              <span className="text-[10px] text-neutral-500 ml-2">Preview</span>
            </div>
          </div>

          {/* Logo URL */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Logo</div>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Logo URL (or paste a base64 data URL)</span>
              <input type="text" value={form.logo_url || ''} onChange={e => update('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png or data:image/png;base64,..."
                className="mt-1.5 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:outline-none transition-colors" />
            </label>
            {form.logo_url && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.logo_url} alt="Logo preview" className="h-10 w-auto rounded bg-white dark:bg-neutral-800 px-2 py-1 border border-neutral-200 dark:border-neutral-700" />
                <span className="text-[10px] text-neutral-500">Preview</span>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex items-center gap-3">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 text-white font-semibold px-5 py-2.5 text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div className="text-[11.5px] text-sky-800 dark:text-sky-200 leading-relaxed">
              Changes apply instantly across the dashboard, PDF exports, and Excel model. The pipeline config
              (<code className="px-1 rounded bg-white/50 dark:bg-black/30">pipeline/config.py</code>) reads from this on next run.
            </div>
          </div>
          {settings._github_configured ? (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11.5px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                <strong>GitHub persistence active.</strong> Settings are auto-committed to your repo on every save. They survive Render restarts and redeployments.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[11.5px] text-amber-800 dark:text-amber-200 leading-relaxed flex-1">
                  <strong>Local-only storage.</strong> Settings reset on Render restart. To enable persistent storage, add a <code className="px-1 rounded bg-white/50 dark:bg-black/30">GITHUB_TOKEN</code> env var in your Render dashboard with repo write access.
                </div>
                <button onClick={() => {
                  const snapshot = {}
                  for (const k of Object.keys(form)) snapshot[k] = form[k]
                  navigator.clipboard.writeText(JSON.stringify(snapshot))
                  setCopiedEnv(true); setTimeout(() => setCopiedEnv(false), 2000)
                }}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 text-[10.5px] font-semibold transition-colors">
                  {copiedEnv ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedEnv ? 'Copied!' : 'Copy env var'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Starter Templates */}
      <TemplatesSection />

      {/* Dataset actions */}
      <DatasetSection />
    </div>
  )
}

function TemplatesSection() {
  const BASE = import.meta.env.DEV ? 'http://localhost:8000' : ''
  const templates = [
    { file: 'GL_Template.xlsx', label: 'GL Template', desc: '28 rows covering all account types (revenue, COGS, opex, assets, liabilities, equity)' },
    { file: 'Statement_Mapping_Template.xlsx', label: 'Statement Mapping', desc: '28 accounts mapped to P&L, B/S, and cash flow sections' },
    { file: 'Budget_Template.xlsx', label: 'Budget Template', desc: '18 lines × 3 months of budget data' },
    { file: 'Account_Summary_Template.xlsx', label: 'Account Summary', desc: '9 accounts with opening balances for B/S reconciliation' },
  ]

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Starter Templates</h2>
        <p className="text-[11.5px] text-neutral-500 mt-0.5">Download blank templates to set up your own data. Fill them in and upload via File Imports.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map(t => (
          <a key={t.file} href={`${BASE}/templates/${t.file}`} download
            className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:border-[var(--brand)] hover:shadow-sm transition-all flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] grid place-items-center shrink-0 group-hover:bg-[var(--brand)] group-hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-neutral-900 dark:text-white">{t.label}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{t.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function DatasetSection() {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const loadSample = async () => {
    setBusy('sample'); setError(null); setSuccess(null)
    try {
      const r = await api.loadSample()
      setSuccess(`Loaded ${r.copied.length} sample file${r.copied.length === 1 ? '' : 's'} — pipeline is running.`)
    } catch (e) { setError(e.message) }
    finally { setBusy(null) }
  }

  const clearAll = async () => {
    setBusy('clear'); setError(null); setSuccess(null)
    try {
      const r = await api.clearAll()
      setSuccess(r.removed.length
        ? `Cleared ${r.removed.length} file${r.removed.length === 1 ? '' : 's'} (backed up first).`
        : 'Nothing to clear — data/current was already empty.')
      setConfirmClear(false)
    } catch (e) { setError(e.message) }
    finally { setBusy(null) }
  }

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Dataset</h2>
        <p className="text-[11.5px] text-neutral-500 mt-0.5">Reset to sample data, or wipe everything currently loaded.</p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 px-4 py-2.5 text-xs">{error}</div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 px-4 py-2.5 text-xs">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/15 to-sky-500/0 text-sky-600 grid place-items-center mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">Load sample data</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Copies the bundled Sample GL &amp; Statement Mapping into <code className="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-[10.5px]">data/current</code> and runs the pipeline.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={loadSample} disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-navy)] hover:opacity-90 disabled:opacity-50 text-white font-semibold px-3 py-2 text-xs">
              {busy === 'sample' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Load sample
            </button>
            <a href="https://github.com/reelquadry01/cig-motors-finance/raw/master/Sample%20GL_complete_dirty.xlsx"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold px-3 py-2">
              <Download className="w-3.5 h-3.5" /> Sample GL (.xlsx)
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-neutral-900 p-5">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/15 to-rose-500/0 text-rose-600 grid place-items-center mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">Clear all current data</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Removes every file from <code className="px-1 rounded bg-neutral-100 dark:bg-neutral-800 text-[10.5px]">data/current</code> so you can start clean.
          </p>
          <div className="mt-4">
            {!confirmClear ? (
              <button onClick={() => setConfirmClear(true)} disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-700 dark:text-rose-400 font-semibold px-3 py-2 text-xs disabled:opacity-50">
                <AlertTriangle className="w-3.5 h-3.5" /> Clear everything
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={clearAll} disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold px-3 py-2 text-xs">
                  {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Yes, clear all
                </button>
                <button onClick={() => setConfirmClear(false)} disabled={busy !== null}
                  className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-200 px-3 py-2">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
