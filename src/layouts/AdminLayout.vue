<template>
  <NLayout has-sider class="admin-layout">
    <NLayoutSider
      bordered
      collapse-mode="width"
      :collapsed="appStore.sidebarCollapsed"
      :collapsed-width="appStore.themeConfig.sidebarCollapsedWidth"
      :width="appStore.themeConfig.sidebarWidth"
      :native-scrollbar="false"
      :inverted="appStore.themeConfig.menuTheme === 'dark'"
      show-trigger="bar"
      @collapse="appStore.setSidebarCollapsed(true)"
      @expand="appStore.setSidebarCollapsed(false)"
    >
      <AppSidebar />
    </NLayoutSider>

    <NLayout class="main-layout">
      <NLayoutHeader bordered>
        <AppHeader />
      </NLayoutHeader>

      <TabsView />

      <NLayoutContent content-style="display: flex; flex-direction: column;">
        <AppMain />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppMain from './components/AppMain.vue'
import TabsView from '@/components/common/TabsView/index.vue'

defineOptions({
  name: 'AdminLayout',
})

const route = useRoute()
const appStore = useAppStore()
const tabsStore = useTabsStore()

// 监听路由变化，自动添加标签
watch(
  () => route.path,
  (path: string) => {
    if (path && route.meta?.title) {
      tabsStore.addTab({
        path,
        name: route.name as string,
        title: route.meta.title as string,
        icon: route.meta.icon as string,
        affix: route.meta.affix as boolean,
        keepAlive: route.meta.keepAlive as boolean,
      })
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}

.main-layout {
  display: flex;
  flex-direction: column;
}

:deep(.n-layout-sider) {
  transition: width 0.2s, min-width 0.2s;
}

:deep(.n-layout-header) {
  height: $header-height;
}

:deep(.n-layout-content) {
  flex: 1;
  overflow: hidden;
}
</style>
