import { useCallback, useEffect, useState } from 'react'
import { THEME_CHANGE, applyTheme, setTheme, themeChoice, type ThemeName } from '@/services/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const next = themeChoice()
    applyTheme(next)
    return next
  })

  useEffect(() => {
    const onChange = () => setThemeState(themeChoice())
    window.addEventListener(THEME_CHANGE, onChange)
    return () => window.removeEventListener(THEME_CHANGE, onChange)
  }, [])

  const choose = useCallback((next: ThemeName) => setTheme(next), [])
  return { theme, setTheme: choose }
}
