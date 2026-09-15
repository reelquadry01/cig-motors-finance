import { useState, useEffect, useCallback } from 'react'
import {
  Database, Link2, RefreshCw, Loader2, Trash2, Settings, Play,
  AlertTriangle, CheckCircle2, XCircle, Clock, Zap,
} from 'lucide-react'
import { connectorApi } from '../../lib/connectorApi'
import ErpGallery from './ErpGallery'
import ConnectorWizard from './ConnectorWizard'
import ConnectorConfigPanel from './ConnectorConfigPanel'

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

const TYPE_COLORS = {
  mysql: '#00758F', postgresql: '#336791', sqlserver: '#CC2927', mariadb: '#003545', oracle: '#F80000',
  sage300: '#4CAF50', sapb1: '#F0AB00', netsuite: '#FF0000', dynamics365: '#002050',
  quickbooks: '#2CA01C', xero: '#13B5EA', odoo: '#875A7B', sage50: '#4CAF50',
  epicor: '#FF6600', infor: '#005B82', rest_api: '#6B7280', odbc: '#6B7280', file_monitor: '#6B7280',
  sql: '#336791',
}

export default function DataSourcesTab() {
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wizardType, setWizardType] = useState(null)
  const [hasSampleData, setHasSampleData] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncingId, setSyncingId] = useState(null)
  const [configPanelId, setConfigPanelId] = useState(null)

  const loadConnectors = useCallback(async () => {
    try {
      setLoading(true)
      const r = await connectorApi.listConnectors()
      setConnectors(r.connectors || [])
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadConnectors() }, [loadConnectors])

  useEffect(() => {
    connectorApi.validateData('__sample_check__').catch(() => setHasSampleData(false))
  }, [])

  const handleSync = async (id) => {
    setSyncingId(id)
    try {
      await connectorApi.syncNow(id)
      setTimeout(loadConnectors, 1500)
    } catch (e) { setError(e.message) }
    finally { setSyncingId(null) }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete connector "${name}"? This cannot be undone.`)) return
    try {
      await connectorApi.deleteConnector(id)
      loadConnectors()
    } catch (e) { setError(e.message) }
  }

  const handleClearSample = async () => {
    setClearing(true)
    try {
      await connectorApi.clearSample(true)
      setHasSampleData(false)
      loadConnectors()
    } catch (e) { setError(e.message) }
    finally { setClearing(false) }
  }

  const handleWizardComplete = () => {
    setWizardType(null)
    loadConnectors()
  }

  if (wizardType) {
    return (
      <ConnectorWizard
        connectorType={wizardType}
        onComplete={handleWizardComplete}
        onCancel={() => setWizardType(null)}
      />
    )
  }

  return (
    <>
    <div className="space-y-8">
      {hasSampleData && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 text-sm text-amber-800 dark:text-amber-300">
            Sample data is loaded. Clear it before connecting a real source.
          </div>
          <button
            onClick={handleClearSample}
            disabled={clearing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
          >
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear Sample Data
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-4 py-3 text-sm">{error}</div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Add a source</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">
              GL transactions come from here. Mapping &amp; budget still live under <strong className="text-neutral-700 dark:text-neutral-300">Files</strong>.
            </p>
          </div>
        </div>
        <ErpGallery onSelect={setWizardType} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Active Connections</h2>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">{connectors.length} configured connector{connectors.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={loadConnectors}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1f3a5f] dark:text-[#c8102e] hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading && connectors.length === 0 && (
          <div className="grid place-items-center py-12 text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <span className="text-xs">Loading connectors…</span>
          </div>
        )}

        {!loading && connectors.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 py-12 text-center">
            <Database className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No connectors configured yet.</p>
            <p className="text-xs text-neutral-400 mt-1">Choose a source above to get started.</p>
          </div>
        )}

        {connectors.length > 0 && (
          <div className="space-y-3">
            {connectors.map(c => {
              const syncStatus = c.status?.status || 'inactive'
              const color = TYPE_COLORS[c.type] || '#6B7280'
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-lg grid place-items-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {c.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{c.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[syncStatus] || STATUS_STYLES.inactive}`}>
                        {STATUS_LABELS[syncStatus] || syncStatus}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {c.type} · {c.status?.row_count ? `${c.status.row_count.toLocaleString()} rows` : 'No data yet'}
                      {c.status?.last_sync && ` · Last sync: ${new Date(c.status.last_sync).toLocaleString()}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleSync(c.id)}
                      disabled={syncingId === c.id || syncStatus === 'syncing'}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3a5f] hover:bg-[#17304f] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                      title="Sync now"
                    >
                      {syncingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Sync
                    </button>
                    <button
                      onClick={() => setConfigPanelId(c.id)}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-[#1f3a5f] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Edit"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>

    {configPanelId && (
      <ConnectorConfigPanel
        connectorId={configPanelId}
        onClose={() => setConfigPanelId(null)}
        onUpdated={loadConnectors}
        onDeleted={loadConnectors}
      />
    )}
    </>
  )
}
