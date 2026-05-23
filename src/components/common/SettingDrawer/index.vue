<template>
  <NDrawer v-model:show="visible" :width="320" placement="right">
    <NDrawerContent title="系统设置" closable>
      <NScrollbar style="max-height: calc(100vh - 120px)">
        <div class="setting-drawer">
          <!-- 主题模式 -->
          <div class="setting-section">
            <div class="section-title">
              主题模式
            </div>
            <div class="theme-mode">
              <div
                class="mode-item"
                :class="{ active: !appStore.themeConfig.darkMode }"
                @click="handleThemeChange(false)"
              >
                <SunnyOutline class="mode-icon" />
                <span>亮色</span>
              </div>
              <div
                class="mode-item"
                :class="{ active: appStore.themeConfig.darkMode }"
                @click="handleThemeChange(true)"
              >
                <MoonOutline class="mode-icon" />
                <span>暗色</span>
              </div>
            </div>
          </div>

          <!-- 主题色 -->
          <div class="setting-section">
            <div class="section-title">
              主题色
            </div>
            <ThemeColorPicker v-model="primaryColor" />
          </div>

          <!-- 功能色 -->
          <div class="setting-section">
            <div class="section-title">
              功能色
            </div>
            <NSpace vertical :size="12">
              <div class="color-row">
                <span class="color-label">成功色</span>
                <NColorPicker
                  v-model:value="successColor"
                  :swatches="['#52c41a', '#73d13d', '#95de64', '#22c55e', '#10b981']"
                  size="small"
                />
              </div>
              <div class="color-row">
                <span class="color-label">警告色</span>
                <NColorPicker
                  v-model:value="warningColor"
                  :swatches="['#faad14', '#ffc53d', '#ffd666', '#f59e0b', '#eab308']"
                  size="small"
                />
              </div>
              <div class="color-row">
                <span class="color-label">错误色</span>
                <NColorPicker
                  v-model:value="errorColor"
                  :swatches="['#ff4d4f', '#ff7875', '#ffa39e', '#ef4444', '#dc2626']"
                  size="small"
                />
              </div>
            </NSpace>
          </div>

          <!-- 布局配置 -->
          <div class="setting-section">
            <div class="section-title">
              布局配置
            </div>
            <NSpace vertical :size="12">
              <div class="setting-row">
                <span class="setting-label">侧边栏宽度</span>
                <NSlider
                  v-model:value="sidebarWidth"
                  :min="200"
                  :max="300"
                  :step="4"
                  :format-tooltip="(v: number) => `${v}px`"
                  style="width: 120px"
                />
              </div>
              <div class="setting-row">
                <span class="setting-label">圆角大小</span>
                <NSlider
                  v-model:value="borderRadius"
                  :min="0"
                  :max="16"
                  :step="2"
                  :format-tooltip="(v: number) => `${v}px`"
                  style="width: 120px"
                />
              </div>
            </NSpace>
          </div>

          <!-- 菜单配置 -->
          <div class="setting-section">
            <div class="section-title">
              菜单配置
            </div>
            <NSpace vertical :size="12">
              <div class="setting-row">
                <span class="setting-label">菜单主题</span>
                <NSelect
                  v-model:value="menuTheme"
                  :options="menuThemeOptions"
                  size="small"
                  style="width: 100px"
                />
              </div>
              <div class="setting-row">
                <span class="setting-label">手风琴模式</span>
                <NSwitch v-model:value="menuAccordion" />
              </div>
            </NSpace>
          </div>

          <!-- 功能开关 -->
          <div class="setting-section">
            <div class="section-title">
              功能开关
            </div>
            <NSpace vertical :size="12">
              <div class="setting-row">
                <span class="setting-label">显示标签页</span>
                <NSwitch v-model:value="showTabs" />
              </div>
              <div class="setting-row">
                <span class="setting-label">开启动画</span>
                <NSwitch v-model:value="enableAnimation" />
              </div>
            </NSpace>
          </div>

          <!-- 辅助功能 -->
          <div class="setting-section">
            <div class="section-title">
              辅助功能
            </div>
            <NSpace vertical :size="12">
              <div class="setting-row">
                <span class="setting-label">灰色模式</span>
                <NSwitch v-model:value="grayMode" />
              </div>
              <div class="setting-row">
                <span class="setting-label">色弱模式</span>
                <NSwitch v-model:value="colorWeak" />
              </div>
            </NSpace>
          </div>

          <!-- 操作按钮 -->
          <div class="setting-actions">
            <NButton block @click="handleCopyConfig">
              <template #icon>
                <NIcon :component="CopyOutline" />
              </template>
              复制配置
            </NButton>
            <NButton block type="warning" @click="handleResetConfig">
              <template #icon>
                <NIcon :component="RefreshOutline" />
              </template>
              重置配置
            </NButton>
          </div>
        </div>
      </NScrollbar>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import {
  NDrawer,
  NDrawerContent,
  NScrollbar,
  NSpace,
  NSwitch,
  NSlider,
  NSelect,
  NColorPicker,
  NButton,
  NIcon,
} from 'naive-ui'
import { SunnyOutline, MoonOutline, CopyOutline, RefreshOutline } from '@vicons/ionicons5'
import { useAppStore } from '@/stores/app'
import type { MenuTheme } from '@/types/theme'
import ThemeColorPicker from './ThemeColorPicker.vue'

defineOptions({
  name: 'SettingDrawer',
})

const appStore = useAppStore()
const message = useMessage()

// 抽屉可见性
const visible = computed({
  get: () => appStore.settingDrawerVisible,
  set: (val: boolean) => (val ? appStore.openSettingDrawer() : appStore.closeSettingDrawer()),
})

// 菜单主题选项
const menuThemeOptions = [
  { label: '亮色', value: 'light' },
  { label: '暗色', value: 'dark' },
]

// 主题色
const primaryColor = computed({
  get: () => appStore.themeConfig.primaryColor,
  set: (val: string) => appStore.updateThemeConfig({ primaryColor: val }),
})

// 功能色
const successColor = computed({
  get: () => appStore.themeConfig.successColor,
  set: (val: string) => appStore.updateThemeConfig({ successColor: val }),
})

const warningColor = computed({
  get: () => appStore.themeConfig.warningColor,
  set: (val: string) => appStore.updateThemeConfig({ warningColor: val }),
})

const errorColor = computed({
  get: () => appStore.themeConfig.errorColor,
  set: (val: string) => appStore.updateThemeConfig({ errorColor: val }),
})

// 布局配置
const sidebarWidth = computed({
  get: () => appStore.themeConfig.sidebarWidth,
  set: (val: number) => appStore.updateThemeConfig({ sidebarWidth: val }),
})

const borderRadius = computed({
  get: () => appStore.themeConfig.borderRadius,
  set: (val: number) => appStore.updateThemeConfig({ borderRadius: val }),
})

// 菜单配置
const menuTheme = computed({
  get: () => appStore.themeConfig.menuTheme,
  set: (val: MenuTheme) => appStore.updateThemeConfig({ menuTheme: val }),
})

const menuAccordion = computed({
  get: () => appStore.themeConfig.menuAccordion,
  set: (val: boolean) => appStore.updateThemeConfig({ menuAccordion: val }),
})

// 功能开关
const showTabs = computed({
  get: () => appStore.themeConfig.showTabs,
  set: (val: boolean) => appStore.updateThemeConfig({ showTabs: val }),
})

const enableAnimation = computed({
  get: () => appStore.themeConfig.enableAnimation,
  set: (val: boolean) => appStore.updateThemeConfig({ enableAnimation: val }),
})

// 辅助功能
const grayMode = computed({
  get: () => appStore.themeConfig.grayMode,
  set: (val: boolean) => appStore.updateThemeConfig({ grayMode: val, colorWeak: false }),
})

const colorWeak = computed({
  get: () => appStore.themeConfig.colorWeak,
  set: (val: boolean) => appStore.updateThemeConfig({ colorWeak: val, grayMode: false }),
})

// 主题模式切换
function handleThemeChange(isDark: boolean) {
  appStore.updateThemeConfig({ darkMode: isDark })
}

// 复制配置
async function handleCopyConfig() {
  try {
    const config = JSON.stringify(appStore.themeConfig, null, 2)
    await navigator.clipboard.writeText(config)
    message.success('配置已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

// 重置配置
function handleResetConfig() {
  appStore.resetThemeConfig()
  message.success('配置已重置')
}
</script>

<style scoped lang="scss">
.setting-drawer {
  padding: 0 4px;
}

.setting-section {
  margin-bottom: 24px;

  .section-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color-primary);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color-light);
  }
}

.theme-mode {
  display: flex;
  gap: 12px;

  .mode-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition:
      border-color 0.2s,
      background-color 0.2s;

    &:hover {
      border-color: var(--primary-color);
    }

    &.active {
      border-color: var(--primary-color);
      background-color: var(--primary-color-suppl);
    }

    .mode-icon {
      font-size: 24px;
      color: var(--text-color-secondary);
    }

    &.active .mode-icon {
      color: var(--primary-color);
    }

    span {
      font-size: 12px;
      color: var(--text-color-secondary);
    }

    &.active span {
      color: var(--primary-color);
    }
  }
}

.color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .color-label {
    font-size: 13px;
    color: var(--text-color-secondary);
  }
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .setting-label {
    font-size: 13px;
    color: var(--text-color-secondary);
  }
}

.setting-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);
}
</style>
