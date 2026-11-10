import type { UserQuery, UserWrite } from '@/api/user'
import type { ColumnSettingItem } from '@/components/common/column-settings'
import { GenderLabel, type Gender } from '@/types/enums'

export const USER_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'username', label: '账号' },
  { key: 'nickname', label: '昵称' },
  { key: 'email', label: '邮箱' },
  { key: 'phone', label: '手机' },
  { key: 'gender', label: '性别' },
  { key: 'enabled', label: '状态' },
  { key: 'createTime', label: '创建时间' },
]

export const USER_ENABLED_OPTIONS = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
] as const

const CELL_MIN_WIDTH: Record<string, string> = {
  username: 'min-w-24',
  nickname: 'min-w-24',
  email: 'min-w-36',
  phone: 'min-w-24',
  createTime: 'min-w-36',
}

/** 单元格文本样式：账号加重，时间用等宽数字并弱化，其余只做截断。 */
export function cellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'username') return `block truncate font-medium text-foreground ${minWidth}`
  if (columnId === 'createTime')
    return `block truncate text-muted-foreground tabular-nums ${minWidth}`
  return `block truncate ${minWidth}`
}

export function genderText(value: Gender | null | undefined): string {
  if (!value) return ''
  return GenderLabel[value] ?? value
}

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
