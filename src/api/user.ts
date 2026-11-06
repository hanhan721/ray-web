import type { Gender } from '@/types/enums'
import type { RequestConfig } from '@/types/request'
import { get, post, put, del } from '@/utils/request'

/** `@StorageFile` 在响应里把文件 ID 序列化成的对象。 */
export interface UserFileView {
  fileId: number
  name: string
  url: string
  ext: string
  size: number
}

/**
 * 用户实体。列表里的 `avatarFileId` 是文件视图，不是数字。
 */
export interface SysUser {
  id: number
  username: string
  nickname?: string | null
  email?: string | null
  phone?: string | null
  avatarFileId?: UserFileView | null
  gender?: Gender | null
  enabled?: boolean | null
  remark?: string | null
  lastLoginTime?: string | null
  lastLoginIp?: string | null
  createTime?: string | null
}

/** 新增和修改提交给后端的字段。头像只传文件 ID，避免把文件视图写回去。 */
export interface UserWrite {
  id?: number
  username: string
  password?: string
  nickname?: string
  email?: string
  phone?: string
  avatarFileId?: number | null
  gender?: Gender
  enabled?: boolean
  remark?: string
}

/**
 * 用户查询参数。后端不接收 orderBy，默认按 id 倒序。
 */
export interface UserQuery extends PageQuery {
  username?: string
  nickname?: string
  enabled?: boolean
}

/**
 * 分页查询用户
 */
export function getUserPage(params: UserQuery, config?: RequestConfig) {
  return get<IPage<SysUser>>('/sys/user/page', params, config)
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
export function getUserById(id: number, config?: RequestConfig) {
  return get<UserDetail>(`/sys/user/${id}`, undefined, config)
}

/**
 * 新增用户
 */
export function createUser(data: UserWrite & { password: string }, config?: RequestConfig) {
  return post<void>('/sys/user', data, config)
}

/**
 * 修改用户
 */
export function updateUser(data: UserWrite & { id: number }, config?: RequestConfig) {
  return put<void>('/sys/user', data, config)
}

/**
 * 删除用户
 */
export function deleteUsers(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/user', ids, config)
}

/**
 * 重置用户密码
 */
export function resetUserPassword(id: number, password: string, config?: RequestConfig) {
  return put<void>(`/sys/user/${id}/password`, { password }, config)
}

/**
 * 分配角色
 */
export function assignUserRoles(id: number, roleIds: number[], config?: RequestConfig) {
  return put<void>(`/sys/user/${id}/roles`, roleIds, config)
}

/**
 * 分配部门
 */
export function assignUserDepts(id: number, deptIds: number[], config?: RequestConfig) {
  return put<void>(`/sys/user/${id}/depts`, deptIds, config)
}

/**
 * 切换用户状态
 */
export function updateUserStatus(id: number, enabled: boolean) {
  return put<void>(`/sys/user/${id}/status`, null, { params: { enabled } })
}
