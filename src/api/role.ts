import type { RequestConfig } from '@/types/request'
import { get, post, put, del } from '@/utils/request'

/**
 * 角色实体
 */
export interface Role {
  id: number
  roleName: string
  roleKey: string
  sort: number
  enabled: boolean
  remark?: string
  createTime?: string
  permissionIds?: number[]
}

/**
 * 角色表单类型
 */
export type RoleForm = Partial<Omit<Role, 'id' | 'createTime'>>

/**
 * 角色查询参数
 */
export interface RoleQuery extends PageQuery {
  roleName?: string
  roleKey?: string
}

/**
 * 分页查询角色
 */
export function getRolePage(params: RoleQuery) {
  return get<IPage<Role>>('/sys/role/page', params)
}

/**
 * 获取全部角色列表
 */
export function getRoleList(config?: RequestConfig) {
  return get<Role[]>('/sys/role/list', undefined, config)
}

/**
 * 获取角色详情（含权限ID）
 */
export function getRoleById(id: number) {
  return get<Role>(`/sys/role/${id}`)
}

/**
 * 新增角色
 */
export function createRole(data: RoleForm) {
  return post<void>('/sys/role', data)
}

/**
 * 修改角色
 */
export function updateRole(data: Role) {
  return put<void>('/sys/role', data)
}

/**
 * 删除角色
 */
export function deleteRoles(ids: number[]) {
  return del<void>('/sys/role', ids)
}

/**
 * 切换角色状态
 */
export function updateRoleStatus(id: number, enabled: boolean) {
  return put<void>(`/sys/role/${id}/status`, null, { params: { enabled } })
}
