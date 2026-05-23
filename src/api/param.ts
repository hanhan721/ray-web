import { get, post, put, del } from '@/utils/request'

/**
 * 系统参数实体
 */
export interface SystemParam {
  id: number
  paramKey: string
  paramValue: string
  paramType: string
  bizType: number
  encrypted: boolean
  description?: string
  createTime?: string
  updateTime?: string
  createBy?: number
  updateBy?: number
}

/**
 * 创建参数请求体
 */
export interface ParamCreateForm {
  paramKey: string
  paramValue: string
  paramType: string
  bizType: number
  encrypted?: boolean
  description?: string
}

/**
 * 更新参数请求体
 */
export interface ParamUpdateForm {
  id: number
  paramValue: string
  encrypted?: boolean
  description?: string
}

/**
 * 分页查询参数
 */
export interface ParamQuery extends PageQuery {
  bizType?: number
  paramType?: string
}

/**
 * 分页查询系统参数
 */
export function getParamPage(params: ParamQuery) {
  return get<IPage<SystemParam>>('/sys/param/page', params)
}

/**
 * 查询参数详情
 */
export function getParamById(id: number) {
  return get<SystemParam>(`/sys/param/${id}`)
}

/**
 * 按业务类型查询参数列表
 */
export function getParamsByBizType(bizType: number) {
  return get<SystemParam[]>('/sys/param/by-type', { bizType })
}

/**
 * 按参数键获取参数值（自动转换类型）
 */
export function getParamValue(paramKey: string) {
  return get<unknown>(`/sys/param/value/${paramKey}`)
}

/**
 * 按参数键获取字符串值
 */
export function getParamString(paramKey: string) {
  return get<string>(`/sys/param/string/${paramKey}`)
}

/**
 * 按参数键获取整数值
 */
export function getParamInteger(paramKey: string) {
  return get<number>(`/sys/param/integer/${paramKey}`)
}

/**
 * 按参数键获取布尔值
 */
export function getParamBoolean(paramKey: string) {
  return get<boolean>(`/sys/param/boolean/${paramKey}`)
}

/**
 * 创建参数
 */
export function createParam(data: ParamCreateForm) {
  return post<number>('/sys/param', data)
}

/**
 * 更新参数（只能改 paramValue 和 description）
 */
export function updateParam(data: ParamUpdateForm) {
  return put<void>('/sys/param', data)
}

/**
 * 删除参数
 */
export function deleteParams(ids: number[]) {
  return del<void>('/sys/param', ids)
}
