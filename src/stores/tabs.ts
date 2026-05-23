import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { TabItem } from '@/types/theme'

const STORAGE_KEY = 'ray-tabs'

// 默认首页标签
const HOME_TAB: TabItem = {
  path: '/dashboard',
  name: 'Dashboard',
  title: '首页',
  icon: 'HomeOutline',
  affix: true,
  closable: false,
}

export const useTabsStore = defineStore('tabs', () => {
  // State
  const tabs = ref<TabItem[]>([HOME_TAB])
  const activeTab = ref<string>(HOME_TAB.path)
  const cachedViews = ref<string[]>([])

  // Getters
  const tabList = computed(() => tabs.value)
  const currentTab = computed(() => tabs.value.find((tab: TabItem) => tab.path === activeTab.value))

  // Actions

  /**
   * 添加标签
   */
  function addTab(tab: TabItem) {
    const exists = tabs.value.find((t: TabItem) => t.path === tab.path)
    if (!exists) {
      tabs.value.push({
        ...tab,
        closable: tab.closable !== false && !tab.affix,
      })
      // 添加到缓存列表（仅 keepAlive 为 true 的页面）
      if (tab.keepAlive && tab.name && !cachedViews.value.includes(tab.name)) {
        cachedViews.value.push(tab.name)
      }
    }
    activeTab.value = tab.path
    saveToStorage()
  }

  /**
   * 移除标签
   */
  function removeTab(path: string) {
    const index = tabs.value.findIndex((t: TabItem) => t.path === path)
    if (index === -1) return

    const tab = tabs.value[index]
    // 固定标签不能关闭
    if (tab?.affix) return

    tabs.value.splice(index, 1)

    // 从缓存中移除
    if (tab?.name) {
      const cacheIndex = cachedViews.value.indexOf(tab.name)
      if (cacheIndex > -1) {
        cachedViews.value.splice(cacheIndex, 1)
      }
    }

    // 如果关闭的是当前标签，切换到相邻标签
    if (path === activeTab.value) {
      const nextTab = tabs.value[index] || tabs.value[index - 1]
      if (nextTab) {
        activeTab.value = nextTab.path
      }
    }

    saveToStorage()
    return activeTab.value
  }

  /**
   * 关闭其他标签
   */
  function closeOther(path: string) {
    tabs.value = tabs.value.filter((t: TabItem) => t.affix || t.path === path)
    // 更新缓存
    cachedViews.value = tabs.value
      .filter((t: TabItem) => t.keepAlive && t.name)
      .map((t: TabItem) => t.name!)
    activeTab.value = path
    saveToStorage()
  }

  /**
   * 关闭左侧标签
   */
  function closeLeft(path: string) {
    const index = tabs.value.findIndex((t: TabItem) => t.path === path)
    if (index <= 0) return

    const removed = tabs.value.slice(0, index).filter((t: TabItem) => !t.affix)
    tabs.value = tabs.value.filter((t: TabItem, i: number) => i >= index || t.affix)

    // 从缓存中移除
    removed.forEach((t: TabItem) => {
      if (t.name) {
        const cacheIndex = cachedViews.value.indexOf(t.name)
        if (cacheIndex > -1) {
          cachedViews.value.splice(cacheIndex, 1)
        }
      }
    })

    saveToStorage()
  }

  /**
   * 关闭右侧标签
   */
  function closeRight(path: string) {
    const index = tabs.value.findIndex((t: TabItem) => t.path === path)
    if (index === -1 || index === tabs.value.length - 1) return

    const removed = tabs.value.slice(index + 1).filter((t: TabItem) => !t.affix)
    tabs.value = tabs.value.filter((t: TabItem, i: number) => i <= index || t.affix)

    // 从缓存中移除
    removed.forEach((t: TabItem) => {
      if (t.name) {
        const cacheIndex = cachedViews.value.indexOf(t.name)
        if (cacheIndex > -1) {
          cachedViews.value.splice(cacheIndex, 1)
        }
      }
    })

    // 如果当前标签被关闭了，切换到目标标签
    if (!tabs.value.find((t: TabItem) => t.path === activeTab.value)) {
      activeTab.value = path
    }

    saveToStorage()
  }

  /**
   * 关闭所有标签（保留固定标签）
   */
  function closeAll() {
    tabs.value = tabs.value.filter((t: TabItem) => t.affix)
    cachedViews.value = tabs.value
      .filter((t: TabItem) => t.keepAlive && t.name)
      .map((t: TabItem) => t.name!)
    activeTab.value = tabs.value[0]?.path || HOME_TAB.path
    saveToStorage()
    return activeTab.value
  }

  /**
   * 设置当前激活标签
   */
  function setActiveTab(path: string) {
    activeTab.value = path
  }

  /**
   * 拖拽排序
   */
  function reorderTabs(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return

    const tab = tabs.value[fromIndex]
    if (!tab) return

    tabs.value.splice(fromIndex, 1)
    tabs.value.splice(toIndex, 0, tab)
    saveToStorage()
  }

  /**
   * 刷新标签（重新加载页面内容）
   */
  function refreshTab(path: string) {
    const tab = tabs.value.find((t: TabItem) => t.path === path)
    if (tab?.name) {
      // 临时移除缓存，然后重新添加
      const index = cachedViews.value.indexOf(tab.name)
      if (index > -1) {
        cachedViews.value.splice(index, 1)
        // 下一个 tick 重新添加（仅 keepAlive 的页面需要重新缓存）
        if (tab.keepAlive) {
          setTimeout(() => {
            cachedViews.value.push(tab.name!)
          }, 100)
        }
      }
    }
  }

  /**
   * 保存到 localStorage
   */
  function saveToStorage() {
    try {
      const data = {
        tabs: tabs.value,
        activeTab: activeTab.value,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      console.warn('保存标签页数据失败')
    }
  }

  /**
   * 从 localStorage 加载
   */
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (Array.isArray(data.tabs) && data.tabs.length > 0) {
          const activePath = data.activeTab || HOME_TAB.path
          // 刷新后只保留首页 + 当前活跃标签
          const activeItem = data.tabs.find((t: TabItem) => t.path === activePath)
          if (activeItem && activePath !== HOME_TAB.path) {
            tabs.value = [HOME_TAB, activeItem]
          } else {
            tabs.value = [HOME_TAB]
          }
          activeTab.value = activePath
          // 重建缓存列表
          cachedViews.value = tabs.value
            .filter((t: TabItem) => t.name)
            .map((t: TabItem) => t.name!)
          saveToStorage()
        }
      }
    } catch {
      console.warn('加载标签页数据失败')
    }
  }

  /**
   * 重置标签页
   */
  function reset() {
    tabs.value = [HOME_TAB]
    activeTab.value = HOME_TAB.path
    cachedViews.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    // State
    tabs,
    activeTab,
    cachedViews,

    // Getters
    tabList,
    currentTab,

    // Actions
    addTab,
    removeTab,
    closeOther,
    closeLeft,
    closeRight,
    closeAll,
    setActiveTab,
    reorderTabs,
    refreshTab,
    saveToStorage,
    loadFromStorage,
    reset,
  }
})
