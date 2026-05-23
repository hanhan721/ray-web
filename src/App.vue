<script setup lang="ts">
import { zhCN, dateZhCN, darkTheme } from 'naive-ui'
import { useAppStore } from '@/stores/app'
import { syncDiscreteTheme } from '@/utils/request'
import SettingDrawer from '@/components/common/SettingDrawer/index.vue'

// Naive UI 全局配置
const locale = zhCN
const dateLocale = dateZhCN

const appStore = useAppStore()

// 初始化主题配置
onMounted(() => {
  appStore.initFromStorage()
})

// 同步暗色模式到 axios 离散 API（拦截器中的 message 提示）
watch(() => appStore.isDarkMode, (isDark) => syncDiscreteTheme(isDark), { immediate: true })
</script>

<template>
  <n-config-provider
    :locale="locale"
    :date-locale="dateLocale"
    :theme="appStore.isDarkMode ? darkTheme : null"
    :theme-overrides="appStore.naiveThemeOverrides"
  >
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <RouterView />
            <SettingDrawer />
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style scoped>
</style>
