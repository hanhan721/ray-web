import { describe, expect, it } from 'vitest'
import {
  applyThemeMode,
  initThemeMode,
  parseThemeMode,
  readStoredThemeMode,
  resolveThemeMode,
  writeStoredThemeMode,
} from '@/utils/theme'

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
  }
}

function memoryTarget() {
  const classes = new Set<string>()
  const styles = new Map<string, string>()
  return {
    classList: {
      toggle: (token: string, force?: boolean) => {
        if (force === undefined) {
          if (classes.has(token)) classes.delete(token)
          else classes.add(token)
        } else if (force) classes.add(token)
        else classes.delete(token)
      },
    },
    style: {
      setProperty: (name: string, value: string) => {
        styles.set(name, value)
      },
    },
    has: (token: string) => classes.has(token),
    styleOf: (name: string) => styles.get(name),
  }
}

describe('theme mode', () => {
  it('parses only light and dark values', () => {
    expect(parseThemeMode('dark')).toBe('dark')
    expect(parseThemeMode('light')).toBe('light')
    expect(parseThemeMode('system')).toBeNull()
    expect(parseThemeMode('')).toBeNull()
  })

  it('prefers the stored mode over the system preference', () => {
    expect(resolveThemeMode('light', true)).toBe('light')
    expect(resolveThemeMode('dark', false)).toBe('dark')
    expect(resolveThemeMode(null, true)).toBe('dark')
    expect(resolveThemeMode(null, false)).toBe('light')
  })

  it('reads and writes the stored mode', () => {
    const storage = memoryStorage({ 'ray.theme': 'dark' })
    expect(readStoredThemeMode(storage)).toBe('dark')
    writeStoredThemeMode('light', storage)
    expect(storage.getItem('ray.theme')).toBe('light')
    expect(readStoredThemeMode(memoryStorage({ 'ray.theme': 'system' }))).toBeNull()
  })

  it('applies the mode to the document target', () => {
    const target = memoryTarget()
    applyThemeMode('dark', target)
    expect(target.has('dark')).toBe(true)
    expect(target.styleOf('color-scheme')).toBe('dark')
    applyThemeMode('light', target)
    expect(target.has('dark')).toBe(false)
    expect(target.styleOf('color-scheme')).toBe('light')
  })

  it('initializes from storage first and falls back to system preference', () => {
    const stored = memoryStorage({ 'ray.theme': 'dark' })
    const target = memoryTarget()
    expect(initThemeMode({ storage: stored, prefersDark: false, target })).toBe('dark')
    expect(target.has('dark')).toBe(true)

    const fresh = memoryTarget()
    expect(initThemeMode({ storage: memoryStorage(), prefersDark: true, target: fresh })).toBe(
      'dark',
    )
    expect(fresh.has('dark')).toBe(true)
  })
})
