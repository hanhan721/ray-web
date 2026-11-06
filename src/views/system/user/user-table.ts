import type { UserQuery, UserWrite } from '@/api/user'
import type { Gender } from '@/types/enums'

export const USER_PAGE_SIZES = [10, 20, 50, 100] as const

export interface UserColumnDefinition {
  key: string
  label: string
}

export const USER_DATA_COLUMNS: UserColumnDefinition[] = [
  { key: 'username', label: '账号' },
  { key: 'nickname', label: '昵称' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机' },
  { key: 'gender', label: '性别' },
  { key: 'enabled', label: '状态' },
  { key: 'createTime', label: '创建时间' },
]

export interface UserListInput {
  pageIndex: number
  pageSize: number
  username: string
  nickname: string
  enabled: '' | 'true' | 'false'
}

export function toUserQuery(input: UserListInput): UserQuery {
  const query: UserQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  const username = input.username.trim()
  const nickname = input.nickname.trim()
  if (username) query.username = username
  if (nickname) query.nickname = nickname
  if (input.enabled === 'true') query.enabled = true
  if (input.enabled === 'false') query.enabled = false
  return query
}

export function pageIndexFromResponse(current: number): number {
  return Math.max(0, current - 1)
}

export function isCurrentRequest(requestId: number, latestId: number): boolean {
  return requestId === latestId
}

export interface AppliedColumns {
  order: string[]
  visibility: Record<string, boolean>
}

export function applyColumnConfig(saved: ColumnConfigItem[] | null): AppliedColumns {
  const defaults = USER_DATA_COLUMNS.map((column) => column.key)
  if (!saved) {
    return {
      order: defaults,
      visibility: Object.fromEntries(defaults.map((key) => [key, true])),
    }
  }
  const known = new Set(defaults)
  const sorted = saved
    .filter((item) => known.has(item.key))
    .slice()
    .sort((left, right) => left.sort - right.sort)
  const seen = new Set(sorted.map((item) => item.key))
  const order = [...sorted.map((item) => item.key), ...defaults.filter((key) => !seen.has(key))]
  const visibility: Record<string, boolean> = {}
  for (const key of defaults) {
    const found = saved.find((item) => item.key === key)
    visibility[key] = found ? found.visible : true
  }
  return { order, visibility }
}

export function toColumnConfig(
  order: string[],
  visibility: Record<string, boolean>,
): ColumnConfigItem[] {
  const keys = order.filter((key) => USER_DATA_COLUMNS.some((column) => column.key === key))
  for (const column of USER_DATA_COLUMNS) {
    if (!keys.includes(column.key)) keys.push(column.key)
  }
  return keys.map((key, index) => ({
    key,
    visible: visibility[key] !== false,
    sort: index,
    width: null,
    fixed: null,
  }))
}

export function toUserWrite(input: {
  id?: number
  username: string
  nickname: string
  email: string
  phone: string
  avatarFileId: number | null
  gender: Gender | ''
  enabled: boolean
  remark: string
}): UserWrite {
  return {
    id: input.id,
    username: input.username.trim(),
    nickname: input.nickname.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    avatarFileId: input.avatarFileId,
    gender: input.gender || undefined,
    enabled: input.enabled,
    remark: input.remark.trim(),
  }
}

export function sameEditorSession(
  requestSession: number,
  currentSession: number,
  requestUserId: number | null,
  currentUserId: number | null,
): boolean {
  return requestSession === currentSession && requestUserId === currentUserId
}

export function tableColumnOrder(dataOrder: string[]): string[] {
  return ['select', ...dataOrder, 'actions']
}
