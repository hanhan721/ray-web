import { get, post, put, del } from '@/utils/request'
import type { PermissionTree, PermissionForm } from '@/types/permission'

// 权限树 session 级缓存，刷新页面自动失效
let _permissionTreeCache: PermissionTree[] | null = null

/**
 * 获取权限树（含按钮，管理用）
 * 同一会话内只请求一次，权限变更后调用 clearPermissionTreeCache() 手动失效
 */
export function getPermissionTree() {
  if (_permissionTreeCache) return Promise.resolve(_permissionTreeCache)
  return get<PermissionTree[]>('/sys/permission/tree').then((tree) => {
    _permissionTreeCache = tree
    return tree
  })
}

/**
 * 清除权限树缓存（在增删改权限后调用）
 */
export function clearPermissionTreeCache() {
  _permissionTreeCache = null
}

/**
 * 获取菜单树（不含按钮，菜单渲染用）
 */
export function getMenuTree() {
  return get<PermissionTree[]>('/sys/permission/menu-tree')
}

/**
 * 新增权限
 */
export function createPermission(data: PermissionForm) {
  return post<void>('/sys/permission', data).then((res) => {
    clearPermissionTreeCache()
    return res
  })
}

/**
 * 修改权限
 */
export function updatePermission(data: PermissionForm & { id: number }) {
  return put<void>('/sys/permission', data).then((res) => {
    clearPermissionTreeCache()
    return res
  })
}

/**
 * 删除权限
 */
export function deletePermission(id: number) {
  return del<void>('/sys/permission', [id]).then((res) => {
    clearPermissionTreeCache()
    return res
  })
}

/**
 * 查询角色拥有的权限ID列表
 */
export function getRolePermissions(roleId: number) {
  return get<number[]>(`/sys/permission/role/${roleId}`)
}

/**
 * 保存角色权限（覆盖原有权限）
 */
export function saveRolePermissions(roleId: number, permissionIds: number[]) {
  return post<void>(`/sys/permission/role/${roleId}`, permissionIds)
}

/**
 * 清除后端权限缓存
 * 权限: system:permission:cache
 */
export function clearPermissionCache() {
  return del<void>('/sys/permission/cache')
}
