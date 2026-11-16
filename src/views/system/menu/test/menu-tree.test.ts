import { describe, expect, it } from 'vitest'
import {
  excludedParentIds,
  filterMenuRows,
  flattenMenus,
  menuFormError,
  menuWriteBody,
  toMenuWrite,
  type MenuRow,
} from '@/views/system/menu/menu-tree'

const rows: MenuRow[] = flattenMenus([
  {
    id: 1,
    parentId: 0,
    name: '系统',
    type: 'DIRECTORY',
    url: '',
    sort: 0,
    hidden: false,
    keepAlive: false,
    enabled: true,
    children: [
      {
        id: 2,
        parentId: 1,
        name: '用户',
        type: 'MENU',
        url: 'user',
        sort: 1,
        hidden: false,
        keepAlive: true,
        enabled: true,
        children: [
          {
            id: 3,
            parentId: 2,
            name: '新增',
            type: 'BUTTON',
            url: '',
            code: 'user:add',
            sort: 1,
            hidden: false,
            keepAlive: false,
            enabled: true,
          },
        ],
      },
    ],
  },
])

const blank = {
  name: '目录',
  type: 'DIRECTORY',
  url: '',
  code: '',
  component: '',
  redirect: '',
  icon: '',
  routeName: '',
  description: '',
  sort: 0,
  originalCode: '',
}

describe('menu tree', () => {
  it('flattens depth, filters, and keeps a blank code off the write body', () => {
    expect(rows.map((row) => [row.id, row.depth, row.type])).toEqual([
      [1, 0, 'DIRECTORY'],
      [2, 1, 'MENU'],
      [3, 2, 'BUTTON'],
    ])
    expect([...excludedParentIds(rows, 2)].sort()).toEqual([2, 3])
    expect(filterMenuRows(rows, '用', '').map((row) => row.id)).toEqual([2])
    expect(filterMenuRows(rows, '', 'BUTTON').map((row) => row.id)).toEqual([3])
    expect(toMenuWrite(rows[0]).code).toBeUndefined()
    expect(toMenuWrite(rows[2]).code).toBe('user:add')
    expect(menuFormError({ ...blank, type: 'MENU', url: '' })).toBe('请填写路由')
    expect(menuFormError({ ...blank, type: 'BUTTON', code: '' })).toBe('请填写权限标识')
    expect(menuFormError({ ...blank, originalCode: 'sys:menu', code: '' })).toBe(
      '权限标识暂时不能清空。',
    )
    expect(menuFormError({ ...blank, name: '名'.repeat(101) })).toBe('名称不能超过 100 个字符')
    const kept = menuWriteBody({
      id: 1,
      parentId: 0,
      name: '目录',
      type: 'DIRECTORY',
      url: '',
      code: 'sys:menu',
      component: '',
      routeName: '',
      redirect: '',
      icon: '',
      sort: 0,
      hidden: false,
      keepAlive: false,
      enabled: true,
      description: '只改描述',
      originalCode: 'sys:menu',
      originalEnabled: true,
    })
    expect(kept.code).toBeUndefined()
    expect(kept.enabled).toBeUndefined()
    expect(kept.description).toBe('只改描述')
    const button = menuWriteBody({
      id: 3,
      parentId: 2,
      name: '新增',
      type: 'BUTTON',
      url: '',
      code: 'user:add',
      component: '',
      routeName: '',
      redirect: '',
      icon: '',
      sort: 1,
      hidden: false,
      keepAlive: false,
      enabled: true,
      description: '只改名称',
      originalCode: 'user:add',
      originalEnabled: true,
    })
    expect(button.code).toBe('user:add')
    expect(button.enabled).toBeUndefined()
  })
})
