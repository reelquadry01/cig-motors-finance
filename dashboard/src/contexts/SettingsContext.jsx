import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSettings } from '../lib/settingsApi'
import { setCurrencySymbol } from '../lib/fmt'

const SettingsContext = createContext(null)

const DEFAULTS = {
  company_name: 'CIG Motors Co. Ltd.',
  company_short_name: 'CIG Motors',
  industry: 'Automotive',
  currency_code: 'NGN',
  currency_symbol: '\u20a6',
  currency_name: 'Nigerian Naira',
  primary_color: '#c8102e',
  secondary_color: '#1f3a5f',
  logo_url: '',
  tagline: 'Monthly management report',
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const s = await getSettings()
      if (s) {
        const { _github_configured, ...rest } = s
        setSettings({ ...rest, _github_configured })
      }
    } catch { /* use defaults */ }
    finally { setLoaded(true) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Apply CSS custom properties whenever colors change
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--brand', settings.primary_color)
    root.style.setProperty('--brand-navy', settings.secondary_color)
  }, [settings.primary_color, settings.secondary_color])

  // Sync currency symbol to fmt module
  useEffect(() => {
    setCurrencySymbol(settings.currency_symbol)
  }, [settings.currency_symbol])

  return (
    <SettingsContext.Provider value={{ settings, loaded, refresh, setSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext) || { settings: DEFAULTS, loaded: true, refresh: () => {}, setSettings: () => {} }
}
