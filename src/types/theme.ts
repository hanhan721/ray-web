/**
 * 主题配置类型定义
 */

// 菜单主题类型
export type MenuTheme = 'light' | 'dark'

// 预设主题色接口
export interface PresetColor {
  name: string
  color: string
}

// 颜色调色板（用于 Naive UI 主题覆盖）
export interface ColorPalette {
  color: string
  hover: string
  pressed: string
  suppl: string
}

// 主题配置接口
export interface ThemeConfig {
  // 主题模式
  darkMode: boolean

  // 主色调
  primaryColor: string

  // 功能色
  successColor: string
  warningColor: string
  errorColor: string
  infoColor: string

  // 布局配置
  sidebarWidth: number
  sidebarCollapsedWidth: number
  headerHeight: number
  tabsHeight: number

  // 圆角
  borderRadius: number

  // 菜单配置
  menuTheme: MenuTheme
  menuAccordion: boolean

  // 标签页
  showTabs: boolean

  // 动画
  enableAnimation: boolean

  // 辅助功能
  grayMode: boolean
  colorWeak: boolean
}

// 标签项接口
export interface TabItem {
  path: string
  name: string
  title: string
  icon?: string
  affix?: boolean // 是否固定（如首页）
  closable?: boolean // 是否可关闭
  keepAlive?: boolean // 是否缓存页面
}

// 默认主题配置
export const defaultThemeConfig: ThemeConfig = {
  darkMode: false,
  primaryColor: '#1890ff',
  successColor: '#52c41a',
  warningColor: '#faad14',
  errorColor: '#ff4d4f',
  infoColor: '#1890ff',
  sidebarWidth: 256,
  sidebarCollapsedWidth: 64,
  headerHeight: 56,
  tabsHeight: 40,
  borderRadius: 8,
  menuTheme: 'light',
  menuAccordion: true,
  showTabs: true,
  enableAnimation: true,
  grayMode: false,
  colorWeak: false,
}

// 预设主题色
export const presetColors: PresetColor[] = [
  { name: '拂晓蓝', color: '#1890ff' },
  { name: '薄暮红', color: '#f5222d' },
  { name: '火山橙', color: '#fa541c' },
  { name: '日暮黄', color: '#faad14' },
  { name: '极光绿', color: '#52c41a' },
  { name: '青青蓝', color: '#13c2c2' },
  { name: '极客蓝', color: '#2f54eb' },
  { name: '酱紫色', color: '#722ed1' },
]
