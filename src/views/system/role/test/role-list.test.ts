import { describe, expect, it } from 'vitest'
import { toRoleQuery } from '@/views/system/role/role-table'

describe('role list query', () => {
  it('maps the page and omits blank filters and sorting', () => {
    expect(
      toRoleQuery({
        pageIndex: 1,
        pageSize: 20,
        roleName: ' 管理 ',
        roleKey: ' ',
        enabled: 'true',
      }),
    ).toEqual({ pageNum: 2, pageSize: 20, roleName: '管理', enabled: true })
  })
})
