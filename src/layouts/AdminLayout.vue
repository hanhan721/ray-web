<template>
  <div
    class="app-shell"
    :class="{
      'sidebar-inverted': sidebarInverted,
      'has-sidebar': sidebarOpen,
    }"
    :style="shellStyle"
  >
    <a href="#main" class="skip-link">跳到主要内容</a>
    <header class="app-header">
      <div ref="brandRegionRef" class="brand-region">
        <RouterLink to="/dashboard" class="app-brand">
          <span class="brand-mark" aria-hidden="true">R</span>
          <span>
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

    <div class="app-body">
      <aside
        v-if="sidebarPresent"
        class="app-sidebar"
        :class="{ 'is-compact': sidebarCompact, 'is-hovering': sidebarHovering }"
        aria-label="子菜单"
        :inert="sidebarOpen ? undefined : true"
        @mouseenter="onSidebarPointerEnter"
        @mouseleave="onSidebarPointerLeave"
        @focusin="onSidebarFocusIn"
        @focusout="onSidebarFocusOut"
      >
        <div class="sidebar-panel">
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
            :aria-label="`${displayedTitle}子菜单`"
            @keydown.esc="closeMobileNav"
          >
            <NavTree
              class="nav-tree-root"
              :nodes="displayedNodes"
              :open="openGroups"
              :active-ancestors="activeAncestors"
              :depth="0"
              :compact="sidebarIconsOnly"
              @toggle="toggleGroup"
              @navigate="closeMobileNav"
            />
          </nav>
          <div class="sidebar-foot">
            <NButton
              quaternary
              class="sidebar-mode"
              :class="{ 'is-icon': sidebarIconsOnly }"
              :aria-pressed="sidebarCompact"
              :aria-label="sidebarModeLabel"
              :title="sidebarModeLabel"
              @click="toggleSidebarCompact"
            >
              <template #icon>
                <NIcon :component="sidebarCompact ? ChevronForwardOutline : ChevronBackOutline" />
              </template>
              <span v-if="!sidebarIconsOnly">{{ sidebarModeLabel }}</span>
            </NButton>
          </div>
        </div>
      </aside>
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

const SIDEBAR_MOTION_MS = 320
const BRAND_PADDING = 24
const SIDEBAR_COMPACT_KEY = 'ray-sidebar-compact'
const SIDEBAR_HOVER_DELAY = 120
const SIDEBAR_EXPANDED_WIDTH = 200

const navOpen = shallowRef(false)
const openGroups = shallowRef<Set<number>>(new Set())
const brandRegionRef = ref<HTMLElement | null>(null)
const collapsedBrandWidth = ref(168)
const displayedNodes = shallowRef<NavNode[]>([])
const displayedTitle = ref('')
const sidebarPresent = ref(false)
const sidebarOpen = ref(false)
const sidebarCompact = ref(localStorage.getItem(SIDEBAR_COMPACT_KEY) === '1')
const sidebarHovering = ref(false)
const sideSpan = ref(0)
const brandSpan = ref(0)
let sidebarFrame = 0
let brandFrame = 0
let sidebarGeneration = 0
let sidebarMoving = false
let sidebarHoverTimer = 0

const displayName = computed(() => userStore.nickname || userStore.username || '未登录')
const sidebarInverted = computed(() => appStore.themeConfig.menuTheme === 'dark' && !appStore.isDarkMode)
const navigation = computed(() => buildNavigation(permissionStore.visibleMenus))
const modules = computed(() => navigation.value.filter((node) => !(node.kind === 'item' && node.to === '/dashboard')))
const homeActive = computed(() => route.name === 'Dashboard' || route.path === '/dashboard')
const activeTrail = computed(() => (homeActive.value ? [] : findNavigationTrail(navigation.value, route.path)))
const activeModule = computed(() => activeTrail.value[0])
const secondaryNodes = computed(() => (activeModule.value?.kind === 'group' ? activeModule.value.items : []))
const wantsSidebar = computed(() => secondaryNodes.value.length > 0)
const sidebarIconsOnly = computed(() => sidebarCompact.value && !sidebarHovering.value)
const sidebarModeLabel = computed(() => (sidebarCompact.value ? '自动收缩' : '默认显示'))
const shellStyle = computed(() => ({
  '--brand-min': `${collapsedBrandWidth.value}px`,
  '--brand-span': `${brandSpan.value}px`,
  '--side-span': `${sideSpan.value}px`,
}))

sidebarPresent.value = wantsSidebar.value
sidebarOpen.value = wantsSidebar.value
sideSpan.value = wantsSidebar.value ? sidebarRestWidth() : 0
brandSpan.value = wantsSidebar.value ? sidebarRestWidth() : collapsedBrandWidth.value
const activeAncestors = computed(
  () => new Set(activeTrail.value.filter((node) => node.kind === 'group').map((node) => node.id))
)

function brandTargetWidth() {
  if (sidebarOpen.value && sidebarCompact.value && sidebarHovering.value) return SIDEBAR_EXPANDED_WIDTH
  if (sidebarOpen.value) return sidebarRestWidth()
  return collapsedBrandWidth.value
}

function animateBrandSpan(duration = SIDEBAR_MOTION_MS) {
  cancelAnimationFrame(brandFrame)
  const to = brandTargetWidth()
  const from = brandSpan.value
  if (duration <= 0 || prefersReducedMotion() || !isDesktopSidebar() || Math.abs(from - to) < 1) {
    brandSpan.value = to
    return
  }
  const start = window.performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - (1 - progress) ** 3
    brandSpan.value = from + (to - from) * eased
    if (progress < 1) {
      brandFrame = requestAnimationFrame(step)
      return
    }
    brandSpan.value = to
  }
  brandFrame = requestAnimationFrame(step)
}

function sidebarRestWidth() {
  return sidebarCompact.value ? appStore.themeConfig.sidebarCollapsedWidth : SIDEBAR_EXPANDED_WIDTH
}

function toggleSidebarCompact() {
  sidebarCompact.value = !sidebarCompact.value
  localStorage.setItem(SIDEBAR_COMPACT_KEY, sidebarCompact.value ? '1' : '0')
  window.clearTimeout(sidebarHoverTimer)
  sidebarHovering.value = false
  if (!sidebarOpen.value) {
    animateBrandSpan()
    return
  }
  animateSideSpan(sidebarRestWidth())
  animateBrandSpan()
}

function cancelSidebarHover() {
  window.clearTimeout(sidebarHoverTimer)
  sidebarHoverTimer = window.setTimeout(() => {
    sidebarHovering.value = false
    animateBrandSpan(200)
  }, SIDEBAR_HOVER_DELAY)
}

function onSidebarPointerEnter() {
  if (!sidebarCompact.value || !isDesktopSidebar()) return
  window.clearTimeout(sidebarHoverTimer)
  sidebarHovering.value = true
  animateBrandSpan(200)
}

function onSidebarPointerLeave() {
  if (!sidebarCompact.value) return
  cancelSidebarHover()
}

function onSidebarFocusIn() {
  if (!sidebarCompact.value || !isDesktopSidebar()) return
  window.clearTimeout(sidebarHoverTimer)
  sidebarHovering.value = true
  animateBrandSpan(200)
}

function onSidebarFocusOut(event: FocusEvent) {
  const current = event.currentTarget
  const next = event.relatedTarget
  if (current instanceof Node && next instanceof Node && current.contains(next)) return
  onSidebarPointerLeave()
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

function measureBrand() {
  const link = brandRegionRef.value?.querySelector<HTMLElement>('.app-brand')
  if (!link) return
  collapsedBrandWidth.value = Math.ceil(link.offsetWidth) + BRAND_PADDING
  if (!sidebarOpen.value) animateBrandSpan(0)
}

function isDesktopSidebar() {
  return window.matchMedia('(min-width: 768px)').matches
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function finishSidebarCollapse() {
  cancelAnimationFrame(sidebarFrame)
  sidebarMoving = false
  if (sidebarOpen.value) return
  sideSpan.value = 0
  sidebarPresent.value = false
}

function animateSideSpan(to: number, onDone?: () => void) {
  cancelAnimationFrame(sidebarFrame)
  const from = sideSpan.value
  const instant = prefersReducedMotion() || !isDesktopSidebar() || Math.abs(from - to) < 1
  if (instant) {
    sidebarMoving = false
    sideSpan.value = to
    onDone?.()
    return
  }

  sidebarMoving = true
  const start = window.performance.now()
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / SIDEBAR_MOTION_MS)
    const eased = 1 - (1 - progress) ** 3
    sideSpan.value = from + (to - from) * eased
    if (progress < 1) {
      sidebarFrame = requestAnimationFrame(step)
      return
    }
    sidebarMoving = false
    sideSpan.value = to
    onDone?.()
  }
  sidebarFrame = requestAnimationFrame(step)
}

async function syncSidebar(open: boolean) {
  const generation = ++sidebarGeneration
  if (open) {
    if (sidebarOpen.value && Math.abs(sideSpan.value - sidebarRestWidth()) < 2) return
    sidebarPresent.value = true
    sidebarOpen.value = true
    await nextTick()
    if (generation !== sidebarGeneration) return
    animateSideSpan(sidebarRestWidth())
    animateBrandSpan()
    return
  }

  if (!sidebarPresent.value && sideSpan.value <= 1) return
  sidebarOpen.value = false
  if (!isDesktopSidebar() || prefersReducedMotion()) {
    finishSidebarCollapse()
    animateBrandSpan(0)
    return
  }
  animateSideSpan(0, () => {
    if (generation !== sidebarGeneration) return
    finishSidebarCollapse()
    animateBrandSpan()
  })
  animateBrandSpan()
}

watch(secondaryNodes, (nodes) => {
  if (nodes.length === 0) return
  displayedNodes.value = nodes
  displayedTitle.value = activeModule.value?.title ?? ''
}, { immediate: true })

watch(wantsSidebar, (open) => {
  void syncSidebar(open)
})

watch(
  () => appStore.themeConfig.sidebarCollapsedWidth,
  () => {
    if (sidebarOpen.value && !sidebarMoving && sidebarCompact.value) sideSpan.value = sidebarRestWidth()
  }
)

watch(
  activeAncestors,
  (ancestors) => {
    openGroups.value = new Set([...openGroups.value, ...ancestors])
  },
  { immediate: true }
)

watch(() => route.fullPath, closeMobileNav)

onMounted(() => {
  measureBrand()
  window.addEventListener('resize', measureBrand)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureBrand)
  cancelAnimationFrame(sidebarFrame)
  cancelAnimationFrame(brandFrame)
  window.clearTimeout(sidebarHoverTimer)
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
  --side-span: 0px;
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

.app-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
    grid-template-columns: var(--brand-span, var(--brand-min, 168px)) minmax(0, 1fr) auto;
    gap: 0;
    padding-left: 0;
    padding-right: 16px;
  }

  .brand-region {
    display: flex;
    align-items: center;
    align-self: stretch;
    width: 100%;
    min-width: 0;
    padding-left: 24px;
    overflow: hidden;
    background: transparent;
  }

  .has-sidebar .brand-region {
    padding-right: 24px;
  }

  .app-top-nav {
    margin-left: 24px;
    transition: margin-left 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .has-sidebar .app-top-nav {
    margin-left: 8px;
  }

  .app-user {
    margin-left: 12px;
  }

  .app-body {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    min-height: 0;
  }

  .app-content {
    flex: 1;
    min-width: 0;
  }

  .app-sidebar {
    width: var(--side-span);
    flex: none;
    min-width: 0;
    overflow: hidden;
    border-right: 0;
    border-bottom: 0;
    pointer-events: none;
  }

  .has-sidebar .app-sidebar {
    pointer-events: auto;
  }

  .sidebar-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    border-right: 1px solid var(--nav-sidebar-border);
  }

  .app-sidebar.is-compact {
    position: relative;
    z-index: 30;
    overflow: visible;
  }

  .app-sidebar.is-compact .sidebar-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    overflow: hidden;
    background: var(--nav-sidebar-bg);
    transition: width 0.2s ease;
  }

  .app-sidebar.is-compact.is-hovering .sidebar-panel {
    width: 200px;
    box-shadow: var(--box-shadow-md);
  }

  .sidebar-foot {
    display: flex;
    flex: none;
    justify-content: flex-end;
    padding: 8px 12px 12px;
    border-top: 1px solid var(--nav-sidebar-border);
  }

  .app-sidebar.is-compact:not(.is-hovering) .sidebar-foot {
    justify-content: center;
    padding-inline: 0;
  }

  .sidebar-mode.is-icon {
    width: 34px;
    padding-inline: 0;
  }

  .sidebar-mobile-bar {
    display: none;
  }

  .secondary-nav,
  .secondary-nav.is-open {
    display: block;
    flex: 1;
    max-height: none;
    min-height: 0;
  }

  .nav-tree-root {
    padding-top: 16px;
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
  .app-shell,
  .brand-region,
  .app-brand,
  .brand-subtitle,
  .app-top-nav,
  .sidebar-panel {
    transition: none;
  }
}
</style>
