import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { api, setToken } from '../../lib/api'
import cigLogo from '../../assets/cig-gac-logo.png'

export default function PasswordGate({ onAuthed }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!key) return
    setBusy(true); setError('')
    try {
      const r = await api.login(key)
      setToken(r.token)
      onAuthed()
    } catch (err) {
      setError(err.message || 'Sign-in failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#1f3a5f] via-[#1a1a1a] to-[#c8102e]/70">
      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={cigLogo} alt="CIG Motors" className="h-10 w-auto" />
          <div className="border-l border-neutral-300 pl-3">
            <div className="text-[10px] tracking-[0.16em] font-semibold uppercase text-neutral-500">Admin console</div>
            <h1 className="text-xl font-extrabold text-[#1f3a5f] leading-tight">Finance Data Prep</h1>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">Admin key</span>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <input
                type={reveal ? 'text' : 'password'}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
                placeholder="Enter shared admin key"
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-neutral-300 focus:border-[#1f3a5f] focus:ring-2 focus:ring-[#1f3a5f]/20 focus:outline-none text-sm bg-white"
              />
              <button
                type="button"
                onClick={() => setReveal(v => !v)}
                aria-label={reveal ? 'Hide key' : 'Show key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#1f3a5f] rounded-md hover:bg-neutral-100 transition-colors"
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</div>
          )}
          <button
            type="submit"
            disabled={busy || !key}
            className="w-full rounded-lg bg-[#c8102e] hover:bg-[#a90d26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors shadow-sm"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</span>
            ) : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 text-[11px] text-neutral-500 text-center">
          For internal use. Sessions expire after 30 minutes of inactivity.
        </div>
      </div>
    </div>
  )
}
