import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import {
  applyThemeMode,
  currentThemeMode,
  writeStoredThemeMode,
  type ThemeMode,
} from '@/utils/theme'

export const useThemeStore = defineStore('theme', () => {
  const mode = shallowRef<ThemeMode>(currentThemeMode())

  function setMode(next: ThemeMode): void {
    mode.value = next
    applyThemeMode(next)
    writeStoredThemeMode(next)
  }

  function toggle(): void {
    setMode(mode.value === 'dark' ? 'light' : 'dark')
  }

  function syncFromDom(): void {
    mode.value = currentThemeMode()
  }

  return { mode, setMode, toggle, syncFromDom }
})
