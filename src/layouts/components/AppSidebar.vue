<template>
  <div class="app-sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <div class="sidebar-logo">
      <img src="/logo.svg" alt="Logo" class="logo-img" />
      <span v-show="!appStore.sidebarCollapsed" class="logo-text">Ray Admin</span>
    </div>

    <NScrollbar class="sidebar-menu-wrapper">
      <NMenu
        :value="activeKey"
        :collapsed="appStore.sidebarCollapsed"
        :collapsed-width="appStore.themeConfig.sidebarCollapsedWidth"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :accordion="appStore.themeConfig.menuAccordion"
        :inverted="appStore.themeConfig.menuTheme === 'dark'"
        @update:value="handleMenuSelect"
      />
    </NScrollbar>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { MenuOption } from 'naive-ui'
import { NIcon } from 'naive-ui'
import {
  HomeOutline,
  SettingsOutline,
  PeopleOutline,
  ShieldOutline,
  ListOutline,
  FolderOutline,
  DocumentOutline,
  AppsOutline,
} from '@vicons/ionicons5'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import type { PermissionVO } from '@/types/permission'

defineOptions({
  name: 'AppSidebar',
})

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()

const activeKey = computed(() => route.path)

// 图标映射表
const iconMap: Record<string, Component> = {
  HomeOutline,
  SettingsOutline,
  PeopleOutline,
  ShieldOutline,
  ListOutline,
  FolderOutline,
  DocumentOutline,
  AppsOutline,
}

// 获取图标组件
function getIconComponent(iconName?: string) {
  if (!iconName) return FolderOutline
  return iconMap[iconName] || FolderOutline
}

// 将权限菜单转换为 Naive UI 的菜单选项
function convertToMenuOptions(menus: PermissionVO[], parentPath = ''): MenuOption[] {
  return menus.map((menu) => {
    // 构建完整路径：绝对路径直接使用，相对路径拼接父级路径
    const fullPath = menu.url.startsWith('/')
      ? menu.url
      : `${parentPath}/${menu.url}`.replace(/\/+/g, '/')

    const option: MenuOption = {
      label: menu.name,
      key: fullPath,
      icon: () => h(NIcon, null, { default: () => h(getIconComponent(menu.icon)) }),
    }

    if (menu.children?.length) {
      option.children = convertToMenuOptions(menu.children, fullPath)
    }

    return option
  })
}

// 默认首页菜单（当后端无菜单数据时使用）
const defaultMenuOptions: MenuOption[] = [
  {
    label: '首页',
    key: '/dashboard',
    icon: () => h(NIcon, null, { default: () => h(HomeOutline) }),
  },
]

// 菜单选项（优先使用后端返回的菜单）
const menuOptions = computed(() => {
  if (permissionStore.visibleMenus.length > 0) {
    return convertToMenuOptions(permissionStore.visibleMenus)
  }
  return defaultMenuOptions
})

function handleMenuSelect(key: string) {
  router.push(key)
}
</script>

<style scoped lang="scss">
.app-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width, $sidebar-width);
  height: 100vh;
  background: var(--bg-color-container, $bg-color-container);
  border-right: 1px solid var(--border-color, $border-color);
  transition: width 0.2s;

  &.collapsed {
    width: var(--sidebar-collapsed-width, $sidebar-collapsed-width);
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--header-height, $header-height);
  padding: 0 $spacing-md;
  border-bottom: 1px solid var(--border-color, $border-color);

  .logo-img {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  .logo-text {
    margin-left: $spacing-sm;
    font-size: $font-size-lg;
    font-weight: 600;
    color: var(--primary-color, $primary-color);
    white-space: nowrap;
    overflow: hidden;
  }
}

.sidebar-menu-wrapper {
  flex: 1;
  overflow: hidden;
}
</style>
