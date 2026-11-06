import type { RoleQuery } from '@/api/role'
import { applyColumnPreference, toColumnPreference } from '@/utils/column-preference'

export const ROLE_PAGE_SIZES = [10, 20, 50, 100] as const

export interface RoleColumnDefinition {
  key: string
  label: string
}

export const ROLE_DATA_COLUMNS: RoleColumnDefinition[] = [
  { key: 'roleName', label: '名称' },
  { key: 'roleKey', label: '标识' },
  { key: 'sort', label: '顺序' },
  { key: 'enabled', label: '状态' },
  { key: 'createTime', label: '创建时间' },
]

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

export function pageIndexFromResponse(current: number): number {
  return Math.max(0, current - 1)
}

export function isCurrentRequest(requestId: number, latestId: number): boolean {
  return requestId === latestId
}

const roleKeys = () => ROLE_DATA_COLUMNS.map((column) => column.key)

export function applyColumnConfig(saved: ColumnConfigItem[] | null) {
  return applyColumnPreference(roleKeys(), saved)
}

export function toColumnConfig(order: string[], visibility: Record<string, boolean>) {
  return toColumnPreference(roleKeys(), order, visibility)
}

export function tableColumnOrder(dataOrder: string[]): string[] {
  return ['select', ...dataOrder, 'actions']
}
