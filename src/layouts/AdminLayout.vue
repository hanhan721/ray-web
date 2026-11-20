<script setup lang="ts">
import type { Component } from 'vue'
import { computed, nextTick, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Activity,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  LayoutGrid,
  List,
  Menu,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ErrorHistory from './components/ErrorHistory.vue'
import NavTree from './components/NavTree.vue'
import TopNav from './components/TopNav.vue'
import { findNavigationTrail } from './navigation'
import type { NavNode } from '@/router/menu-routes'
import { removeRouteNames } from '@/router/menu-install'
import { useSessionStore } from '@/stores/session'

const icons: Record<string, Component> = {
  SettingsOutline: Settings,
  PeopleOutline: Users,
  ShieldOutline: Shield,
  AppsOutline: LayoutGrid,
  ListOutline: List,
  MenuOutline: Menu,
  DeptOutline: Building2,
  DictOutline: BookOpen,
  ParamOutline: SlidersHorizontal,
  OnlineOutline: Activity,
  DocumentOutline: FileText,
  CalendarOutline: Calendar,
}

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const { displayName, navigation } = storeToRefs(session)
const navOpen = shallowRef(false)
const openGroups = shallowRef<Set<number>>(new Set())
const activeTrail = computed(() => findNavigationTrail(navigation.value, route.path))
const activeModule = computed(() => activeTrail.value[0])
const secondaryNodes = computed(() =>
  activeModule.value?.kind === 'group' ? activeModule.value.items : [],
)
const sidebarOpen = computed(() => secondaryNodes.value.length > 0)
const displayedNodes = shallowRef<NavNode[]>([])
const displayedTitle = shallowRef('')
const sidebarTrack = useTemplateRef<HTMLElement>('sidebarTrack')
let sidebarReleaseTimer = 0

watch(
  secondaryNodes,
  (nodes) => {
    if (nodes.length === 0) return
    displayedNodes.value = nodes
    displayedTitle.value = activeModule.value?.title ?? ''
  },
  { immediate: true },
)

function releaseClosedSidebar() {
  window.clearTimeout(sidebarReleaseTimer)
  sidebarReleaseTimer = 0
  if (sidebarOpen.value) return
  displayedNodes.value = []
  displayedTitle.value = ''
}

function onSidebarTransitionEnd(event: TransitionEvent) {
  if (event.target !== event.currentTarget) return
  if (event.propertyName !== 'grid-template-columns') return
  releaseClosedSidebar()
}

watch(sidebarOpen, (open) => {
  window.clearTimeout(sidebarReleaseTimer)
  if (open) return
  if (sidebarTrack.value?.contains(document.activeElement)) {
    document.getElementById('main')?.focus()
  }
  sidebarReleaseTimer = window.setTimeout(releaseClosedSidebar, 560)
})

onUnmounted(() => {
  window.clearTimeout(sidebarReleaseTimer)
})

const activeAncestors = computed(
  () => new Set(activeTrail.value.filter((node) => node.kind === 'group').map((node) => node.id)),
)

function toggleGroup(id: number) {
  const next = new Set(openGroups.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openGroups.value = next
}

watch(
  activeAncestors,
  (ancestors) => {
    openGroups.value = new Set([...openGroups.value, ...ancestors])
  },
  { immediate: true },
)

async function closeMobileNav() {
  if (!navOpen.value) return
  navOpen.value = false
  await nextTick()
  document.getElementById('main')?.focus()
}

watch(() => route.fullPath, closeMobileNav)

async function onLogout() {
  const names = await session.logout()
  removeRouteNames(router, names)
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="app-shell bg-background text-foreground min-h-svh">
    <a
      href="#main"
      class="bg-background sr-only rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2"
    >
      跳到主要内容
    </a>
    <header class="app-header">
      <div class="brand-region">
        <RouterLink
          to="/"
          class="app-brand flex items-center gap-3 rounded-md text-base font-semibold outline-none focus-visible:ring-2"
        >
          <span class="brand-mark" aria-hidden="true">R</span>
          <span>Ray <span class="brand-subtitle">管理平台</span></span>
        </RouterLink>
      </div>
      <TopNav
        class="app-top-nav"
        :nodes="navigation"
        :active-id="activeModule?.id"
        :home-active="route.name === 'home'"
        :icons="icons"
      />
      <div class="app-user flex items-center gap-1">
        <p class="app-user-name text-muted-foreground truncate text-sm" :title="displayName">
          {{ displayName }}
        </p>
        <ErrorHistory />
        <ThemeToggle />
        <Button type="button" variant="outline" size="sm" @click="onLogout">退出</Button>
      </div>
    </header>
    <div
      class="app-body"
      :class="{ 'has-sidebar': sidebarOpen }"
      @transitionend="onSidebarTransitionEnd"
    >
      <div
        ref="sidebarTrack"
        class="sidebar-track"
        :inert="!sidebarOpen"
        :aria-hidden="sidebarOpen ? undefined : 'true'"
      >
        <aside class="app-sidebar" aria-label="子菜单">
          <div class="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
            <span class="truncate text-sm font-medium">{{ displayedTitle }}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :aria-expanded="navOpen"
              aria-controls="app-nav"
              @click="navOpen = !navOpen"
            >
              <Menu aria-hidden="true" />
              {{ navOpen ? '收起子菜单' : '展开子菜单' }}
            </Button>
          </div>
          <nav
            id="app-nav"
            class="secondary-nav"
            :class="navOpen ? 'block' : 'hidden md:block'"
            :aria-label="displayedTitle ? `${displayedTitle}子菜单` : '子菜单'"
            @keydown.esc="closeMobileNav"
          >
            <NavTree
              class="px-3 pb-4 md:pt-4"
              :nodes="displayedNodes"
              :open="openGroups"
              :active-ancestors="activeAncestors"
              :icons="icons"
              :depth="0"
              @toggle="toggleGroup"
              @navigate="closeMobileNav"
            />
          </nav>
        </aside>
      </div>
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
.app-shell {
  --app-header-height: 4rem;
  --app-sidebar-width: 13rem;
}
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 2rem;
  height: var(--app-header-height);
  padding-inline: 1.5rem;
  background: var(--card);
  border-bottom: 1px solid var(--border);
}
.app-brand {
  white-space: nowrap;
}
.app-user-name {
  max-width: 10rem;
  margin-right: 0.5rem;
}
.app-body {
  min-height: calc(100svh - var(--app-header-height));
}
.sidebar-track {
  min-width: 0;
  background: var(--sidebar);
  color: var(--sidebar-foreground);
}
.app-sidebar {
  min-width: 0;
  background: var(--sidebar);
  color: var(--sidebar-foreground);
  border-bottom: 1px solid var(--sidebar-border);
}
.secondary-nav {
  max-height: calc(100svh - var(--app-header-height) - 4rem);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.brand-mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 0.55rem;
  background: var(--sidebar-accent);
  color: var(--sidebar-primary);
  font-weight: 700;
}
.brand-subtitle {
  color: var(--muted-foreground);
  font-size: 0.75rem;
  font-weight: 400;
}

@media (min-width: 768px) {
  .app-header {
    grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr) auto;
    gap: 0;
    padding-left: 0;
  }
  .brand-region {
    display: flex;
    align-self: stretch;
    align-items: center;
    padding-inline: 1.5rem;
    background: var(--sidebar);
  }
  .app-top-nav {
    margin-left: 1rem;
  }
  .app-user {
    margin-left: 1rem;
  }
  .app-body {
    display: grid;
    grid-template-columns: 0rem minmax(0, 1fr);
    transition: grid-template-columns 380ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .app-body.has-sidebar {
    grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr);
  }
  .sidebar-track {
    position: sticky;
    top: var(--app-header-height);
    height: calc(100svh - var(--app-header-height));
    align-self: start;
    overflow: hidden;
    box-shadow: inset -1px 0 0 var(--sidebar-border);
  }
  .app-sidebar {
    width: var(--app-sidebar-width);
    height: 100%;
    border-bottom: 0;
    opacity: 0;
    transition: opacity 160ms ease;
  }
  .app-body.has-sidebar .app-sidebar {
    opacity: 1;
    transition: opacity 180ms ease 100ms;
  }
  .secondary-nav {
    max-height: 100%;
  }
}

@media (max-width: 1023px) {
  .app-header {
    gap: 1rem;
    padding-right: 1rem;
  }
  .brand-subtitle {
    display: none;
  }
  .app-user-name {
    max-width: 5rem;
  }
}

@media (max-width: 767px) {
  .app-shell {
    --app-header-height: 7rem;
  }
  .app-body:not(.has-sidebar) .sidebar-track {
    display: none;
  }
  .app-header {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 4rem minmax(0, 1fr);
    gap: 0;
    padding-left: 1rem;
  }
  .brand-region {
    justify-self: start;
  }
  .app-user {
    grid-column: 2;
    grid-row: 1;
  }
  .app-top-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    align-self: stretch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-body,
  .app-body.has-sidebar .app-sidebar,
  .app-sidebar {
    transition: none;
  }
}
</style>
