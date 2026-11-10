import type { RoleQuery } from '@/api/role'
import type { ColumnSettingItem } from '@/components/common/column-settings'

export const ROLE_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'roleName', label: '名称' },
  { key: 'roleKey', label: '标识' },
  { key: 'sort', label: '顺序' },
  { key: 'enabled', label: '状态' },
  { key: 'createTime', label: '创建时间' },
]

export const ROLE_ENABLED_OPTIONS = [
  { value: 'true', label: '启用' },
  { value: 'false', label: '停用' },
] as const

const CELL_MIN_WIDTH: Record<string, string> = {
  roleName: 'min-w-24',
  roleKey: 'min-w-28',
  sort: 'min-w-12',
  createTime: 'min-w-36',
}

/** 单元格文本样式：名称加重，时间用等宽数字并弱化，其余只做截断。 */
export function roleCellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'roleName') return `block truncate font-medium text-foreground ${minWidth}`
  if (columnId === 'createTime')
    return `block truncate text-muted-foreground tabular-nums ${minWidth}`
  return `block truncate ${minWidth}`
}

export interface RoleListInput {
  pageIndex: number
  pageSize: number
  roleName: string
  roleKey: string
  enabled: '' | 'true' | 'false'
}

export function toRoleQuery(input: RoleListInput): RoleQuery {
  const query: RoleQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  const roleName = input.roleName.trim()
  const roleKey = input.roleKey.trim()
  if (roleName) query.roleName = roleName
  if (roleKey) query.roleKey = roleKey
  if (input.enabled === 'true') query.enabled = true
  if (input.enabled === 'false') query.enabled = false
  return query
}
