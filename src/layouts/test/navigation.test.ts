import { describe, expect, it } from 'vitest'
import type { NavNode } from '@/router/menu-routes'
import { findNavigationTrail, firstNavigationPath } from '../navigation'

const navigation: NavNode[] = [
  {
    kind: 'group', id: 1, title: '系统管理', items: [
      { kind: 'group', id: 2, title: '组织管理', items: [
        { kind: 'item', id: 3, title: '用户管理', to: '/system/org/user' },
        { kind: 'item', id: 4, title: '角色管理', to: '/system/org/role' },
      ] },
      { kind: 'item', id: 5, title: '菜单管理', to: '/system/menu' },
    ],
  },
  { kind: 'item', id: 6, title: '定时任务', to: '/job' },
]

describe('layout navigation', () => {
  it('opens the first reachable leaf of a module in menu order', () => {
    const module: NavNode = {
      kind: 'group', id: 0, title: '模块', items: [
        { kind: 'group', id: 7, title: '空目录', items: [] },
        ...navigation,
      ],
    }
    expect(firstNavigationPath(module)).toBe('/system/org/user')
    expect(firstNavigationPath({ kind: 'item', id: 6, title: '定时任务', to: '/job' })).toBe('/job')
    expect(firstNavigationPath({ kind: 'group', id: 7, title: '空目录', items: [] })).toBeNull()
  })

  it('locates a nested page and its module independently of the module entry page', () => {
    expect(findNavigationTrail(navigation, '/system/org/role').map((node) => node.id)).toEqual([1, 2, 4])
    expect(findNavigationTrail(navigation, '/system/menu').map((node) => node.id)).toEqual([1, 5])
    expect(findNavigationTrail(navigation, '/system/org/user').map((node) => node.id)).toEqual([1, 2, 3])
  })

  it('locates a standalone module without carrying over the previous sidebar', () => {
    expect(findNavigationTrail(navigation, '/job')).toEqual([
      { kind: 'item', id: 6, title: '定时任务', to: '/job' },
    ])
  })

  it('leaves auxiliary pages and partial path matches outside the navigation tree', () => {
    for (const path of ['/', '/file', '/forbidden', '/system/org/user-extra', '/system']) {
      expect(findNavigationTrail(navigation, path)).toEqual([])
    }
    expect(findNavigationTrail([], '/system/org/user')).toEqual([])
  })
})
