import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserPage } from '@/api/user'
import { applyColumnPreference, toColumnPreference } from '@/utils/column-preference'
import { useUserList } from '@/views/system/user/use-user-list'
import {
  sameEditorSession,
  toUserQuery,
  toUserWrite,
  USER_DATA_COLUMNS,
} from '@/views/system/user/user-table'

vi.mock('@/api/user', () => ({
  getUserPage: vi.fn(),
}))

const page = vi.mocked(getUserPage)

beforeEach(() => {
  page.mockReset()
})

describe('user list query', () => {
  it('maps the page index and omits sorting and blank filters', () => {
    expect(
      toUserQuery({
        pageIndex: 2,
        pageSize: 20,
        username: '  admin  ',
        nickname: ' ',
        enabled: '',
      }),
    ).toEqual({ pageNum: 3, pageSize: 20, username: 'admin' })
    expect(
      toUserQuery({
        pageIndex: 0,
        pageSize: 10,
        username: '',
        nickname: ' 昵称 ',
        enabled: 'false',
      }),
    ).toEqual({ pageNum: 1, pageSize: 10, nickname: '昵称', enabled: false })
  })

  it('keeps unknown saved columns out and appends new columns', () => {
    const keys = USER_DATA_COLUMNS.map((column) => column.key)
    const applied = applyColumnPreference(keys, [
      { key: 'email', visible: false, sort: 1, width: null, fixed: null },
      { key: 'removed', visible: true, sort: 0, width: 80, fixed: 'left' },
      { key: 'username', visible: true, sort: 0, width: null, fixed: null },
    ])
    expect(applied.order[0]).toBe('username')
    expect(applied.order).toContain('nickname')
    expect(applied.order).not.toContain('removed')
    expect(applied.visibility.email).toBe(false)
    expect(
      toColumnPreference(keys, applied.order, applied.visibility).some(
        (item) => item.key === 'email' && !item.visible,
      ),
    ).toBe(true)
  })

  it('ignores an older response and clears the selection when searching', async () => {
    let releaseFirst: (value: Awaited<ReturnType<typeof getUserPage>>) => void = () => {}
    page.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve
        }),
    )
    page.mockResolvedValueOnce({
      current: 1,
      size: 10,
      total: 1,
      pages: 1,
      records: [
        {
          id: 2,
          username: 'new',
          avatarFileId: null,
        },
      ],
    })
    const list = useUserList()
    const first = list.load()
    list.selectedIds.value = [1]
    const second = list.search()
    await vi.waitUntil(() => page.mock.calls.length === 2)
    releaseFirst({
      current: 4,
      size: 10,
      total: 99,
      pages: 10,
      records: [{ id: 1, username: 'old', avatarFileId: null }],
    })
    await first
    await second
    expect(list.rows.value.map((row) => row.username)).toEqual(['new'])
    expect(list.pageIndex.value).toBe(0)
    expect(list.selectedIds.value).toEqual([])
    expect(list.total.value).toBe(1)
  })

  it('clears the selection when changing pages and keeps a returned page size', async () => {
    page.mockResolvedValue({
      current: 2,
      size: 20,
      total: 21,
      pages: 2,
      records: [],
    })
    const list = useUserList()
    list.selectedIds.value = [1]
    await list.changePage(1)
    expect(list.selectedIds.value).toEqual([])
    expect(list.pageIndex.value).toBe(1)
    expect(list.pageSize.value).toBe(20)
    expect(page.mock.calls[0]?.[0]).toMatchObject({ pageNum: 2, pageSize: 10 })
  })

  it('sends cleared optional text and ignores a stale editor session', () => {
    expect(
      toUserWrite({
        id: 7,
        username: ' admin ',
        nickname: ' ',
        email: '',
        phone: ' 1 ',
        avatarFileId: null,
        gender: '',
        enabled: true,
        remark: '',
      }),
    ).toEqual({
      id: 7,
      username: 'admin',
      nickname: '',
      email: '',
      phone: '1',
      avatarFileId: null,
      gender: undefined,
      enabled: true,
      remark: '',
    })
    expect(sameEditorSession(2, 2, 7, 7)).toBe(true)
    expect(sameEditorSession(1, 2, 7, 8)).toBe(false)
    expect(sameEditorSession(1, 1, 7, 8)).toBe(false)
  })
})
