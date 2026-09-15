import { useState, useEffect } from 'react'
import { HelpCircle, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'

export default function ConnectorStep1({
  connectorType,
  config,
  credentials,
  connectorName,
  testResult,
  onConfigChange,
  onCredentialsChange,
  onNameChange,
  onTest,
}) {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [showPasswords, setShowPasswords] = useState({})
  const [localConfig, setLocalConfig] = useState(config)
  const [localCreds, setLocalCreds] = useState(credentials)
  const [localName, setLocalName] = useState(connectorName)

  const typeKey = typeof connectorType === 'string' ? connectorType : connectorType?.type

  useEffect(() => {
    let cancelled = false
    const fetchSchema = async () => {
      try {
        setLoading(true)
        const r = await connectorApi.getConnectorTypes()
        const types = r.types || []
        const match = types.find(t => t.type === typeKey)
        if (!cancelled && match) {
          setSchema(match.config_schema || [])
        }
      } catch {
        if (!cancelled) setSchema([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSchema()
    return () => { cancelled = true }
  }, [typeKey])

  const updateConfig = (name, value) => {
    const next = { ...localConfig, [name]: value }
    setLocalConfig(next)
    onConfigChange(next)
  }

  const updateCred = (name, value) => {
    const next = { ...localCreds, [name]: value }
    setLocalCreds(next)
    onCredentialsChange(next)
  }

  const updateName = (value) => {
    setLocalName(value)
    onNameChange(value)
  }

  const isCredentialField = (field) => {
    const lower = (field.name || '').toLowerCase()
    return lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('key') || lower.includes('pwd')
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await onTest(localConfig, localCreds)
    } finally { setTesting(false) }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-12 text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span className="text-xs">Loading configuration fields…</span>
      </div>
    )
  }

  if (!schema || schema.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-neutral-500">
        No configuration schema available for this connector type.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Step 1</div>
        <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Configure Connection</h3>
        <p className="text-xs text-neutral-500 mt-1">Enter the connection details for your data source.</p>
      </div>

      <div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Connection Name</span>
          <input
            type="text"
            value={localName}
            onChange={(e) => updateName(e.target.value)}
            placeholder={`${typeKey} connection`}
            className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none transition-colors"
          />
        </label>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Connection Settings</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schema.map(field => (
            <FieldInput
              key={field.name}
              field={field}
              value={isCredentialField(field) ? (localCreds[field.name] || '') : (localConfig[field.name] ?? '')}
              onChange={(v) => isCredentialField(field) ? updateCred(field.name, v) : updateConfig(field.name, v)}
              showPassword={showPasswords[field.name]}
              onTogglePassword={() => setShowPasswords(p => ({ ...p, [field.name]: !p[field.name] }))}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <button
          onClick={handleTest}
          disabled={testing || !localName}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 text-xs transition-colors"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
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
