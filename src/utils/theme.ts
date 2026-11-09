export const THEME_STORAGE_KEY = 'ray.theme'

export type ThemeMode = 'light' | 'dark'

export function parseThemeMode(value: unknown): ThemeMode | null {
  return value === 'light' || value === 'dark' ? value : null
}

export function resolveThemeMode(stored: ThemeMode | null, prefersDark: boolean): ThemeMode {
  if (stored) return stored
  return prefersDark ? 'dark' : 'light'
}

export interface ThemeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): ThemeStorage | undefined {
  if (typeof localStorage === 'undefined') return undefined
  return localStorage
}

export function readStoredThemeMode(storage?: ThemeStorage): ThemeMode | null {
  const target = storage ?? defaultStorage()
  if (!target) return null
  try {
    return parseThemeMode(target.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

export function writeStoredThemeMode(mode: ThemeMode, storage?: ThemeStorage): void {
  const target = storage ?? defaultStorage()
  if (!target) return
  try {
    target.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // 隐私模式或存储不可用时静默忽略，保持当前页面生效即可。
  }
}

export interface ThemeTarget {
  classList: { toggle(token: string, force?: boolean): void }
  style: { setProperty(name: string, value: string): void }
}

function defaultTarget(): ThemeTarget | undefined {
  if (typeof document === 'undefined') return undefined
  const element = document.documentElement as unknown as ThemeTarget | undefined
  return element ?? undefined
}

export function applyThemeMode(mode: ThemeMode, target?: ThemeTarget): void {
  const element = target ?? defaultTarget()
  if (!element) return
  element.classList.toggle('dark', mode === 'dark')
  element.style.setProperty('color-scheme', mode)
}

export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function currentThemeMode(): ThemeMode {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function initThemeMode(options?: {
  storage?: ThemeStorage
  prefersDark?: boolean
  target?: ThemeTarget
}): ThemeMode {
  const stored = readStoredThemeMode(options?.storage)
  const mode = resolveThemeMode(stored, options?.prefersDark ?? prefersDarkMode())
  applyThemeMode(mode, options?.target)
  return mode
}
