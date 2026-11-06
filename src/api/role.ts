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
  enabled?: boolean
}

/**
 * 分页查询角色
 */
export function getRolePage(params: RoleQuery, config?: RequestConfig) {
  return get<IPage<Role>>('/sys/role/page', params, config)
}

/**
 * 获取全部角色列表
 */
export function getRoleList(config?: RequestConfig) {
  return get<Role[]>('/sys/role/list', undefined, config)
}

/**
 * 获取角色详情。权限 ID 由权限接口单独返回。
 */
export function getRoleById(id: number, config?: RequestConfig) {
  return get<Role>(`/sys/role/${id}`, undefined, config)
}

/**
 * 新增角色
 */
export function createRole(data: RoleForm, config?: RequestConfig) {
  return post<void>('/sys/role', data, config)
}

/**
 * 修改角色
 */
export function updateRole(data: Role, config?: RequestConfig) {
  return put<void>('/sys/role', data, config)
}

/**
 * 删除角色
 */
export function deleteRoles(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/role', ids, config)
}

/**
 * 切换角色状态
 */
export function updateRoleStatus(id: number, enabled: boolean) {
  return put<void>(`/sys/role/${id}/status`, null, { params: { enabled } })
}
