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
  primaryColor: '#00817c',
  successColor: '#52c41a',
  warningColor: '#faad14',
  errorColor: '#e7000b',
  infoColor: '#00817c',
  sidebarWidth: 200,
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

// 预设主题色（对齐 master 的 teal 青色系配色方案）
export const presetColors: PresetColor[] = [
  { name: '薄荷青', color: '#46ecd5' },
  { name: '亮青', color: '#65dbca' },
  { name: '明青', color: '#00bba7' },
  { name: '碧青', color: '#009689' },
  { name: '深青', color: '#00817c' },
  { name: '墨青', color: '#00786f' },
  { name: '暗青', color: '#005f5a' },
  { name: '潭青', color: '#005b57' },
]
