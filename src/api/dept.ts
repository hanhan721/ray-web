import type { RequestConfig } from '@/types/request'
import { get, post, put, del } from '@/utils/request'

/**
 * 部门实体
 */
export interface Dept {
  id: number
  parentId: number
  deptName: string
  sort: number
  leader?: string
  phone?: string
  email?: string
  enabled: boolean
  createTime?: string
}

/**
 * 部门树
 */
export type DeptTree = WithChildren<Dept>

/**
 * 部门表单
 */
export type DeptForm = Partial<Omit<Dept, 'id' | 'createTime'>> & {
  parentId: number
  deptName: string
}

/**
 * 获取部门树
 */
export function getDeptTree(config?: RequestConfig) {
  return get<DeptTree[]>('/sys/dept/tree', undefined, config)
}

/**
 * 获取部门列表
 */
export function getDeptList() {
  return get<Dept[]>('/sys/dept/list')
}

/**
 * 获取部门详情
 */
export function getDeptById(id: number) {
  return get<Dept>(`/sys/dept/${id}`)
}

/**
 * 新增部门
 */
export function createDept(data: DeptForm) {
  return post<void>('/sys/dept', data)
}

/**
 * 修改部门
 */
export function updateDept(data: DeptForm & { id: number }) {
  return put<void>('/sys/dept', data)
}

/**
 * 删除部门
 */
export function deleteDept(id: number) {
  return del<void>(`/sys/dept/${id}`)
}
