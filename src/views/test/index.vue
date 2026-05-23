<template>
  <div class="test-index">
    <NCard title="组件测试中心">
      <NGrid :cols="2" :x-gap="16" :y-gap="16">
        <NGridItem v-for="item in testPages" :key="item.path">
          <NCard hoverable @click="router.push(item.path)">
            <div class="test-card">
              <NIcon size="32" :color="item.color">
                <component :is="item.icon" />
              </NIcon>
              <div class="test-info">
                <div class="test-title">
                  {{ item.title }}
                </div>
                <div class="test-desc">
                  {{ item.desc }}
                </div>
              </div>
            </div>
          </NCard>
        </NGridItem>
      </NGrid>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import {
  BookOutline,
  ShieldCheckmarkOutline,
  GridOutline,
  AppsOutline,
} from '@vicons/ionicons5'

defineOptions({
  name: 'TestIndex',
})

const router = useRouter()

const testPages = [
  {
    path: '/test/dict',
    title: '字典组件测试',
    desc: '测试字典选择器、字典标签等组件',
    icon: BookOutline,
    color: '#18a058',
  },
  {
    path: '/test/permission',
    title: '权限组件测试',
    desc: '测试权限指令、权限树选择器等',
    icon: ShieldCheckmarkOutline,
    color: '#2080f0',
  },
  {
    path: '/test/pro-table',
    title: 'ProTable 组件测试',
    desc: '测试高级表格组件',
    icon: GridOutline,
    color: '#f0a020',
  },
  {
    path: '/test/p2-component',
    title: 'P2 组件测试',
    desc: '测试 P2 增强组件',
    icon: AppsOutline,
    color: '#d03050',
  },
]
</script>

<style scoped lang="scss">
.test-index {
  padding: $spacing-lg;
}

.test-card {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  cursor: pointer;

  .test-info {
    flex: 1;

    .test-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .test-desc {
      font-size: 13px;
      color: var(--n-text-color-3);
    }
  }
}
</style>
