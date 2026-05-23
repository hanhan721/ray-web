import { get, post, put, del } from '@/utils/request'

/**
 * 字典类型实体
 */
export interface DictType {
  id: number
  dictName: string
  dictType: string // 唯一编码
  enabled: boolean
  remark?: string
  createTime?: string
}

/**
 * 字典类型表单
 */
export type DictTypeForm = Partial<Omit<DictType, 'id' | 'createTime'>>

/**
 * 字典类型查询参数
 */
export interface DictTypeQuery extends PageQuery {
  dictName?: string
  dictType?: string
  enabled?: boolean
}

/**
 * 分页查询字典类型
 */
export function getDictTypePage(params: DictTypeQuery) {
  return get<IPage<DictType>>('/sys/dict/type/page', params)
}

/**
 * 获取全部字典类型列表
 */
export function getDictTypeList() {
  return get<DictType[]>('/sys/dict/type/list')
}

/**
 * 获取字典类型详情
 */
export function getDictTypeById(id: number) {
  return get<DictType>(`/sys/dict/type/${id}`)
}

/**
 * 按编码查询字典类型
 */
export function getDictTypeByCode(dictType: string) {
  return get<DictType>(`/sys/dict/type/code/${dictType}`)
}

/**
 * 新增字典类型
 */
export function createDictType(data: DictTypeForm) {
  return post<void>('/sys/dict/type', data)
}

/**
 * 修改字典类型
 */
export function updateDictType(data: DictTypeForm & { id: number }) {
  return put<void>('/sys/dict/type', data)
}

/**
 * 删除字典类型
 */
export function deleteDictTypes(ids: number[]) {
  return del<void>('/sys/dict/type', ids)
}
