<template>
  <NBreadcrumb v-if="breadcrumbs.length > 0">
    <NBreadcrumbItem
      v-for="(item, index) in breadcrumbs"
      :key="item.path"
    >
      <!-- 首页可点击跳转 -->
      <RouterLink v-if="item.isHome && item.path !== route.path" :to="item.path!">
        {{ item.title }}
      </RouterLink>
      <!-- 叶子节点（当前页面）不可点击 -->
      <span v-else-if="index === breadcrumbs.length - 1" class="breadcrumb-current">
        {{ item.title }}
      </span>
      <!-- 中间的菜单目录，不跳转，仅显示 -->
      <span v-else class="breadcrumb-menu">
        {{ item.title }}
      </span>
    </NBreadcrumbItem>
  </NBreadcrumb>
</template>

<script setup lang="ts">
defineOptions({
  name: 'Breadcrumb',
})

interface BreadcrumbItem {
  title: string
  path?: string
  isHome?: boolean // 是否是首页
}

const route = useRoute()

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const matched = route.matched.filter((r: { meta?: { title?: string } }) => r.meta?.title)
  const items: BreadcrumbItem[] = []

  // 添加首页
  if (route.name !== 'Dashboard') {
    items.push({ title: '首页', path: '/dashboard', isHome: true })
  }

  // 添加匹配的路由
  for (const r of matched) {
    if (r.meta?.title) {
      items.push({
        title: r.meta.title as string,
        path: r.path,
        isHome: false,
      })
    }
  }

  return items
})
</script>

<style scoped lang="scss">
.breadcrumb-current {
  color: var(--text-color-primary);
  font-weight: 500;
}

.breadcrumb-menu {
  color: var(--text-color-secondary);
  cursor: default;
}
</style>
