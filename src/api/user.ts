import { get, post, put, del } from '@/utils/request'
import type { Gender } from '@/types/enums'
import type { StorageFile } from '@/api/file'

/**
 * 用户实体
 */
export interface SysUser {
  id: number
  username: string
  nickname?: string
  email?: string
  phone?: string
  avatar?: StorageFile | null
  gender: Gender
  enabled: boolean
  remark?: string
  lastLoginTime?: string
  createTime?: string
  roleIds?: number[]
  deptIds?: number[]
}

/**
 * 用户表单类型
 */
export type UserForm = Partial<Omit<SysUser, 'id' | 'createTime' | 'lastLoginTime'>>

/**
 * 用户查询参数
 */
export interface UserQuery extends PageQuery {
  username?: string
  enabled?: boolean
}

/**
 * 分页查询用户
 */
export function getUserPage(params: UserQuery) {
  return get<IPage<SysUser>>('/sys/user/page', params)
}

/**
 * 用户详情（含角色、部门）
 */
export interface UserDetail {
  user: SysUser
  roleIds: number[]
  deptIds: number[]
}

/**
 * 获取用户详情（含角色、部门）
 */
export function getUserById(id: number) {
  return get<UserDetail>(`/sys/user/${id}`)
}

/**
 * 新增用户
 */
export function createUser(data: UserForm & { password: string }) {
  return post<void>('/sys/user', data)
}

/**
 * 修改用户
 */
export function updateUser(data: SysUser) {
  return put<void>('/sys/user', data)
}

/**
 * 删除用户
 */
export function deleteUsers(ids: number[]) {
  return del<void>('/sys/user', ids)
}

/**
 * 重置用户密码
 */
export function resetUserPassword(id: number, password: string) {
  return put<void>(`/sys/user/${id}/password`, { password })
}

/**
 * 分配角色
 */
export function assignUserRoles(id: number, roleIds: number[]) {
  return put<void>(`/sys/user/${id}/roles`, roleIds)
}

/**
 * 分配部门
 */
export function assignUserDepts(id: number, deptIds: number[]) {
  return put<void>(`/sys/user/${id}/depts`, deptIds)
}

/**
 * 切换用户状态
 */
export function updateUserStatus(id: number, enabled: boolean) {
  return put<void>(`/sys/user/${id}/status`, null, { params: { enabled } })
}
