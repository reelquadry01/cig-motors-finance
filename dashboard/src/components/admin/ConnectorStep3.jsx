import { useState } from 'react'
import { Play, Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react'

const SCHEDULE_OPTIONS = [
  { value: 'manual', label: 'Manual', desc: 'Sync only when triggered', icon: Play },
  { value: 'daily', label: 'Daily', desc: 'Every day at a set time', icon: Calendar },
  { value: 'weekly', label: 'Weekly', desc: 'Once per week', icon: Calendar },
  { value: 'custom', label: 'Custom Cron', desc: 'Advanced scheduling', icon: Clock },
]

const IMPORT_MODES = [
  { value: 'replace', label: 'Replace', desc: 'Overwrite existing data with each sync' },
  { value: 'append', label: 'Append', desc: 'Add new rows without removing existing data' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ConnectorStep3({ connectorId, connectorName, connectorType, onActivate, saving }) {
  const [importMode, setImportMode] = useState('replace')
  const [schedule, setSchedule] = useState('manual')
  const [scheduleTime, setScheduleTime] = useState('06:00')
  const [scheduleDay, setScheduleDay] = useState('Monday')
  const [cronExpression, setCronExpression] = useState('0 6 * * *')
  const [emailNotify, setEmailNotify] = useState(false)
  const [clearSample, setClearSample] = useState(false)

  const typeKey = typeof connectorType === 'string' ? connectorType : connectorType?.type

  const handleActivate = () => {
    const scheduleConfig = { mode: schedule }
    if (schedule === 'daily' || schedule === 'weekly') {
      scheduleConfig.time = scheduleTime
    }
    if (schedule === 'weekly') {
      scheduleConfig.day = scheduleDay
    }
    if (schedule === 'custom') {
      scheduleConfig.expression = cronExpression
    }
    onActivate(scheduleConfig)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500 mb-1">Step 3</div>
        <h3 className="text-lg font-extrabold text-[#1f3a5f] dark:text-white">Activate</h3>
        <p className="text-xs text-neutral-500 mt-1">Choose how and when to import data from this source.</p>
      </div>

      <div>
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Import Mode</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IMPORT_MODES.map(m => (
            <button
              key={m.value}
              onClick={() => setImportMode(m.value)}
              className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                importMode === m.value
                  ? 'border-[#c8102e] bg-[#c8102e]/5 ring-1 ring-[#c8102e]/30'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  importMode === m.value ? 'border-[#c8102e]' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {importMode === m.value && <div className="w-2 h-2 rounded-full bg-[#c8102e]" />}
                </div>
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{m.label}</span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 ml-6">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Sync Schedule</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SCHEDULE_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setSchedule(s.value)}
              className={`rounded-xl border p-3 text-center transition-all duration-200 ${
                schedule === s.value
                  ? 'border-[#c8102e] bg-[#c8102e]/5 ring-1 ring-[#c8102e]/30'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${schedule === s.value ? 'text-[#c8102e]' : 'text-neutral-400'}`} />
              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{s.label}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{s.desc}</div>
            </button>
          ))}
        </div>

        {schedule === 'daily' && (
          <div className="mt-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Run at</span>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none"
            />
          </div>
        )}

        {schedule === 'weekly' && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">Every</span>
            <select
              value={scheduleDay}
              onChange={(e) => setScheduleDay(e.target.value)}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none"
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="text-xs text-neutral-600 dark:text-neutral-400">at</span>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm text-neutral-900 dark:text-neutral-100 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none"
            />
          </div>
        )}

        {schedule === 'custom' && (
          <div className="mt-3">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Cron Expression</span>
              <input
                type="text"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 6 * * *"
                className="mt-1 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 font-mono focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 mt-1">minute hour day month weekday — e.g. "0 6 * * 1-5" for weekdays at 6 AM</span>
            </label>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-[#c8102e] focus:ring-[#c8102e]/20"
          />
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Email notifications</div>
            <div className="text-[11px] text-neutral-500">Send an email when sync completes or fails</div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={clearSample}
            onChange={(e) => setClearSample(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-[#c8102e] focus:ring-[#c8102e]/20"
          />
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Clear sample data first</div>
            <div className="text-[11px] text-neutral-500">Remove placeholder data before importing real data</div>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Summary</div>
        <div className="text-[11.5px] text-neutral-600 dark:text-neutral-400 space-y-1">
          <div><strong>Source:</strong> {connectorName || typeKey}</div>
          <div><strong>Mode:</strong> {importMode === 'replace' ? 'Replace existing data' : 'Append new rows'}</div>
          <div><strong>Schedule:</strong> {schedule === 'manual' ? 'Manual only' : `${schedule} at ${scheduleTime}`}</div>
        </div>
      </div>

      <button
        onClick={handleActivate}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8102e] hover:bg-[#a90d26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 text-sm transition-colors shadow-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {saving ? 'Activating…' : 'Activate & Sync'}
      </button>
    </div>
  )
}
