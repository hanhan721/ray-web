<template>
  <div class="dashboard-page">
    <!-- 欢迎区域 -->
    <NCard class="welcome-card">
      <div class="welcome-content">
        <div class="welcome-text">
          <h2>{{ greeting }}，{{ userStore.nickname || userStore.username }}</h2>
          <p class="welcome-desc">
            欢迎回来，今天也是元气满满的一天！
          </p>
        </div>
        <div class="welcome-time">
          <div class="current-time">
            {{ currentTime }}
          </div>
          <div class="current-date">
            {{ currentDate }}
          </div>
        </div>
      </div>
    </NCard>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <NCard
        v-for="stat in statistics"
        :key="stat.title"
        class="stat-card"
      >
        <div class="stat-content">
          <div class="stat-icon" :style="{ backgroundColor: stat.bgColor }">
            <NIcon :size="24" :color="stat.color">
              <component :is="stat.icon" />
            </NIcon>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stat.value }}
            </div>
            <div class="stat-title">
              {{ stat.title }}
            </div>
          </div>
        </div>
      </NCard>
    </div>

    <!-- 快捷操作 -->
    <NCard title="快捷操作" class="quick-actions-card">
      <NSpace>
        <NButton
          v-for="action in quickActions"
          :key="action.label"
          :type="action.type"
          @click="handleQuickAction(action)"
        >
          <template #icon>
            <NIcon>
              <component :is="action.icon" />
            </NIcon>
          </template>
          {{ action.label }}
        </NButton>
      </NSpace>
    </NCard>

    <!-- 系统信息 -->
    <div class="info-section">
      <NCard title="系统信息" class="info-card">
        <NDescriptions :column="2" label-placement="left">
          <NDescriptionsItem label="系统名称">
            Ray Admin
          </NDescriptionsItem>
          <NDescriptionsItem label="系统版本">
            v1.0.0
          </NDescriptionsItem>
          <NDescriptionsItem label="前端框架">
            Vue 3.5 + TypeScript
          </NDescriptionsItem>
          <NDescriptionsItem label="UI 组件库">
            Naive UI
          </NDescriptionsItem>
          <NDescriptionsItem label="后端框架">
            Spring Boot 4.0
          </NDescriptionsItem>
          <NDescriptionsItem label="数据库">
            PostgreSQL 16
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>

      <NCard title="待办事项" class="info-card">
        <NEmpty v-if="todos.length === 0" description="暂无待办事项" />
        <NList v-else>
          <NListItem v-for="todo in todos" :key="todo.id">
            <NThing :title="todo.title" :description="todo.time">
              <template #avatar>
                <NTag :type="todo.type" size="small">
                  {{ todo.tag }}
                </NTag>
              </template>
            </NThing>
          </NListItem>
        </NList>
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import {
  PeopleOutline,
  DocumentTextOutline,
  SettingsOutline,
  BarChartOutline,
  AddOutline,
  SearchOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import type { Component } from 'vue'
import type { ButtonProps } from 'naive-ui'

defineOptions({
  name: 'DashboardPage',
})

const userStore = useUserStore()
const router = useRouter()

// 当前时间
const currentTime = ref('')
const currentDate = ref('')

// 更新时间
function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

// 问候语
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
})

// 统计数据
interface Statistic {
  title: string
  value: string | number
  icon: Component
  color: string
  bgColor: string
}

const statistics: Statistic[] = [
  {
    title: '用户总数',
    value: 1024,
    icon: PeopleOutline,
    color: '#18a058',
    bgColor: 'rgba(24, 160, 88, 0.1)',
  },
  {
    title: '菜单数量',
    value: 36,
    icon: DocumentTextOutline,
    color: '#2080f0',
    bgColor: 'rgba(32, 128, 240, 0.1)',
  },
  {
    title: '角色数量',
    value: 8,
    icon: SettingsOutline,
    color: '#f0a020',
    bgColor: 'rgba(240, 160, 32, 0.1)',
  },
  {
    title: '访问量',
    value: '12.5K',
    icon: BarChartOutline,
    color: '#d03050',
    bgColor: 'rgba(208, 48, 80, 0.1)',
  },
]

// 快捷操作
interface QuickAction {
  label: string
  icon: Component
  type?: ButtonProps['type']
  path?: string
}

const quickActions: QuickAction[] = [
  { label: '新增用户', icon: AddOutline, type: 'primary', path: '/system/user' },
  { label: '菜单管理', icon: DocumentTextOutline, type: 'info', path: '/system/permission' },
  { label: '搜索', icon: SearchOutline, type: 'default' },
  { label: '刷新缓存', icon: RefreshOutline, type: 'warning' },
]

function handleQuickAction(action: QuickAction) {
  if (action.path) {
    router.push(action.path)
  }
}

// 待办事项
interface Todo {
  id: number
  title: string
  time: string
  tag: string
  type: 'success' | 'warning' | 'error' | 'info'
}

const todos: Todo[] = [
  { id: 1, title: '完成系统权限配置', time: '今天 14:00', tag: '待处理', type: 'warning' },
  { id: 2, title: '审核新用户注册申请', time: '今天 16:00', tag: '待处理', type: 'warning' },
  { id: 3, title: '系统安全检查', time: '明天 10:00', tag: '计划中', type: 'info' },
]

// 定时更新时间
let timer: ReturnType<typeof setInterval>

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped lang="scss">
.dashboard-page {
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  :deep(.n-card__content) {
    padding: $spacing-lg $spacing-xl;
  }
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}

.welcome-text {
  h2 {
    margin: 0 0 $spacing-sm;
    font-size: 24px;
    font-weight: 500;
  }

  .welcome-desc {
    margin: 0;
    opacity: 0.85;
  }
}

.welcome-time {
  text-align: right;

  .current-time {
    font-size: 32px;
    font-weight: 300;
    font-family: 'Roboto Mono', monospace;
  }

  .current-date {
    margin-top: $spacing-xs;
    opacity: 0.85;
  }
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-lg;
}

.stat-card {
  :deep(.n-card__content) {
    padding: $spacing-lg;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: $border-radius-lg;
}

.stat-info {
  .stat-value {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
  }

  .stat-title {
    color: $text-color-secondary;
    font-size: $font-size-sm;
    margin-top: $spacing-xs;
  }
}

.quick-actions-card {
  :deep(.n-card__content) {
    padding: $spacing-md $spacing-lg;
  }
}

.info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-lg;
}

.info-card {
  :deep(.n-card__content) {
    padding: $spacing-md $spacing-lg;
  }
}

// 响应式
@media (max-width: 1200px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: $spacing-md;
  }

  .welcome-time {
    text-align: center;
  }

  .stat-cards {
    grid-template-columns: 1fr;
  }

  .info-section {
    grid-template-columns: 1fr;
  }
}
</style>
