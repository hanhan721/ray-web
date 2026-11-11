<script setup lang="ts">
import type { Component } from 'vue'
import { computed, nextTick, shallowRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Calendar, FileText, LayoutGrid, List, Settings, Shield, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
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
  <div class="app-shell bg-background text-foreground min-h-svh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
    <a
      href="#main"
      class="bg-background sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2"
    >
      跳到主要内容
    </a>
    <aside class="app-sidebar md:min-h-svh md:border-r">
      <div class="flex items-center justify-between px-5 py-5">
        <RouterLink
          to="/"
          class="flex items-center gap-3 rounded-md text-base font-semibold outline-none focus-visible:ring-2"
        >
          <span class="brand-mark" aria-hidden="true">R</span>
          <span>Ray <span class="brand-subtitle">管理平台</span></span>
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
        <ul class="flex flex-col gap-1 px-3 pb-4">
          <li v-for="node in navigation" :key="`${node.kind}-${node.id}`">
            <RouterLink
              v-if="node.kind === 'item'"
              :to="node.to"
              class="nav-link"
              exact-active-class="nav-link-active"
            >
              <component
                :is="iconFor(node.icon)"
                v-if="iconFor(node.icon)"
                class="size-4 shrink-0"
              />
              <span class="truncate">{{ node.title }}</span>
            </RouterLink>
            <div v-else class="pt-2">
              <p class="nav-heading flex items-center gap-2 px-3 py-2">
                <component
                  :is="iconFor(node.icon)"
                  v-if="iconFor(node.icon)"
                  class="size-3.5 shrink-0"
                />
                <span class="truncate">{{ node.title }}</span>
              </p>
              <ul class="flex flex-col gap-0.5">
                <li v-for="item in node.items" :key="item.id">
                  <RouterLink
                    :to="item.to"
                    class="nav-link"
                    exact-active-class="nav-link-active"
                  >
                    <component
                      :is="iconFor(item.icon)"
                      v-if="iconFor(item.icon)"
                      class="size-4 shrink-0"
                    />
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
        class="app-header sticky top-0 z-10 flex h-16 items-center justify-between gap-3 px-5 md:px-8"
      >
        <p class="truncate text-sm font-semibold">{{ sectionTitle }}</p>
        <div class="flex items-center gap-1">
          <p class="text-muted-foreground max-w-40 truncate text-sm">{{ displayName }}</p>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm" @click="onLogout">退出</Button>
        </div>
      </header>
      <main id="main" tabindex="-1" class="min-w-0 flex-1 p-4 outline-none md:p-6">
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

<style scoped>
.app-sidebar { background: var(--sidebar); color: var(--sidebar-foreground); border-color: var(--sidebar-border); }
.brand-mark { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: 0.55rem; background: var(--sidebar-accent); color: var(--sidebar-primary); font-weight: 700; }
.brand-subtitle { color: var(--muted-foreground); font-size: 0.75rem; font-weight: 400; }
.nav-heading { color: var(--muted-foreground); font-size: 0.75rem; }
.nav-link { display: flex; align-items: center; gap: 0.75rem; min-height: 2.5rem; padding: 0.5rem 0.75rem; border-radius: 0.5rem; color: var(--sidebar-foreground); font-size: 0.875rem; outline: none; }
.nav-link:hover { background: var(--muted); }
.nav-link:focus-visible { outline: 2px solid var(--sidebar-primary); outline-offset: 2px; }
.nav-link-active, .nav-link-active:hover { background: var(--sidebar-accent); color: var(--sidebar-primary); font-weight: 600; }
.app-header { background: var(--card); border-bottom: 1px solid var(--border); }
</style>
