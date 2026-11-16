import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import type { PermissionVO } from '@/types/permission'
import { buildMenuRoutes, buildNavigation, firstMenuPath } from '@/router/menu-routes'

const stub = defineComponent({
  name: 'RouteStub',
  setup: () => () => h('div'),
})

const loaders = {
  'system/user/index': stub,
  'schedule/job/index': stub,
}

function node(overrides: Partial<PermissionVO> & Pick<PermissionVO, 'id' | 'name' | 'type' | 'url'>): PermissionVO {
  return {
    parentId: 0,
    component: null,
    sort: overrides.id,
    hidden: false,
    keepAlive: false,
    enabled: true,
    children: [],
    ...overrides,
  }
}

const menus: PermissionVO[] = [
  node({
    id: 1,
    name: '系统管理',
    type: 'DIRECTORY',
    url: '/system',
    redirect: '/system/user',
    icon: 'SettingsOutline',
    children: [
      node({
        id: 2,
        parentId: 1,
        name: '用户管理',
        type: 'MENU',
        url: 'user',
        component: 'system/user/index',
        routeName: 'UserPage',
        keepAlive: true,
      }),
      node({
        id: 3,
        parentId: 1,
        name: '未映射',
        type: 'MENU',
        url: 'missing',
        component: 'missing/page',
      }),
    ],
  }),
  node({
    id: 9,
    name: '定时任务',
    type: 'MENU',
    url: '/job',
    component: 'schedule/job/index',
    routeName: 'ScheduleJobPage',
  }),
]

describe('menu routes', () => {
  it('maps known components and keeps relative menu urls under their directory', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', name: 'admin', component: stub, children: buildMenuRoutes(menus, loaders) }],
    })
    await router.push('/system/user')
    expect(router.currentRoute.value.name).toBe('UserPage')
    expect(router.currentRoute.value.meta.keepAlive).toBe(true)
    await router.push('/job')
    expect(router.currentRoute.value.name).toBe('ScheduleJobPage')
    expect(router.getRoutes().some((route) => route.path === '/system/missing')).toBe(false)
  })

  it('builds navigation from visible mapped menus and chooses the first page', () => {
    expect(firstMenuPath(menus, loaders)).toBe('/system/user')
    expect(buildNavigation(menus, loaders)).toEqual([
      {
        kind: 'group',
        id: 1,
        title: '系统管理',
        icon: 'SettingsOutline',
        items: [{ kind: 'item', id: 2, title: '用户管理', to: '/system/user', icon: undefined }],
      },
      {
        kind: 'item',
        id: 9,
        title: '定时任务',
        to: '/job',
        icon: undefined,
      },
    ])
  })

  it('preserves nested directories and filters hidden or empty branches', () => {
    const tree = [node({ id: 10, name: '系统', type: 'DIRECTORY', url: 'system', children: [
      node({ id: 11, name: '管理', type: 'DIRECTORY', url: 'admin', children: [
        node({ id: 12, name: '用户', type: 'MENU', url: 'user', component: 'system/user/index' }),
        node({ id: 13, name: '隐藏', type: 'MENU', url: 'hidden', hidden: true, component: 'system/user/index' }),
      ] }),
      node({ id: 14, name: '空目录', type: 'DIRECTORY', url: 'empty', children: [] }),
    ] })]
    expect(buildNavigation(tree, loaders)).toEqual([{
      kind: 'group', id: 10, title: '系统', icon: undefined, items: [{
        kind: 'group', id: 11, title: '管理', icon: undefined, items: [
          { kind: 'item', id: 12, title: '用户', to: '/system/admin/user', icon: undefined },
        ],
      }],
    }])
  })
})
