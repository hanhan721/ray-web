import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ThemeConfig } from '@/types/theme'
import { defaultThemeConfig } from '@/types/theme'
import {
  generateThemeOverrides,
  applyCssVariables,
  getStoredThemeConfig,
  saveThemeConfig,
} from '@/utils/themeUtils'
import type { GlobalThemeOverrides } from 'naive-ui'

export const useAppStore = defineStore('app', () => {
  // State
  const sidebarCollapsed = ref(false)
  const language = ref('zh-CN')

  // 主题配置
  const themeConfig = ref<ThemeConfig>({ ...defaultThemeConfig })

  // 设置抽屉可见性
  const settingDrawerVisible = ref(false)

  // Getters
  const isDarkMode = computed(() => themeConfig.value.darkMode)

  // 兼容旧的 theme 属性
  const theme = computed(() => (themeConfig.value.darkMode ? 'dark' : 'light'))

  // Naive UI 主题覆盖配置
  const naiveThemeOverrides = computed<GlobalThemeOverrides>(() => {
    return generateThemeOverrides(themeConfig.value)
  })

  // Actions
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
  }

  function setTheme(newTheme: 'light' | 'dark') {
    themeConfig.value.darkMode = newTheme === 'dark'
    applyTheme()
  }

  function toggleTheme() {
    themeConfig.value.darkMode = !themeConfig.value.darkMode
    applyTheme()
  }

  function setLanguage(lang: string) {
    language.value = lang
    localStorage.setItem('language', lang)
  }

  /**
   * 更新主题配置
   */
  function updateThemeConfig(config: Partial<ThemeConfig>) {
    themeConfig.value = { ...themeConfig.value, ...config }
    applyTheme()
  }

  /**
   * 重置主题配置为默认值
   */
  function resetThemeConfig() {
    themeConfig.value = { ...defaultThemeConfig }
    applyTheme()
  }

  /**
   * 应用主题到 document（CSS 变量 + 持久化）
   */
  function applyTheme() {
    applyCssVariables(themeConfig.value)
    saveThemeConfig(themeConfig.value)
  }

  /**
   * 打开设置抽屉
   */
  function openSettingDrawer() {
    settingDrawerVisible.value = true
  }

  /**
   * 关闭设置抽屉
   */
  function closeSettingDrawer() {
    settingDrawerVisible.value = false
  }

  /**
   * 从 localStorage 初始化
   */
  function initFromStorage() {
    // 加载主题配置
    const storedConfig = getStoredThemeConfig()
    if (storedConfig) {
      themeConfig.value = { ...defaultThemeConfig, ...storedConfig }
    }
    applyTheme()

    // 加载语言设置
    const storedLanguage = localStorage.getItem('language')
    if (storedLanguage) {
      language.value = storedLanguage
    }
  }

  return {
    // State
    sidebarCollapsed,
    language,
    themeConfig,
    settingDrawerVisible,

    // Getters
    isDarkMode,
    theme,
    naiveThemeOverrides,

    // Actions
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    toggleTheme,
    setLanguage,
    updateThemeConfig,
    resetThemeConfig,
    applyTheme,
    openSettingDrawer,
    closeSettingDrawer,
    initFromStorage,
  }
})
