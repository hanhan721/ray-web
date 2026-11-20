<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { nextTick, useTemplateRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { X } from '@lucide/vue'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useTabsStore, type PageTab } from '@/stores/tabs'

const emit = defineEmits<{ refresh: [name: string] }>()

const route = useRoute()
const router = useRouter()
const tabsStore = useTabsStore()
const { items } = storeToRefs(tabsStore)
const nav = useTemplateRef<HTMLElement>('nav')

async function scrollActiveIntoView() {
  await nextTick()
  nav.value
    ?.querySelector('[aria-current="page"]')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

async function focusActiveTab() {
  await nextTick()
  nav.value?.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
}

watch(() => route.fullPath, scrollActiveIntoView, { immediate: true })

function tabIndex(tab: PageTab): number {
  return items.value.findIndex((item) => item.path === tab.path)
}

function hasClosableOther(tab: PageTab): boolean {
  return items.value.some((item) => item.path !== tab.path && !item.affix)
}

function hasClosableBefore(tab: PageTab): boolean {
  const index = tabIndex(tab)
  return index > 0 && items.value.slice(0, index).some((item) => !item.affix)
}

function hasClosableAfter(tab: PageTab): boolean {
  const index = tabIndex(tab)
  return index >= 0 && items.value.slice(index + 1).some((item) => !item.affix)
}

function hasClosableTab(): boolean {
  return items.value.some((item) => !item.affix)
}

async function runClose(action: () => string | null) {
  const next = action()
  if (next) await router.push(next)
  await focusActiveTab()
}

function closeTab(tab: PageTab) {
  void runClose(() => tabsStore.closeTab(tab.path, route.path))
}

function closeOthers(tab: PageTab) {
  void runClose(() => tabsStore.closeOthers(tab.path, route.path))
}

function closeLeft(tab: PageTab) {
  void runClose(() => tabsStore.closeLeft(tab.path, route.path))
}

function closeRight(tab: PageTab) {
  void runClose(() => tabsStore.closeRight(tab.path, route.path))
}

function closeAll() {
  void runClose(() => tabsStore.closeAll(route.path))
}

async function refreshTab(tab: PageTab) {
  if (route.path !== tab.path) await router.push(tab.fullPath)
  if (route.name !== tab.name) return
  emit('refresh', tab.name)
  await focusActiveTab()
}
</script>

<template>
  <nav ref="nav" class="page-tabs" aria-label="已打开页面">
    <ol class="page-tabs-list">
      <ContextMenu v-for="tab in items" :key="tab.path">
        <ContextMenuTrigger as-child>
          <li class="page-tab" :class="{ 'is-active': tab.path === route.path }">
            <RouterLink
              :to="tab.fullPath"
              class="page-tab-link"
              :class="{ 'has-close': !tab.affix }"
              :title="tab.title"
              :aria-current="tab.path === route.path ? 'page' : undefined"
            >
              {{ tab.title }}
            </RouterLink>
            <button
              v-if="!tab.affix"
              type="button"
              class="page-tab-close"
              :aria-label="`关闭${tab.title}`"
              :title="`关闭${tab.title}`"
              @click="closeTab(tab)"
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </li>
        </ContextMenuTrigger>
        <ContextMenuContent class="w-40">
          <ContextMenuItem @select="refreshTab(tab)">刷新页面</ContextMenuItem>
          <ContextMenuItem :disabled="tab.affix" @select="closeTab(tab)">
            关闭页面
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem :disabled="!hasClosableOther(tab)" @select="closeOthers(tab)">
            关闭其他
          </ContextMenuItem>
          <ContextMenuItem :disabled="!hasClosableBefore(tab)" @select="closeLeft(tab)">
            关闭左侧
          </ContextMenuItem>
          <ContextMenuItem :disabled="!hasClosableAfter(tab)" @select="closeRight(tab)">
            关闭右侧
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem :disabled="!hasClosableTab()" @select="closeAll()">
            关闭全部
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </ol>
  </nav>
</template>

<style scoped>
.page-tabs {
  position: sticky;
  top: var(--app-header-height, 4rem);
  z-index: 10;
  display: flex;
  height: 2.75rem;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--card);
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
.page-tabs-list {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  min-width: max-content;
  padding: 0.375rem 0.75rem;
}
.page-tab {
  position: relative;
  display: flex;
  max-width: 14rem;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  color: var(--muted-foreground);
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}
.page-tab:hover {
  background: var(--muted);
  color: var(--foreground);
}
.page-tab.is-active {
  border-color: var(--sidebar-primary);
  background: var(--sidebar-accent);
  color: var(--sidebar-primary);
  font-weight: 500;
}
.page-tab-link {
  display: flex;
  height: 100%;
  min-width: 0;
  align-items: center;
  overflow: hidden;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  outline: none;
}
.page-tab-link.has-close {
  padding-right: 0.25rem;
}
.page-tab-link:focus-visible {
  border-radius: var(--radius-sm);
  outline: 2px solid var(--sidebar-primary);
  outline-offset: -2px;
}
.page-tab-close {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  place-items: center;
  margin-right: 0.25rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: currentColor;
  opacity: 0.7;
  cursor: pointer;
}
.page-tab-close:hover {
  background: var(--accent);
  color: var(--foreground);
  opacity: 1;
}
.page-tab-close:focus-visible {
  outline: 2px solid var(--sidebar-primary);
  outline-offset: -2px;
}
</style>
