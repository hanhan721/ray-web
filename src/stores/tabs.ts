import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

export interface PageTab {
  path: string
  fullPath: string
  name: string
  title: string
  keepAlive: boolean
  affix: boolean
}

const HOME_TAB: PageTab = {
  path: '/',
  fullPath: '/',
  name: 'home',
  title: '工作台',
  keepAlive: false,
  affix: true,
}

export const useTabsStore = defineStore('tabs', () => {
  const items = shallowRef<PageTab[]>([{ ...HOME_TAB }])

  function openTab(tab: Omit<PageTab, 'affix'>): void {
    if (tab.path === HOME_TAB.path) return
    const index = items.value.findIndex((item) => item.path === tab.path)
    if (index === -1) {
      items.value = [...items.value, { ...tab, affix: false }]
      return
    }
    const current = items.value[index]
    if (!current) return
    if (
      current.fullPath === tab.fullPath &&
      current.name === tab.name &&
      current.title === tab.title &&
      current.keepAlive === tab.keepAlive
    ) {
      return
    }
    const next = [...items.value]
    next[index] = { ...current, ...tab, affix: false }
    items.value = next
  }

  function closeTab(path: string, activePath: string): string | null {
    const index = items.value.findIndex((item) => item.path === path)
    const closing = index === -1 ? undefined : items.value[index]
    if (!closing || closing.affix) return null
    const fallback = items.value[index - 1] ?? items.value[index + 1] ?? HOME_TAB
    return applyClosedTabs(
      items.value.filter((item) => item.path !== path),
      activePath,
      fallback,
    )
  }

  function closeOthers(contextPath: string, activePath: string): string | null {
    const context = items.value.find((item) => item.path === contextPath)
    if (!context) return null
    return applyClosedTabs(
      items.value.filter((item) => item.affix || item.path === contextPath),
      activePath,
      context,
    )
  }

  function closeLeft(contextPath: string, activePath: string): string | null {
    const index = items.value.findIndex((item) => item.path === contextPath)
    const context = index === -1 ? undefined : items.value[index]
    if (!context) return null
    return applyClosedTabs(
      items.value.filter((item, itemIndex) => itemIndex >= index || item.affix),
      activePath,
      context,
    )
  }

  function closeRight(contextPath: string, activePath: string): string | null {
    const index = items.value.findIndex((item) => item.path === contextPath)
    const context = index === -1 ? undefined : items.value[index]
    if (!context) return null
    return applyClosedTabs(
      items.value.filter((item, itemIndex) => itemIndex <= index || item.affix),
      activePath,
      context,
    )
  }

  function closeAll(activePath: string): string | null {
    const home = items.value.find((item) => item.affix) ?? HOME_TAB
    return applyClosedTabs(
      items.value.filter((item) => item.affix),
      activePath,
      home,
    )
  }

  function applyClosedTabs(
    remaining: PageTab[],
    activePath: string,
    fallback: PageTab,
  ): string | null {
    const activeWasOpen = items.value.some((item) => item.path === activePath)
    items.value = remaining
    return activeWasOpen && !remaining.some((item) => item.path === activePath)
      ? fallback.fullPath
      : null
  }

  function reset(): void {
    items.value = [{ ...HOME_TAB }]
  }

  return { items, openTab, closeTab, closeOthers, closeLeft, closeRight, closeAll, reset }
})
