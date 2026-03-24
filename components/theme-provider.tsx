'use client'

import * as React from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

type ThemeProviderProps = {
  children: React.ReactNode
  attribute?: 'class' | string
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyThemeToDocument = (attribute: string, theme: ResolvedTheme) => {
  const root = document.documentElement

  if (attribute === 'class') {
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    return
  }

  root.setAttribute(attribute, theme)
}

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>('light')

  React.useEffect(() => {
    setSystemTheme(getSystemTheme())

    try {
      const stored = window.localStorage.getItem(storageKey) as Theme | null
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored)
      }
    } catch {
      setThemeState(defaultTheme)
    }
  }, [defaultTheme, storageKey])

  React.useEffect(() => {
    if (!enableSystem) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    onChange()
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [enableSystem])

  const resolvedTheme: ResolvedTheme = theme === 'system'
    ? (enableSystem ? systemTheme : 'light')
    : theme

  React.useEffect(() => {
    applyThemeToDocument(attribute, resolvedTheme)
  }, [attribute, resolvedTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)

    try {
      window.localStorage.setItem(storageKey, nextTheme)
    } catch {
      // ignore storage errors
    }
  }, [storageKey])

  const value = React.useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme,
  }), [resolvedTheme, setTheme, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)

  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
    }
  }

  return context
}
