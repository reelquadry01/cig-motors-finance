import { useState } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'
import ConnectorStep1 from './ConnectorStep1'
import ConnectorStep2 from './ConnectorStep2'

export default function ConnectorWizard({ connectorType, onComplete, onCancel }) {
  const [step, setStep] = useState('form')
  const [config, setConfig] = useState({})
  const [credentials, setCredentials] = useState({})
  const [connectorName, setConnectorName] = useState('')
  const [connectorId, setConnectorId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [error, setError] = useState(null)

  const typeKey = typeof connectorType === 'string' ? connectorType : connectorType?.type
  const subtype = typeof connectorType === 'object' ? connectorType?.subtype : null
  const displayName = subtype ? subtype.charAt(0).toUpperCase() + subtype.slice(1) : typeKey

  const handleConnect = async (formConfig, formCreds, formName) => {
    setTestResult(null)
    setError(null)
    try {
      const name = formName || `${displayName} connection`
      const createResult = await connectorApi.createConnector(
        typeKey,
        { ...formConfig, subtype },
        name,
        formCreds,
      )
      const id = createResult.connector.id
      setConnectorId(id)
      setConnectorName(name)

      const result = await connectorApi.testConnection(id)
      setTestResult(result)

      if (result.ok) {
        setStep('preview')
      }
      return result
    } catch (e) {
      setError(e.message)
      setTestResult({ ok: false, message: e.message })
      return { ok: false, message: e.message }
    }
  }

  const handleLoad = async () => {
    try {
      if (connectorId) {
        await connectorApi.syncNow(connectorId)
      }
      onComplete()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">
            Data Source
          </div>
          <h2 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">
            Connect to {displayName}
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-3 px-6 pt-4">
        {[
          { key: 'form', label: 'Configure' },
          { key: 'preview', label: 'Preview & Load' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold shrink-0 transition-colors ${
              (step === 'form' && i === 0) || (step === 'preview' && i <= 1)
                ? 'bg-[#c8102e] text-white'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
            }`}>
              {step === 'preview' && i === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[11px] font-semibold ${
              (step === 'form' && i === 0) || (step === 'preview' && i <= 1)
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-400'
            }`}>{s.label}</span>
            {i === 0 && <div className={`flex-1 h-0.5 rounded-full ${
              step === 'preview' ? 'bg-[#c8102e]' : 'bg-neutral-200 dark:bg-neutral-700'
            }`} />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Body */}
      <div className="px-6 py-5">
        {step === 'form' && (
          <ConnectorStep1
            connectorType={connectorType}
            config={config}
            credentials={credentials}
            connectorName={connectorName}
            testResult={testResult}
            onConfigChange={setConfig}
            onCredentialsChange={setCredentials}
            onNameChange={setConnectorName}
            onConnect={handleConnect}
          />
        )}
        {step === 'preview' && (
          <ConnectorStep2
            connectorId={connectorId}
            connectorType={connectorType}
            onLoad={handleLoad}
          />
        )}
      </div>
    </div>
  )
}
