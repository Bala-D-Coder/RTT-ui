export type ThemeName = 'light' | 'dark'

const THEME_KEY = 'voice-notes.theme'
export const THEME_CHANGE = 'voice-notes:theme-change'

function preferred(): ThemeName {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** An explicit choice always beats the OS; with no choice stored the OS decides. */
export function themeChoice(): ThemeName {
  const stored = window.localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : preferred()
}

export function applyTheme(next: ThemeName) {
  document.documentElement.dataset.theme = next
}

export function setTheme(next: ThemeName) {
  window.localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
  window.dispatchEvent(new Event(THEME_CHANGE))
}
