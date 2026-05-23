import { get, post, put, del } from '@/utils/request'

/**
 * 字典数据实体
 */
export interface DictData {
  id: number
  dictType: string // 关联 DictType.dictType
  dictLabel: string
  dictValue: string
  sort: number
  cssClass?: string
  listClass?: string
  isDefault: boolean
  enabled: boolean
  createTime?: string
}

/**
 * 字典数据表单
 */
export type DictDataForm = Partial<Omit<DictData, 'id' | 'createTime'>>

/**
 * 字典数据查询参数
 */
export interface DictDataQuery extends PageQuery {
  dictType?: string
  dictLabel?: string
  enabled?: boolean
}

/**
 * 分页查询字典数据
 */
export function getDictDataPage(params: DictDataQuery) {
  return get<IPage<DictData>>('/sys/dict/data/page', params)
}

/**
 * 按字典类型查询字典数据列表
 */
export function getDictDataByType(dictType: string) {
  return get<DictData[]>(`/sys/dict/data/type/${dictType}`)
}

/**
 * 获取字典数据详情
 */
export function getDictDataById(id: number) {
  return get<DictData>(`/sys/dict/data/${id}`)
}

/**
 * 新增字典数据
 */
export function createDictData(data: DictDataForm) {
  return post<void>('/sys/dict/data', data)
}

/**
 * 修改字典数据
 */
export function updateDictData(data: DictDataForm & { id: number }) {
  return put<void>('/sys/dict/data', data)
}

/**
 * 删除字典数据
 */
export function deleteDictData(ids: number[]) {
  return del<void>('/sys/dict/data', ids)
}
