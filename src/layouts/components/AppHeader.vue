<template>
  <div class="app-header">
    <div class="header-left">
      <NButton quaternary @click="appStore.toggleSidebar">
        <template #icon>
          <NIcon :component="appStore.sidebarCollapsed ? ChevronForwardOutline : MenuOutline" />
        </template>
      </NButton>
      <Breadcrumb />
    </div>

    <div class="header-right">
      <!-- 主题切换 -->
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton quaternary @click="appStore.toggleTheme">
            <template #icon>
              <NIcon :component="appStore.isDarkMode ? SunnyOutline : MoonOutline" />
            </template>
          </NButton>
        </template>
        {{ appStore.isDarkMode ? '切换亮色模式' : '切换暗色模式' }}
      </NTooltip>

      <!-- 设置按钮 -->
      <NTooltip trigger="hover">
        <template #trigger>
          <NButton quaternary @click="appStore.openSettingDrawer">
            <template #icon>
              <NIcon :component="SettingsOutline" />
            </template>
          </NButton>
        </template>
        系统设置
      </NTooltip>

      <!-- 用户信息 -->
      <NDropdown
        trigger="click"
        :options="userOptions"
        @select="handleUserAction"
      >
        <div class="user-info">
          <NAvatar
            round
            size="small"
            :src="userStore.userInfo?.avatar?.url"
          >
            <template #fallback>
              {{ userStore.nickname?.charAt(0) || 'U' }}
            </template>
          </NAvatar>
          <span class="username">{{ userStore.nickname || userStore.username }}</span>
          <NIcon :component="ChevronDownOutline" />
        </div>
      </NDropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon, NTooltip } from 'naive-ui'
import {
  ChevronDownOutline,
  PersonOutline,
  LogOutOutline,
  MenuOutline,
  ChevronForwardOutline,
  SunnyOutline,
  MoonOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import Breadcrumb from './Breadcrumb.vue'

defineOptions({
  name: 'AppHeader',
})

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const dialog = useDialog()

const userOptions = [
  {
    label: '个人信息',
    key: 'profile',
    icon: () => h(NIcon, null, { default: () => h(PersonOutline) }),
  },
  {
    type: 'divider',
    key: 'd1',
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }),
  },
]

function handleUserAction(key: string) {
  if (key === 'logout') {
    dialog.warning({
      title: '提示',
      content: '确定要退出登录吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        await userStore.logout()
        router.push('/login')
      },
    })
  } else if (key === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 $spacing-md;
  background: var(--bg-color-container);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xs $spacing-sm;
  cursor: pointer;
  border-radius: $border-radius-md;
  transition: background-color 0.2s;

  &:hover {
    background: var(--bg-color-hover);
  }

  .username {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
