/**
 * 主题工具函数
 */
import type { GlobalThemeOverrides } from 'naive-ui'
import type { ColorPalette, ThemeConfig } from '@/types/theme'

/**
 * Hex 颜色转 RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result || result.length < 4) return null
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  }
}

/**
 * RGB 转 Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 调亮颜色
 * @param hex 十六进制颜色
 * @param amount 调亮程度 (0-1)
 */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = rgb.r + (255 - rgb.r) * amount
  const g = rgb.g + (255 - rgb.g) * amount
  const b = rgb.b + (255 - rgb.b) * amount

  return rgbToHex(r, g, b)
}

/**
 * 调暗颜色
 * @param hex 十六进制颜色
 * @param amount 调暗程度 (0-1)
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const r = rgb.r * (1 - amount)
  const g = rgb.g * (1 - amount)
  const b = rgb.b * (1 - amount)

  return rgbToHex(r, g, b)
}

/**
 * 添加透明度
 * @param hex 十六进制颜色
 * @param alpha 透明度 (0-1)
 */
export function addAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * 根据基础色生成颜色调色板
 * 用于 Naive UI 主题覆盖
 */
export function generateColorPalette(baseColor: string, isDark = false): ColorPalette {
  if (isDark) {
    return {
      color: baseColor,
      hover: lighten(baseColor, 0.2),
      pressed: darken(baseColor, 0.1),
      suppl: lighten(baseColor, 0.15),
    }
  }
  return {
    color: baseColor,
    hover: lighten(baseColor, 0.15),
    pressed: darken(baseColor, 0.15),
    suppl: lighten(baseColor, 0.1),
  }
}

/**
 * 生成 Naive UI 主题覆盖配置
 */
export function generateThemeOverrides(config: ThemeConfig): GlobalThemeOverrides {
  const { primaryColor, successColor, warningColor, errorColor, infoColor, borderRadius, darkMode } = config

  const primaryPalette = generateColorPalette(primaryColor, darkMode)
  const successPalette = generateColorPalette(successColor, darkMode)
  const warningPalette = generateColorPalette(warningColor, darkMode)
  const errorPalette = generateColorPalette(errorColor, darkMode)
  const infoPalette = generateColorPalette(infoColor, darkMode)

  // 暗色模式颜色配置
  const darkColors = {
    bodyColor: '#141414',
    cardColor: '#1f1f1f',
    modalColor: '#1f1f1f',
    popoverColor: '#262626',
    tableColor: '#1f1f1f',
    inputColor: '#262626',
    hoverColor: '#262626',
    borderColor: '#333',
    dividerColor: '#333',
    textColorBase: 'rgba(255, 255, 255, 0.9)',
    textColor1: 'rgba(255, 255, 255, 0.9)',
    textColor2: 'rgba(255, 255, 255, 0.7)',
    textColor3: 'rgba(255, 255, 255, 0.45)',
  }

  const baseOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: primaryPalette.color,
      primaryColorHover: primaryPalette.hover,
      primaryColorPressed: primaryPalette.pressed,
      primaryColorSuppl: primaryPalette.suppl,

      successColor: successPalette.color,
      successColorHover: successPalette.hover,
      successColorPressed: successPalette.pressed,
      successColorSuppl: successPalette.suppl,

      warningColor: warningPalette.color,
      warningColorHover: warningPalette.hover,
      warningColorPressed: warningPalette.pressed,
      warningColorSuppl: warningPalette.suppl,

      errorColor: errorPalette.color,
      errorColorHover: errorPalette.hover,
      errorColorPressed: errorPalette.pressed,
      errorColorSuppl: errorPalette.suppl,

      infoColor: infoPalette.color,
      infoColorHover: infoPalette.hover,
      infoColorPressed: infoPalette.pressed,
      infoColorSuppl: infoPalette.suppl,

      borderRadius: `${borderRadius}px`,
      borderRadiusSmall: `${Math.max(borderRadius - 2, 2)}px`,
    },
    Button: {
      borderRadiusMedium: `${borderRadius}px`,
      borderRadiusSmall: `${Math.max(borderRadius - 2, 2)}px`,
      borderRadiusLarge: `${borderRadius + 2}px`,
    },
    Card: {
      borderRadius: `${borderRadius}px`,
    },
    Input: {},
    Select: {},
    Tag: {
      borderRadius: `${Math.max(borderRadius - 2, 2)}px`,
    },
    Menu: {
      borderRadius: `${borderRadius}px`,
    },
    Tree: {
      fontSize: '16px',
    },
  }

  // 暗色模式额外覆盖
  if (darkMode) {
    baseOverrides.common = {
      ...baseOverrides.common,
      bodyColor: darkColors.bodyColor,
      cardColor: darkColors.cardColor,
      modalColor: darkColors.modalColor,
      popoverColor: darkColors.popoverColor,
      tableColor: darkColors.tableColor,
      inputColor: darkColors.inputColor,
      hoverColor: darkColors.hoverColor,
      borderColor: darkColors.borderColor,
      dividerColor: darkColors.dividerColor,
      textColorBase: darkColors.textColorBase,
      textColor1: darkColors.textColor1,
      textColor2: darkColors.textColor2,
      textColor3: darkColors.textColor3,
    }

    baseOverrides.Card = {
      ...baseOverrides.Card,
      color: darkColors.cardColor,
    }

    baseOverrides.Input = {
      ...baseOverrides.Input,
      color: darkColors.inputColor,
    }

    baseOverrides.DataTable = {
      thColor: darkColors.tableColor,
      tdColor: darkColors.tableColor,
      borderColor: darkColors.borderColor,
    }

    baseOverrides.Drawer = {
      color: darkColors.cardColor,
    }

    baseOverrides.Modal = {
      color: darkColors.modalColor,
    }

    baseOverrides.Menu = {
      ...baseOverrides.Menu,
      color: 'transparent',
      itemColorActive: addAlpha(primaryColor, 0.15),
      itemColorActiveHover: addAlpha(primaryColor, 0.2),
    }

    baseOverrides.Layout = {
      color: darkColors.bodyColor,
      siderColor: darkColors.cardColor,
      headerColor: darkColors.cardColor,
    }

    baseOverrides.Dropdown = {
      color: darkColors.popoverColor,
    }

    baseOverrides.Popover = {
      color: darkColors.popoverColor,
    }
  }

  return baseOverrides
}

/**
 * 应用 CSS 变量到 document
 */
export function applyCssVariables(config: ThemeConfig): void {
  const root = document.documentElement

  // 主题色
  root.style.setProperty('--primary-color', config.primaryColor)
  root.style.setProperty('--primary-color-hover', lighten(config.primaryColor, 0.15))
  root.style.setProperty('--primary-color-pressed', darken(config.primaryColor, 0.15))
  root.style.setProperty('--primary-color-suppl', addAlpha(config.primaryColor, 0.1))

  // 功能色
  root.style.setProperty('--success-color', config.successColor)
  root.style.setProperty('--warning-color', config.warningColor)
  root.style.setProperty('--error-color', config.errorColor)
  root.style.setProperty('--info-color', config.infoColor)

  // 布局
  root.style.setProperty('--sidebar-width', `${config.sidebarWidth}px`)
  root.style.setProperty('--sidebar-collapsed-width', `${config.sidebarCollapsedWidth}px`)
  root.style.setProperty('--header-height', `${config.headerHeight}px`)
  root.style.setProperty('--tabs-height', `${config.tabsHeight}px`)

  // 圆角
  root.style.setProperty('--border-radius', `${config.borderRadius}px`)
  root.style.setProperty('--border-radius-small', `${Math.max(config.borderRadius - 2, 2)}px`)
  root.style.setProperty('--border-radius-large', `${config.borderRadius + 2}px`)

  // 辅助功能模式
  if (config.grayMode) {
    root.style.setProperty('filter', 'grayscale(100%)')
  } else if (config.colorWeak) {
    root.style.setProperty('filter', 'invert(80%)')
  } else {
    root.style.removeProperty('filter')
  }

  // 深色模式
  if (config.darkMode) {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }
}

/**
 * 从 localStorage 获取主题配置
 */
export function getStoredThemeConfig(): Partial<ThemeConfig> | null {
  try {
    const stored = localStorage.getItem('ray-theme-config')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * 保存主题配置到 localStorage
 */
export function saveThemeConfig(config: ThemeConfig): void {
  try {
    localStorage.setItem('ray-theme-config', JSON.stringify(config))
  } catch {
    console.warn('保存主题配置失败')
  }
}
