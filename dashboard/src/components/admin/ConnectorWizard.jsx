import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'
import ConnectorStep1 from './ConnectorStep1'
import ConnectorStep2 from './ConnectorStep2'
import ConnectorStep3 from './ConnectorStep3'

const STEPS = [
  { key: 'configure', label: 'Configure' },
  { key: 'preview', label: 'Preview & Clean' },
  { key: 'activate', label: 'Activate' },
]

export default function ConnectorWizard({ connectorType, onComplete, onCancel }) {
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState({})
  const [credentials, setCredentials] = useState({})
  const [connectorName, setConnectorName] = useState('')
  const [connectorId, setConnectorId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const typeKey = typeof connectorType === 'string' ? connectorType : connectorType?.type
  const subtype = typeof connectorType === 'object' ? connectorType?.subtype : null

  const handleTest = async (testConfig, testCreds) => {
    setTestResult(null)
    setError(null)
    try {
      const name = testConfig.host || testConfig.name || connectorName || `${typeKey} connection`
      if (!connectorName) setConnectorName(name)

      const createResult = await connectorApi.createConnector(
        typeKey,
        { ...testConfig, subtype },
        name,
        testCreds,
      )
      const id = createResult.connector.id
      setConnectorId(id)

      const result = await connectorApi.testConnection(id)
      setTestResult(result)
      return result
    } catch (e) {
      setError(e.message)
      setTestResult({ ok: false, message: e.message })
      return { ok: false, message: e.message }
    }
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleActivate = async (schedule) => {
    setSaving(true)
    setError(null)
    try {
      if (connectorId) {
        await connectorApi.setSchedule(connectorId, schedule)
        await connectorApi.syncNow(connectorId)
      }
      onComplete()
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">Connector Wizard</div>
          <h2 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">
            Set up {subtype ? subtype.charAt(0).toUpperCase() + subtype.slice(1) : typeKey}
          </h2>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 px-4">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={`
                w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 transition-colors duration-200
                ${i <= step
                  ? 'bg-[#c8102e] text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'}
              `}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${i <= step ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-colors duration-200 ${i < step ? 'bg-[#c8102e]' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
        {step === 0 && (
          <ConnectorStep1
            connectorType={connectorType}
            config={config}
            credentials={credentials}
            connectorName={connectorName}
            testResult={testResult}
            onConfigChange={setConfig}
            onCredentialsChange={setCredentials}
            onNameChange={setConnectorName}
            onTest={handleTest}
          />
        )}
        {step === 1 && (
          <ConnectorStep2
            connectorId={connectorId}
            connectorType={connectorType}
          />
        )}
        {step === 2 && (
          <ConnectorStep3
            connectorId={connectorId}
            connectorName={connectorName}
            connectorType={connectorType}
            onActivate={handleActivate}
            saving={saving}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={step === 0 ? onCancel : handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-semibold px-4 py-2 text-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {step === 0 ? 'Cancel' : 'Back'}
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={handleNext}
            disabled={step === 0 && !testResult?.ok}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 text-xs transition-colors"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
