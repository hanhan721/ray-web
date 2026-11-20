import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTabsStore } from '../tabs'

const roleTab = {
  path: '/system/role',
  fullPath: '/system/role',
  name: 'system-role',
  title: '角色管理',
  keepAlive: true,
}

const userTab = {
  path: '/system/user',
  fullPath: '/system/user',
  name: 'system-user',
  title: '用户管理',
  keepAlive: true,
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('page tabs store', () => {
  it('starts with the fixed home tab and deduplicates pages by path', () => {
    const tabs = useTabsStore()
    expect(tabs.items).toEqual([
      expect.objectContaining({ path: '/', title: '工作台', affix: true }),
    ])

    tabs.openTab(userTab)
    tabs.openTab({ ...userTab, title: '用户' })

    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/user'])
    expect(tabs.items[1]).toMatchObject({ title: '用户', keepAlive: true, affix: false })
  })

  it('ignores the home route and never closes the fixed tab', () => {
    const tabs = useTabsStore()

    tabs.openTab({ path: '/', fullPath: '/', name: 'home', title: '首页', keepAlive: false })

    expect(tabs.items).toHaveLength(1)
    expect(tabs.closeTab('/', '/')).toBeNull()
    expect(tabs.items).toHaveLength(1)
  })

  it('returns the previous tab when closing the active page', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)

    expect(tabs.closeTab('/system/user', '/system/user')).toBe('/system/role')
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/role'])
  })

  it('keeps navigation unchanged when closing an inactive page', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)

    expect(tabs.closeTab('/system/role', '/system/user')).toBeNull()
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/user'])
  })

  it('resets to only the home tab', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)

    tabs.reset()

    expect(tabs.items.map((tab) => tab.path)).toEqual(['/'])
  })

  it('closes other pages and keeps home plus the context page', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)
    tabs.openTab({
      path: '/system/dept',
      fullPath: '/system/dept',
      name: 'system-dept',
      title: '部门管理',
      keepAlive: true,
    })

    expect(tabs.closeOthers('/system/role', '/system/dept')).toBe('/system/role')
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/role'])
  })

  it('closes pages on the left or right of the context page', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)
    tabs.openTab({
      path: '/system/dept',
      fullPath: '/system/dept',
      name: 'system-dept',
      title: '部门管理',
      keepAlive: true,
    })

    expect(tabs.closeLeft('/system/user', '/system/role')).toBe('/system/user')
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/user', '/system/dept'])
    expect(tabs.closeRight('/system/user', '/system/dept')).toBe('/system/user')
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/', '/system/user'])
  })

  it('closes all pages but keeps home and returns home when the active page closes', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)

    expect(tabs.closeAll('/system/user')).toBe('/')
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/'])
  })

  it('keeps the current route when closing other pages while home is active', () => {
    const tabs = useTabsStore()
    tabs.openTab(roleTab)
    tabs.openTab(userTab)

    expect(tabs.closeAll('/')).toBeNull()
    expect(tabs.items.map((tab) => tab.path)).toEqual(['/'])
  })
})
