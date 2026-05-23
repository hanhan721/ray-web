/**
 * 权限/菜单类型定义
 */

import type { PermissionType } from './enums'

// 重新导出枚举类型，方便统一导入
export type { PermissionType } from './enums'

// 权限/菜单实体
export interface Permission {
  id: number
  parentId: number
  name: string
  type: PermissionType
  url: string
  component: string
  routeName?: string
  redirect?: string
  code?: string
  icon?: string
  sort: number
  hidden: boolean
  keepAlive: boolean
  enabled: boolean
  description?: string
}

// 权限树（带 children）
export type PermissionTree = WithChildren<Permission>

// 权限表单（新增/编辑共用）
export type PermissionForm = Partial<Omit<Permission, 'id'>> & {
  id?: number
  parentId: number
  name: string
  type: PermissionType
}

// 类型别名（向后兼容，建议逐步迁移到新命名）
export type PermissionVO = PermissionTree
