import { get, post, put, del } from '@/utils/request'
import type { RequestConfig } from '@/types/request'
import type { ParamType } from '@/types/enums'

/**
 * 系统参数实体
 */
export interface SystemParam {
  id: number
  paramKey: string
  paramValue: string
  paramType: ParamType
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
  paramType: ParamType
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
  paramType?: ParamType
}

/**
 * 分页查询系统参数
 */
export function getParamPage(params: ParamQuery, config?: RequestConfig) {
  return get<IPage<SystemParam>>('/sys/param/page', params, config)
}

/**
 * 查询参数详情
 */
export function getParamById(id: number, config?: RequestConfig) {
  return get<SystemParam>(`/sys/param/${id}`, undefined, config)
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
export function createParam(data: ParamCreateForm, config?: RequestConfig) {
  return post<number>('/sys/param', data, config)
}

/**
 * 更新参数值、加密状态和描述。键、类型和业务分类不能改。
 */
export function updateParam(data: ParamUpdateForm, config?: RequestConfig) {
  return put<void>('/sys/param', data, config)
}

/**
 * 删除参数
 */
export function deleteParams(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/param', ids, config)
}
