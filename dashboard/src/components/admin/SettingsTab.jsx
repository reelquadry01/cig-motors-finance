// Settings — read-only surface for now that shows what the console is
// configured against. It's the natural place to add self-service knobs
// later (rotate ADMIN_KEY, change TOKEN_TTL, per-user access, etc.).
//
// Everything here is informational: the real values live in the Render env
// vars or in the pipeline's Setup sheet, and this page just reflects them
// so a Finance user doesn't have to log into Render to know the setup.
import { Info } from 'lucide-react'

const ROWS = [
  { key: 'Company', value: 'CIG Motors Co. Ltd.', help: 'Baked into the pipeline config. Change it in pipeline/config.py.' },
  { key: 'Currency', value: 'Nigerian Naira (₦)', help: 'Presented in thousands (₦\'000) on the dashboard and Excel model.' },
  { key: 'Session length', value: '30 minutes of inactivity', help: 'Backend env var TOKEN_TTL_MINUTES on Render.' },
  { key: 'Upload limit', value: '50 MB per file', help: 'Backend env var MAX_UPLOAD_MB.' },
  { key: 'Pipeline timeout', value: '60 seconds', help: 'Backend env var PIPELINE_TIMEOUT_S.' },
  { key: 'Hosting', value: 'Render — free tier', help: 'Data survives redeploys only on Starter and above.' },
]

export default function SettingsTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-[10.5px] tracking-[0.14em] font-semibold uppercase text-neutral-500">Console</div>
          <h2 className="text-base font-extrabold text-[#1f3a5f] dark:text-white">Current configuration</h2>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {ROWS.map(r => (
            <li key={r.key} className="px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-40 shrink-0 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                {r.key}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{r.value}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{r.help}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
        <div className="text-xs text-sky-800 dark:text-sky-200 leading-relaxed">
          <strong>Editing these values:</strong> they live outside the console — Render's environment
          variables for session / upload / timeout knobs, and <code className="px-1 rounded bg-white/50 dark:bg-black/30">pipeline/config.py</code> for
          firm identity. Once we have per-user login this page will hold rotate-key / add-user actions.
        </div>
      </div>
    </div>
  )
}
