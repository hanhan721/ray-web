<template>
  <div
    class="app-shell"
    :class="{
      'sidebar-inverted': sidebarInverted,
      'has-sidebar': sidebarOpen,
      'is-pinned': sidebarOpen && sidebarPinned,
    }"
  >
    <a href="#main" class="skip-link">跳到主要内容</a>
    <header class="app-header">
      <div class="brand-region">
        <RouterLink to="/dashboard" class="app-brand">
          <span class="brand-mark" aria-hidden="true">R</span>
          <span class="brand-name">
            Ray
            <span class="brand-subtitle">管理平台</span>
          </span>
        </RouterLink>
      </div>
      <TopNav
        class="app-top-nav"
        :nodes="modules"
        :active-id="homeActive ? undefined : activeModule?.id"
        :home-active="homeActive"
      />
      <div class="app-user">
        <p class="app-user-name" :title="displayName">
          {{ displayName }}
        </p>
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton quaternary circle aria-label="切换主题" @click="appStore.toggleTheme">
              <template #icon>
                <NIcon :component="appStore.isDarkMode ? SunnyOutline : MoonOutline" />
              </template>
            </NButton>
          </template>
          {{ appStore.isDarkMode ? '切换亮色模式' : '切换暗色模式' }}
        </NTooltip>
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton quaternary circle aria-label="系统设置" @click="appStore.openSettingDrawer">
              <template #icon>
                <NIcon :component="SettingsOutline" />
              </template>
            </NButton>
          </template>
          系统设置
        </NTooltip>
        <NButton secondary size="small" @click="onLogout">
          退出
        </NButton>
      </div>
    </header>

    <div class="app-body" @transitionend="onSidebarTransitionEnd">
      <div
        ref="sidebarTrackRef"
        class="sidebar-track"
        :inert="sidebarOpen ? undefined : true"
        :aria-hidden="sidebarOpen ? undefined : 'true'"
        @pointerenter="onSidebarPointerEnter"
        @pointerleave="onSidebarPointerLeave"
      >
        <aside class="app-sidebar" :class="{ 'is-revealed': sidebarRevealed }" aria-label="子菜单">
          <div class="sidebar-mobile-bar">
            <span class="sidebar-mobile-title">{{ displayedTitle }}</span>
            <NButton
              quaternary
              size="small"
              :aria-expanded="navOpen"
              aria-controls="app-nav"
              @click="navOpen = !navOpen"
            >
              <template #icon>
                <NIcon :component="MenuOutline" />
              </template>
              {{ navOpen ? '收起子菜单' : '展开子菜单' }}
            </NButton>
          </div>
          <nav
            id="app-nav"
            class="secondary-nav"
            :class="{ 'is-open': navOpen }"
            :aria-label="displayedTitle ? `${displayedTitle}子菜单` : '子菜单'"
            @keydown.esc="closeMobileNav"
          >
            <NavTree
              class="nav-tree-root"
              :nodes="displayedNodes"
              :open="openGroups"
              :active-ancestors="activeAncestors"
              :depth="0"
              @toggle="toggleGroup"
              @navigate="closeMobileNav"
            />
          </nav>
          <div class="sidebar-foot">
            <NButton
              quaternary
              class="sidebar-mode"
              :aria-pressed="sidebarPinned"
              :aria-label="sidebarPinLabel"
              :title="sidebarPinLabel"
              @click="toggleSidebarPinned"
            >
              <template #icon>
                <NIcon :component="sidebarPinned ? ChevronBackOutline : ChevronForwardOutline" />
              </template>
            </NButton>
          </div>
        </aside>
      </div>
      <div class="app-content">
        <div v-if="appStore.themeConfig.showTabs" class="app-tabs">
          <TabsView />
        </div>
        <AppMain />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronBackOutline, ChevronForwardOutline, MenuOutline, MoonOutline, SettingsOutline, SunnyOutline } from '@vicons/ionicons5'
import TabsView from '@/components/common/TabsView/index.vue'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'
import { useUserStore } from '@/stores/user'
import AppMain from './components/AppMain.vue'
import NavTree from './components/NavTree.vue'
import TopNav from './components/TopNav.vue'
import { buildNavigation, findNavigationTrail, siblingGroupIds, type NavNode } from './navigation'

defineOptions({
  name: 'AdminLayout',
})

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const permissionStore = usePermissionStore()
const tabsStore = useTabsStore()
const userStore = useUserStore()
const dialog = useDialog()

const SIDEBAR_PIN_KEY = 'ray.sidebar-pinned'
const SIDEBAR_LEAVE_MS = 120

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
    // 隐私模式或存储不可用时保持当前页面状态即可
  }
}

const navOpen = shallowRef(false)
const sidebarPinned = shallowRef(readSidebarPinned())
const pointerInside = shallowRef(false)
const openGroups = shallowRef<Set<number>>(new Set())
const sidebarTrackRef = ref<HTMLElement | null>(null)
const displayedNodes = shallowRef<NavNode[]>([])
const displayedTitle = shallowRef('')
let sidebarReleaseTimer = 0
let sidebarCollapseTimer = 0

const displayName = computed(() => userStore.nickname || userStore.username || '未登录')
const sidebarInverted = computed(() => appStore.themeConfig.menuTheme === 'dark' && !appStore.isDarkMode)
const navigation = computed(() => buildNavigation(permissionStore.visibleMenus))
const modules = computed(() => navigation.value.filter((node) => !(node.kind === 'item' && node.to === '/dashboard')))
const homeActive = computed(() => route.name === 'Dashboard' || route.path === '/dashboard')
const activeTrail = computed(() => (homeActive.value ? [] : findNavigationTrail(navigation.value, route.path)))
const activeModule = computed(() => activeTrail.value[0])
const secondaryNodes = computed(() => (activeModule.value?.kind === 'group' ? activeModule.value.items : []))
const sidebarOpen = computed(() => secondaryNodes.value.length > 0)
const sidebarRevealed = computed(() => sidebarPinned.value || pointerInside.value)
const sidebarPinLabel = computed(() => (sidebarPinned.value ? '收起侧栏' : '展开侧栏'))
const activeAncestors = computed(
  () => new Set(activeTrail.value.filter((node) => node.kind === 'group').map((node) => node.id))
)

watch(
  secondaryNodes,
  (nodes) => {
    if (nodes.length === 0) return
    displayedNodes.value = nodes
    displayedTitle.value = activeModule.value?.title ?? ''
  },
  { immediate: true }
)

function releaseClosedSidebar() {
  window.clearTimeout(sidebarReleaseTimer)
  sidebarReleaseTimer = 0
  if (sidebarOpen.value) return
  displayedNodes.value = []
  displayedTitle.value = ''
}

function onSidebarTransitionEnd(event: Event) {
  if (event.target !== event.currentTarget) return
  if (!('propertyName' in event) || event.propertyName !== 'grid-template-columns') return
  releaseClosedSidebar()
}

watch(sidebarOpen, (open) => {
  window.clearTimeout(sidebarReleaseTimer)
  clearSidebarCollapseTimer()
  if (open) return
  pointerInside.value = false
  if (sidebarTrackRef.value?.contains(document.activeElement)) {
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

function isTouchPointer(event: Event): boolean {
  return 'pointerType' in event && event.pointerType === 'touch'
}

function onSidebarPointerEnter(event: Event) {
  if (isTouchPointer(event)) return
  clearSidebarCollapseTimer()
  pointerInside.value = true
}

function onSidebarPointerLeave(event: Event) {
  if (isTouchPointer(event)) return
  clearSidebarCollapseTimer()
  sidebarCollapseTimer = window.setTimeout(() => {
    sidebarCollapseTimer = 0
    pointerInside.value = false
  }, SIDEBAR_LEAVE_MS)
}

function onDocumentPointerDown(event: Event) {
  if (!isTouchPointer(event)) return
  const target = event.target
  pointerInside.value = target instanceof Node && !!sidebarTrackRef.value?.contains(target)
}

function toggleSidebarPinned() {
  sidebarPinned.value = !sidebarPinned.value
}

function toggleGroup(id: number) {
  const next = new Set(openGroups.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    if (appStore.themeConfig.menuAccordion) {
      for (const siblingId of siblingGroupIds(displayedNodes.value, id) ?? []) {
        next.delete(siblingId)
      }
    }
    next.add(id)
  }
  openGroups.value = next
}

async function closeMobileNav() {
  if (!navOpen.value) return
  navOpen.value = false
  await nextTick()
  document.getElementById('main')?.focus()
}

function onLogout() {
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
}

watch(
  activeAncestors,
  (ancestors) => {
    openGroups.value = new Set([...openGroups.value, ...ancestors])
  },
  { immediate: true }
)

watch(() => route.fullPath, closeMobileNav)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  clearSidebarCollapseTimer()
  window.clearTimeout(sidebarReleaseTimer)
})

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
.app-shell {
  --app-header-block: var(--header-height);
  --app-sidebar-width: var(--sidebar-width, 200px);
  --app-sidebar-rail: var(--sidebar-collapsed-width, 64px);
  --app-sidebar-inset: 8px;
  --app-nav-icon: calc(var(--app-sidebar-rail) - 2 * var(--app-sidebar-inset));
  --app-sidebar-motion: 200ms cubic-bezier(0.2, 0, 0, 1);
  --nav-sidebar-bg: var(--bg-color-container);
  --nav-sidebar-fg: var(--text-color-primary);
  --nav-sidebar-muted: var(--text-color-secondary);
  --nav-sidebar-hover: var(--bg-color-hover);
  --nav-sidebar-active: var(--primary-color-suppl);
  --nav-sidebar-border: var(--border-color);
  --nav-accent: var(--primary-color);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-color);
  color: var(--text-color-primary);

  &.sidebar-inverted {
    --nav-sidebar-bg: #001529;
    --nav-sidebar-fg: rgba(255, 255, 255, 0.85);
    --nav-sidebar-muted: rgba(255, 255, 255, 0.65);
    --nav-sidebar-hover: rgba(255, 255, 255, 0.08);
    --nav-sidebar-active: rgba(24, 144, 255, 0.22);
    --nav-sidebar-border: rgba(255, 255, 255, 0.12);
  }
}

.skip-link {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;

  &:focus {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 50;
    width: auto;
    height: auto;
    padding: 8px 12px;
    overflow: visible;
    clip: auto;
    background: var(--bg-color-container);
    border-radius: 6px;
    outline: 2px solid var(--primary-color);
  }
}

.app-header {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  flex: none;
  height: var(--app-header-block);
  padding-inline: 16px;
  background: var(--bg-color-container);
  border-bottom: 1px solid var(--border-color);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-color-primary);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: var(--primary-color-suppl);
  color: var(--primary-color);
  font-weight: 700;
}

.brand-name {
  min-width: 0;
}

.brand-subtitle {
  color: var(--text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}

.app-user {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-user-name {
  max-width: 10rem;
  margin: 0 8px 0 0;
  overflow: hidden;
  color: var(--text-color-secondary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.sidebar-track {
  position: relative;
  z-index: 15;
  min-width: 0;
  min-height: 0;
  background: var(--nav-sidebar-bg);
  color: var(--nav-sidebar-fg);
}

.app-sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  background: var(--nav-sidebar-bg);
  color: var(--nav-sidebar-fg);
  border-bottom: 1px solid var(--nav-sidebar-border);
}

.sidebar-mobile-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
}

.sidebar-mobile-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secondary-nav {
  display: none;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;

  &.is-open {
    display: block;
    max-height: min(24rem, 50vh);
  }
}

.sidebar-foot {
  display: none;
}

.app-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--bg-color);
}

.app-tabs {
  flex: none;
}

@media (min-width: 768px) {
  .app-header {
    grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr) auto;
    gap: 0;
    padding-left: 0;
    padding-right: 16px;
    transition: grid-template-columns var(--app-sidebar-motion);
  }

  .app-shell.has-sidebar:not(.is-pinned) .app-header {
    grid-template-columns: var(--app-sidebar-rail) minmax(0, 1fr) auto;
  }

  .brand-region {
    display: flex;
    align-items: center;
    align-self: stretch;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    background: var(--nav-sidebar-bg);
    box-shadow: inset -1px 0 0 var(--nav-sidebar-border);
  }

  .app-brand {
    display: grid;
    grid-template-columns: var(--app-sidebar-rail) max-content;
    align-items: center;
    gap: 0;
    height: 100%;
    color: var(--nav-sidebar-fg);
  }

  .brand-mark {
    margin-inline: auto;
  }

  .brand-name {
    padding-right: 16px;
    transition: opacity 120ms ease;
  }

  .app-shell.has-sidebar:not(.is-pinned) .brand-name {
    opacity: 0;
  }

  .app-top-nav {
    margin-left: 16px;
  }

  .app-user {
    margin-left: 12px;
  }

  .app-body {
    display: grid;
    grid-template-columns: 0px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    transition: grid-template-columns var(--app-sidebar-motion);
  }

  .app-shell.has-sidebar .app-body {
    grid-template-columns: var(--app-sidebar-rail) minmax(0, 1fr);
  }

  .app-shell.has-sidebar.is-pinned .app-body {
    grid-template-columns: var(--app-sidebar-width) minmax(0, 1fr);
  }

  .sidebar-track {
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
    border-right: 1px solid var(--nav-sidebar-border);
    border-bottom: 0;
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
    box-shadow: var(--box-shadow-md);
  }

  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-label),
  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-chevron) {
    opacity: 0;
  }

  .app-sidebar:not(.is-revealed):not(:has(:focus-visible)) :deep(.nav-group) {
    grid-template-rows: 0fr;
    opacity: 0;
  }

  .secondary-nav,
  .secondary-nav.is-open {
    display: block;
    flex: 1 1 auto;
    max-height: none;
    min-height: 0;
  }

  .nav-tree-root {
    padding-top: 12px;
  }

  .sidebar-foot {
    display: flex;
    flex: none;
    padding: 8px var(--app-sidebar-inset) 12px;
    border-top: 1px solid var(--nav-sidebar-border);
  }

  .sidebar-mode {
    width: var(--app-nav-icon);
    min-width: var(--app-nav-icon);
    padding-inline: 0;
  }

  .sidebar-mobile-bar {
    display: none;
  }
}

@media (max-width: 1023px) {
  .brand-subtitle {
    display: none;
  }

  .app-user-name {
    max-width: 5rem;
  }
}

@media (max-width: 767px) {
  .app-shell {
    --app-header-block: calc(var(--header-height) + 48px);
  }

  .app-header {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: var(--header-height) 48px;
    gap: 0;
    padding-left: 16px;
    padding-right: 8px;
  }

  .brand-region {
    justify-self: start;
  }

  .app-brand {
    display: flex;
    width: auto;
    height: auto;
    gap: 12px;
    color: var(--text-color-primary);
  }

  .brand-mark {
    margin-inline: 0;
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

  .app-shell:not(.has-sidebar) .sidebar-track {
    display: none;
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
  .app-sidebar :deep(.nav-chevron),
  .app-sidebar :deep(.nav-group) {
    transition: none;
  }
}
</style>
