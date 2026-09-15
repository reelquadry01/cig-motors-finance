import { useState, useEffect, useCallback } from 'react'
import {
  X, Loader2, Eye, EyeOff, HelpCircle, CheckCircle2, XCircle,
  AlertTriangle, Trash2, RefreshCw, Clock, ChevronDown, ChevronUp,
  Zap, Info,
} from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'

const STATUS_STYLES = {
  idle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  syncing: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 animate-pulse',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  inactive: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
}

const STATUS_LABELS = {
  idle: 'Active',
  syncing: 'Syncing',
  error: 'Error',
  inactive: 'Inactive',
}

const DEFAULT_CLEAN_RULES = {
  remove_duplicates: true,
  auto_map_gl_codes: true,
  normalize_dates: true,
  verify_debit_credit: true,
  flag_unmapped: true,
  remove_empty_rows: true,
}

const CLEAN_RULE_LABELS = {
  remove_duplicates: 'Remove duplicate transactions',
  auto_map_gl_codes: 'Auto-map missing GL codes',
  normalize_dates: 'Normalize date formats',
  verify_debit_credit: 'Verify debit/credit signs',
  flag_unmapped: 'Flag unmapped accounts',
  remove_empty_rows: 'Remove empty rows (Dr=0, Cr=0)',
}

export default function ConnectorConfigPanel({ connectorId, onClose, onUpdated, onDeleted }) {
  const [loading, setLoading] = useState(true)
  const [connector, setConnector] = useState(null)
  const [schema, setSchema] = useState([])
  const [config, setConfig] = useState({})
  const [credentials, setCredentials] = useState({})
  const [syncInfo, setSyncInfo] = useState({})
  const [cleanRules, setCleanRules] = useState(DEFAULT_CLEAN_RULES)
  const [scheduleMode, setScheduleMode] = useState('manual')
  const [scheduleExpr, setScheduleExpr] = useState('')
  const [showPasswords, setShowPasswords] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [syncHistory, setSyncHistory] = useState([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [configRes, syncRes] = await Promise.all([
        connectorApi.getConnector(connectorId).catch(() => null),
        connectorApi.getSyncStatus(connectorId).catch(() => ({ status: {}, history: [] })),
      ])

      let entry = configRes?.connector
      if (!entry) {
        const list = await connectorApi.listConnectors()
        entry = (list.connectors || []).find(c => c.id === connectorId)
      }
      if (!entry) throw new Error('Connector not found')

      setConnector(entry)

      const typeKey = entry.type
      try {
        const typesRes = await connectorApi.getConnectorTypes()
        const types = typesRes.types || []
        const match = types.find(t => t.type === typeKey)
        if (match) setSchema(match.config_schema || [])
      } catch {
        setSchema([])
      }

      const rawConfig = entry.config || {}
      setConfig(rawConfig)

      const credRef = entry.credentials_ref || {}
      const placeholderCreds = {}
      for (const key of Object.keys(credRef)) {
        placeholderCreds[key] = '••••••••'
      }
      setCredentials(placeholderCreds)

      const schedule = entry.schedule || { mode: 'manual' }
      setScheduleMode(schedule.mode || 'manual')
      setScheduleExpr(schedule.expression || schedule.time || '')

      setSyncInfo(syncRes?.status || {})
      setSyncHistory(syncRes?.history || [])

      const rules = entry.clean_rules || DEFAULT_CLEAN_RULES
      setCleanRules({ ...DEFAULT_CLEAN_RULES, ...rules })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [connectorId])

  useEffect(() => { loadData() }, [loadData])

  const isCredentialField = (field) => {
    const lower = (field.name || '').toLowerCase()
    return lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('key') || lower.includes('pwd')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await connectorApi.testConnection(connectorId)
      setTestResult(result)
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMsg('')
    try {
      const hasRealCreds = Object.values(credentials).some(v => v !== '••••••••')
      const payload = {
        name: connector.name,
        config,
        schedule: {
          mode: scheduleMode,
          ...(scheduleMode === 'scheduled' ? { expression: scheduleExpr } : {}),
        },
        clean_rules: cleanRules,
      }
      if (hasRealCreds) {
        payload.credentials = credentials
      }
      await connectorApi.updateConnector(connectorId, payload)
      setSuccessMsg('Configuration saved successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
      onUpdated?.()
      loadData()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Disconnect and remove this connector? This cannot be undone.')) return
    setDeleting(true)
    try {
      await connectorApi.deleteConnector(connectorId)
      onDeleted?.()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  const formatTime = (ts) => {
    if (!ts) return '—'
    try {
      return new Date(ts).toLocaleString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    } catch {
      return ts
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-xl z-50 flex flex-col bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 animate-slide-in">
        {loading ? (
          <SkeletonPanel />
        ) : !connector ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <XCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500">Connector not found.</p>
            <button onClick={onClose} className="mt-4 text-xs font-semibold text-[#1f3a5f] dark:text-[#c8102e] hover:underline">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg grid place-items-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: getTypeColor(connector.type) }}
                >
                  {connector.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {connector.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-neutral-500">{connector.type}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[connector.status?.status || 'inactive']}`}>
                      {STATUS_LABELS[connector.status?.status || 'inactive']}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  {successMsg}
                </div>
              )}

              {/* Connection Settings */}
              <Section title="Connection Settings">
                <div className="space-y-4">
                  {schema.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {schema.map(field => {
                        const isCred = isCredentialField(field)
                        const val = isCred ? (credentials[field.name] ?? '') : (config[field.name] ?? '')
                        return (
                          <FieldInput
                            key={field.name}
                            field={field}
                            value={val}
                            onChange={(v) => {
                              if (isCred) {
                                setCredentials(prev => ({ ...prev, [field.name]: v }))
                              } else {
                                setConfig(prev => ({ ...prev, [field.name]: v }))
                              }
                            }}
                            showPassword={showPasswords[field.name]}
                            onTogglePassword={() => setShowPasswords(p => ({ ...p, [field.name]: !p[field.name] }))}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500">No editable fields available.</div>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 text-xs transition-colors"
                  >
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {testing ? 'Testing…' : 'Test Connection'}
                  </button>

                  {testResult && (
                    <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg px-4 py-3 ${testResult.ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
                      {testResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                      <div>
                        <div className="font-semibold">{testResult.ok ? 'Connected!' : 'Connection failed'}</div>
                        <div className="text-xs mt-0.5 opacity-80">{testResult.message}</div>
                        {testResult.ok && testResult.row_count !== undefined && (
                          <div className="text-xs mt-1">{testResult.row_count.toLocaleString()} rows · {testResult.tables?.length || 0} tables</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Sync Settings */}
              <Section title="Sync Settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Mode</span>
                    <select
                      value={scheduleMode}
                      onChange={(e) => setScheduleMode(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors"
                    >
                      <option value="manual">Manual</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </label>
                  {scheduleMode === 'scheduled' && (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Cron Schedule</span>
                      <input
                        type="text"
                        value={scheduleExpr}
                        onChange={(e) => setScheduleExpr(e.target.value)}
                        placeholder="0 6 * * *"
                        className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors"
                      />
                      <span className="text-[11px] text-neutral-400 mt-1 block">e.g. 0 6 * * * (daily at 6 AM)</span>
                    </label>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Last sync: {formatTime(syncInfo.last_sync)}</span>
                  </div>
                  {syncInfo.next_sync && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Next sync: {formatTime(syncInfo.next_sync)}</span>
                    </div>
                  )}
                  {syncInfo.status && (
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${syncInfo.status === 'completed' ? 'bg-emerald-500' : syncInfo.status === 'running' ? 'bg-sky-500 animate-pulse' : 'bg-neutral-400'}`} />
                      <span>Status: {syncInfo.status}{syncInfo.row_count != null ? ` (${syncInfo.row_count.toLocaleString()} rows)` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Sync History */}
                {syncHistory.length > 0 && (
                  <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                    <button
                      onClick={() => setHistoryExpanded(h => !h)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-[#1f3a5f] dark:hover:text-[#c8102e] transition-colors"
                    >
                      {historyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      Sync History (last 5)
                    </button>
                    {historyExpanded && (
                      <div className="mt-2 space-y-2">
                        {syncHistory.slice(0, 5).map((entry, i) => (
                          <div key={i} className="flex items-center justify-between text-xs rounded-lg bg-neutral-50 dark:bg-neutral-900 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${entry.status === 'completed' ? 'bg-emerald-500' : entry.status === 'failed' ? 'bg-rose-500' : 'bg-neutral-400'}`} />
                              <span className="text-neutral-700 dark:text-neutral-300">{formatTime(entry.started_at)}</span>
                            </div>
                            <span className="text-neutral-500">
                              {entry.status}{entry.row_count != null ? ` · ${entry.row_count.toLocaleString()} rows` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Data Cleaning Rules */}
              <Section title="Data Cleaning Rules">
                <div className="space-y-3">
                  {Object.entries(CLEAN_RULE_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={cleanRules[key] ?? false}
                        onChange={(e) => setCleanRules(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-[#1f3a5f] focus:ring-[#1f3a5f]/20"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </Section>

              {/* Data Flow Info */}
              <Section title="Data Flow Info">
                <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-sky-800 dark:text-sky-200 space-y-1">
                      <p>
                        <strong>This connector pulls:</strong> GL Transactions
                      </p>
                      <p>
                        For Statement Mapping, Budget, and Account Summary — upload via the <strong>File Imports</strong> tab.
                      </p>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Danger Zone */}
              <Section title="Danger Zone" variant="danger">
                <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-rose-800 dark:text-rose-300">Disconnect & Remove</div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                        Remove this connector and all its configuration. Synced data will be preserved.
                      </div>
                    </div>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50 text-rose-700 dark:text-rose-300 font-semibold px-3 py-1.5 text-xs transition-colors shrink-0 ml-4"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {deleting ? 'Removing…' : 'Disconnect & Remove'}
                    </button>
                  </div>
                </div>
              </Section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-4 py-2 text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 text-xs transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </>
  )
}

function Section({ title, variant, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${variant === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
        {title}
      </div>
      {children}
    </div>
  )
}

function FieldInput({ field, value, onChange, showPassword, onTogglePassword }) {
  const [showHelp, setShowHelp] = useState(false)
  const isPassword = field.type === 'password'

  return (
    <div className={field.type === 'textarea' || field.type === 'json' ? 'md:col-span-2' : ''}>
      <label className="block">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            {field.label}
          </span>
          {field.required && <span className="text-rose-500 text-xs">*</span>}
          {field.help_text && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHelp(h => !h)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              {showHelp && (
                <div className="absolute left-0 bottom-full mb-2 w-56 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2 text-[11px] text-neutral-600 dark:text-neutral-400 z-10">
                  {field.help_text}
                </div>
              )}
            </div>
          )}
        </div>

        {field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors"
          >
            <option value="">{field.placeholder || 'Select…'}</option>
            {(field.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === 'textarea' || field.type === 'json' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors resize-y"
          />
        ) : (
          <div className="relative">
            <input
              type={isPassword && !showPassword ? 'password' : field.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className={`mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors ${isPassword ? 'pr-10' : ''}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
      </label>
    </div>
  )
}

function SkeletonPanel() {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="space-y-2">
            <div className="w-32 h-4 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="w-20 h-3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          </div>
        </div>
        <div className="w-8 h-8 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      </div>
      <div className="flex-1 px-6 py-5 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
            <div className="w-36 h-3 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="space-y-3">
              <div className="w-full h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="w-full h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function getTypeColor(type) {
  const colors = {
    mysql: '#00758F', postgresql: '#336791', sqlserver: '#CC2927', mariadb: '#003545', oracle: '#F80000',
    sage300: '#4CAF50', sapb1: '#F0AB00', netsuite: '#FF0000', dynamics365: '#002050',
    quickbooks: '#2CA01C', xero: '#13B5EA', odoo: '#875A7B', sage50: '#4CAF50',
    epicor: '#FF6600', infor: '#005B82', rest_api: '#6B7280', odbc: '#6B7280', file_monitor: '#6B7280',
    sql: '#336791',
  }
  return colors[type] || '#6B7280'
}
