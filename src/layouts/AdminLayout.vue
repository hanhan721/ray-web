<script setup lang="ts">
import type { Component } from 'vue'
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Activity,
  BookOpen,
  Building2,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
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
import PageTabs from './components/PageTabs.vue'
import TopNav from './components/TopNav.vue'
import { findNavigationTrail } from './navigation'
import type { NavNode } from '@/router/menu-routes'
import { removeRouteNames } from '@/router/menu-install'
import { useSessionStore } from '@/stores/session'
import { useTabsStore } from '@/stores/tabs'

const SIDEBAR_PIN_KEY = 'ray.sidebar-pinned'
const SIDEBAR_LEAVE_MS = 120
const TAB_EXCLUDED_ROUTES = new Set(['home', 'forbidden', 'denied', 'not-found'])

function readSidebarPinned(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    return localStorage.getItem(SIDEBAR_PIN_KEY) !== '0'
  } catch {
    return true
  }
}

function writeSidebarPinned(pinned: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SIDEBAR_PIN_KEY, pinned ? '1' : '0')
  } catch {
    // 隐私模式或存储不可用时保持当前页面状态即可。
  }
}

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
const tabs = useTabsStore()
const { displayName, navigation } = storeToRefs(session)
const navOpen = shallowRef(false)
const sidebarPinned = shallowRef(readSidebarPinned())
const pointerInside = shallowRef(false)
const openGroups = shallowRef<Set<number>>(new Set())
const activeTrail = computed(() => findNavigationTrail(navigation.value, route.path))
const activeModule = computed(() => activeTrail.value[0])

watch(
  () => route.fullPath,
  () => {
    const name = typeof route.name === 'string' ? route.name : ''
    const title = route.meta.title
    if (!name || !title || TAB_EXCLUDED_ROUTES.has(name)) return
    tabs.openTab({
      path: route.path,
      fullPath: route.fullPath,
      name,
      title,
      keepAlive: route.meta.keepAlive === true,
    })
  },
  { immediate: true },
)
const secondaryNodes = computed(() =>
  activeModule.value?.kind === 'group' ? activeModule.value.items : [],
)
const sidebarOpen = computed(() => secondaryNodes.value.length > 0)
const sidebarRevealed = computed(() => sidebarPinned.value || pointerInside.value)
const sidebarPinLabel = computed(() => (sidebarPinned.value ? '收起侧栏' : '展开侧栏'))
const displayedNodes = shallowRef<NavNode[]>([])
const displayedTitle = shallowRef('')
const viewRefreshKeys = shallowRef<Record<string, number>>({})
const sidebarTrack = useTemplateRef<HTMLElement>('sidebarTrack')
let sidebarReleaseTimer = 0
let sidebarCollapseTimer = 0

function refreshView(name: string) {
  viewRefreshKeys.value = {
    ...viewRefreshKeys.value,
    [name]: (viewRefreshKeys.value[name] ?? 0) + 1,
  }
}

function viewKey(name: unknown): string {
  const key = String(name)
  return `${key}:${viewRefreshKeys.value[key] ?? 0}`
}

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
  pointerInside.value = false
  if (sidebarTrack.value?.contains(document.activeElement)) {
    document.getElementById('main')?.focus()
  }
  sidebarReleaseTimer = window.setTimeout(releaseClosedSidebar, 320)
})

watch(sidebarPinned, (pinned) => {
  writeSidebarPinned(pinned)
})

function clearSidebarCollapseTimer() {
  window.clearTimeout(sidebarCollapseTimer)
  sidebarCollapseTimer = 0
}

function onSidebarPointerEnter(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  clearSidebarCollapseTimer()
  pointerInside.value = true
}

function onSidebarPointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  clearSidebarCollapseTimer()
  sidebarCollapseTimer = window.setTimeout(() => {
    sidebarCollapseTimer = 0
    pointerInside.value = false
  }, SIDEBAR_LEAVE_MS)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  const target = event.target
  pointerInside.value = target instanceof Node && !!sidebarTrack.value?.contains(target)
}

function toggleSidebarPinned() {
  sidebarPinned.value = !sidebarPinned.value
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  clearSidebarCollapseTimer()
  window.clearTimeout(sidebarReleaseTimer)
  tabs.reset()
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
  <div
    class="app-shell bg-background text-foreground min-h-svh"
    :class="{ 'has-sidebar': sidebarOpen, 'is-pinned': sidebarOpen && sidebarPinned }"
  >
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
          class="app-brand rounded-md text-base font-semibold outline-none focus-visible:ring-2"
        >
          <span class="brand-mark" aria-hidden="true">R</span>
          <span class="brand-name">Ray <span class="brand-subtitle">管理平台</span></span>
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
    <div class="app-body" @transitionend="onSidebarTransitionEnd">
      <div
        ref="sidebarTrack"
        class="sidebar-track"
        :inert="!sidebarOpen"
        :aria-hidden="sidebarOpen ? undefined : 'true'"
        @pointerenter="onSidebarPointerEnter"
        @pointerleave="onSidebarPointerLeave"
      >
        <aside class="app-sidebar" :class="{ 'is-revealed': sidebarRevealed }" aria-label="子菜单">
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
              class="pb-2 md:pt-2"
              :nodes="displayedNodes"
              :open="openGroups"
              :active-ancestors="activeAncestors"
              :icons="icons"
              :depth="0"
              @toggle="toggleGroup"
              @navigate="closeMobileNav"
            />
          </nav>
          <div class="sidebar-footer">
            <button
              type="button"
              class="sidebar-pin"
              :aria-pressed="sidebarPinned"
              :aria-label="sidebarPinLabel"
              :title="sidebarPinLabel"
              @click="toggleSidebarPinned"
            >
              <ChevronLeft v-if="sidebarPinned" class="size-4" aria-hidden="true" />
              <ChevronRight v-else class="size-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
      <div class="app-content">
        <PageTabs @refresh="refreshView" />
        <main id="main" tabindex="-1" class="min-w-0 flex-1 p-4 outline-none md:p-6">
          <RouterView v-slot="{ Component: view, route: matched }">
            <KeepAlive>
              <component :is="view" v-if="matched.meta.keepAlive" :key="viewKey(matched.name)" />
            </KeepAlive>
            <component :is="view" v-if="!matched.meta.keepAlive" :key="viewKey(matched.name)" />
          </RouterView>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  --app-header-height: 4rem;
  --app-sidebar-width: 13rem;
  --app-sidebar-rail: 4rem;
  --app-sidebar-inset: 0.5rem;
  --app-nav-icon: calc(var(--app-sidebar-rail) - 2 * var(--app-sidebar-inset));
  --app-sidebar-motion: 200ms cubic-bezier(0.2, 0, 0, 1);
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
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}
.app-user-name {
  max-width: 10rem;
  margin-right: 0.5rem;
}
.app-body {
  min-height: calc(100svh - var(--app-header-height));
}
.app-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.sidebar-track {
  position: relative;
  z-index: 15;
  min-width: 0;
  background: var(--sidebar);
  color: var(--sidebar-foreground);
}
.app-sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
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
.sidebar-footer {
  display: none;
}
.sidebar-pin {
  display: grid;
  width: var(--app-nav-icon);
  height: 2.5rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--sidebar-foreground);
  cursor: pointer;
}
.sidebar-pin:hover {
  background: var(--muted);
}
.sidebar-pin:focus-visible {
  outline: 2px solid var(--sidebar-primary);
  outline-offset: -2px;
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
.brand-name {
  min-width: 0;
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
    transition: grid-template-columns var(--app-sidebar-motion);
  }
  .app-shell.has-sidebar:not(.is-pinned) .app-header {
    grid-template-columns: var(--app-sidebar-rail) minmax(0, 1fr) auto;
  }
  .brand-region {
    display: flex;
    align-self: stretch;
    align-items: center;
    min-width: 0;
    padding-inline: 0;
    overflow: hidden;
    background: var(--sidebar);
  }
  .app-brand {
    display: grid;
    grid-template-columns: var(--app-sidebar-rail) max-content;
    align-items: center;
    gap: 0;
    height: 100%;
  }
  .brand-mark {
    margin-inline: auto;
  }
  .brand-name {
    padding-right: 1rem;
    transition: opacity 120ms ease;
  }
  .app-shell.has-sidebar:not(.is-pinned) .brand-name {
    opacity: 0;
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
    transition: grid-template-columns var(--app-sidebar-motion);
  }
  .app-shell.has-sidebar .app-body {
    grid-template-columns: var(--app-sidebar-rail) minmax(0, 1fr);
  }
  .app-shell.has-sidebar.is-pinned .app-body {
    grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr);
  }
  .sidebar-track {
    position: sticky;
    top: var(--app-header-height);
    height: calc(100svh - var(--app-header-height));
    align-self: start;
    overflow: hidden;
  }
  .app-shell.has-sidebar .sidebar-track {
    overflow: visible;
  }
  .app-sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 0;
    height: auto;
    overflow: hidden;
    border-bottom: 0;
    border-right: 1px solid var(--sidebar-border);
    opacity: 0;
    transition:
      width var(--app-sidebar-motion),
      opacity 160ms ease,
      box-shadow var(--app-sidebar-motion);
  }
  .app-shell.has-sidebar .app-sidebar {
    width: var(--app-sidebar-rail);
    opacity: 1;
  }
  .app-shell.has-sidebar .app-sidebar.is-revealed,
  .app-shell.has-sidebar .app-sidebar:has(:focus-visible) {
    width: var(--app-sidebar-width);
  }
  .app-shell.has-sidebar:not(.is-pinned) .app-sidebar.is-revealed,
  .app-shell.has-sidebar:not(.is-pinned) .app-sidebar:has(:focus-visible) {
    box-shadow: 8px 0 28px oklch(0.28 0.02 230 / 0.14);
  }
  .dark .app-shell.has-sidebar:not(.is-pinned) .app-sidebar.is-revealed,
  .dark .app-shell.has-sidebar:not(.is-pinned) .app-sidebar:has(:focus-visible) {
    box-shadow: 8px 0 28px oklch(0 0 0 / 0.45);
  }
  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-group) {
    grid-template-rows: 0fr;
    opacity: 0;
  }
  .app-sidebar :deep(.nav-label) {
    transition: opacity 120ms ease;
  }
  .app-sidebar :deep(.nav-chevron) {
    transition:
      opacity 120ms ease,
      transform 200ms ease;
  }
  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-label),
  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-chevron) {
    opacity: 0;
  }
  .secondary-nav {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
  }
  .sidebar-footer {
    display: block;
    flex-shrink: 0;
    margin-top: auto;
    padding: 0.5rem var(--app-sidebar-inset);
    border-top: 1px solid var(--sidebar-border);
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
    --app-sidebar-rail: 2.75rem;
  }
  .app-shell:not(.has-sidebar) .sidebar-track {
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
  .app-header,
  .app-body,
  .app-sidebar,
  .brand-name {
    transition: none;
  }
  .app-sidebar :deep(.nav-label),
  .app-sidebar :deep(.nav-chevron) {
    transition: none;
  }
}
</style>
