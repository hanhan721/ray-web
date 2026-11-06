import { del, get, post, put } from '@/utils/request'
import type { RequestConfig } from '@/types/request'

/**
 * 字典数据项
 */
export interface DictItem {
  /** 字典标签（显示文本） */
  label: string
  /** 字典值 */
  value: string
  /** 标签类型（用于 n-tag） */
  tagType?: 'default' | 'success' | 'warning' | 'error' | 'info'
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 后端字典数据结构
 */
interface DictData {
  id: number
  dictType: string
  dictLabel: string
  dictValue: string
  sort: number
  cssClass?: string
  listClass?: string
  isDefault?: boolean
  enabled?: boolean
}

/**
 * 将后端字典数据转换为前端字典项
 */
function transformDictData(data: DictData): DictItem {
  return {
    label: data.dictLabel,
    value: data.dictValue,
    tagType: mapListClassToTagType(data.listClass),
    disabled: data.enabled === false,
  }
}

/**
 * 将 listClass 映射为 n-tag 类型
 */
function mapListClassToTagType(listClass?: string): DictItem['tagType'] {
  const mapping: Record<string, DictItem['tagType']> = {
    default: 'default',
    primary: 'info',
    success: 'success',
    warning: 'warning',
    danger: 'error',
    info: 'info',
  }
  return listClass ? mapping[listClass] || 'default' : 'default'
}

/**
 * 根据字典类型获取字典数据列表
 * @param dictType 字典类型
 */
export async function getDictByType(dictType: string): Promise<DictItem[]> {
  const data = await get<DictData[]>(`/sys/dict/data/type/${dictType}`)
  return data.map(transformDictData)
}

export interface DictTypeRecord {
  id: number
  dictName: string
  dictType: string
  enabled: boolean
  remark?: string
}

export interface DictDataRecord {
  id: number
  dictType: string
  dictLabel: string
  dictValue: string
  sort: number
  cssClass?: string
  listClass?: string
  isDefault?: boolean
  enabled?: boolean
  remark?: string
}

export interface DictTypeQuery extends PageQuery {
  dictName?: string
  dictType?: string
  enabled?: boolean
}

export interface DictDataQuery extends PageQuery {
  dictType?: string
  dictLabel?: string
  enabled?: boolean
}

export function getDictTypePage(query: DictTypeQuery, config?: RequestConfig) {
  return get<IPage<DictTypeRecord>>('/sys/dict/type/page', query, config)
}

export function createDictType(
  data: Omit<DictTypeRecord, 'id'> & { id?: number },
  config?: RequestConfig,
) {
  return post<void>('/sys/dict/type', data, config)
}

export function updateDictType(data: DictTypeRecord, config?: RequestConfig) {
  return put<void>('/sys/dict/type', data, config)
}

export function deleteDictTypes(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/dict/type', ids, config)
}

export function getDictDataPage(query: DictDataQuery, config?: RequestConfig) {
  return get<IPage<DictDataRecord>>('/sys/dict/data/page', query, config)
}

export function createDictData(data: Omit<DictDataRecord, 'id'>, config?: RequestConfig) {
  return post<void>('/sys/dict/data', data, config)
}

export function updateDictData(data: DictDataRecord, config?: RequestConfig) {
  return put<void>('/sys/dict/data', data, config)
}

export function deleteDictData(ids: number[], config?: RequestConfig) {
  return del<void>('/sys/dict/data', ids, config)
}
