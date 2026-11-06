<script setup lang="ts">
import type { Component } from 'vue'
import { computed, nextTick, shallowRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Calendar, FileText, LayoutGrid, List, Settings, Shield, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { removeRouteNames } from '@/router/menu-install'
import { useSessionStore } from '@/stores/session'

const icons: Record<string, Component> = {
  SettingsOutline: Settings,
  PeopleOutline: Users,
  ShieldOutline: Shield,
  AppsOutline: LayoutGrid,
  ListOutline: List,
  DocumentOutline: FileText,
  CalendarOutline: Calendar,
}

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const { displayName, navigation } = storeToRefs(session)
const navOpen = shallowRef(false)

const sectionTitle = computed(() => {
  const matched = [...route.matched]
    .reverse()
    .find((record) => typeof record.meta.title === 'string')
  return matched?.meta.title ?? '工作台'
})

watch(
  () => route.fullPath,
  async () => {
    const menuWasOpen = navOpen.value
    navOpen.value = false
    if (!menuWasOpen) return
    await nextTick()
    document.getElementById('main')?.focus()
  },
)

function iconFor(name?: string): Component | null {
  if (!name) return null
  return icons[name] ?? null
}

async function onLogout() {
  const names = await session.logout()
  removeRouteNames(router, names)
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="bg-background text-foreground min-h-svh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
    <a
      href="#main"
      class="bg-background sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2"
    >
      跳到主要内容
    </a>
    <aside class="border-border bg-sidebar md:min-h-svh md:border-r">
      <div class="flex items-center justify-between px-3 py-3 md:py-4">
        <RouterLink
          to="/"
          class="text-sm font-medium focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2"
        >
          Ray
        </RouterLink>
        <Button
          class="md:hidden"
          type="button"
          variant="outline"
          size="sm"
          :aria-expanded="navOpen"
          aria-controls="app-nav"
          @click="navOpen = !navOpen"
        >
          菜单
        </Button>
      </div>
      <nav id="app-nav" :class="navOpen ? 'block' : 'hidden md:block'" aria-label="主导航">
        <ul class="flex flex-col gap-1 px-2 pb-4">
          <li v-for="node in navigation" :key="`${node.kind}-${node.id}`">
            <RouterLink
              v-if="node.kind === 'item'"
              :to="node.to"
              class="text-sidebar-foreground focus-visible:ring-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
              exact-active-class="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <component :is="iconFor(node.icon)" v-if="iconFor(node.icon)" />
              <span class="truncate">{{ node.title }}</span>
            </RouterLink>
            <div v-else class="pt-2">
              <p class="text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs">
                <component :is="iconFor(node.icon)" v-if="iconFor(node.icon)" />
                <span class="truncate">{{ node.title }}</span>
              </p>
              <ul class="flex flex-col gap-0.5">
                <li v-for="item in node.items" :key="item.id">
                  <RouterLink
                    :to="item.to"
                    class="text-sidebar-foreground focus-visible:ring-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none focus-visible:ring-2"
                    exact-active-class="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <component :is="iconFor(item.icon)" v-if="iconFor(item.icon)" />
                    <span class="truncate">{{ item.title }}</span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </nav>
    </aside>
    <div class="flex min-w-0 flex-col">
      <header
        class="border-border bg-background sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b px-4"
      >
        <p class="truncate text-sm font-medium">{{ sectionTitle }}</p>
        <div class="flex items-center gap-2">
          <p class="text-muted-foreground max-w-40 truncate text-sm">{{ displayName }}</p>
          <Button type="button" variant="outline" size="sm" @click="onLogout">退出</Button>
        </div>
      </header>
      <main id="main" tabindex="-1" class="min-w-0 flex-1 p-4 outline-none">
        <RouterView v-slot="{ Component: view, route: matched }">
          <KeepAlive>
            <component :is="view" v-if="matched.meta.keepAlive" :key="String(matched.name)" />
          </KeepAlive>
          <component :is="view" v-if="!matched.meta.keepAlive" :key="String(matched.name)" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
