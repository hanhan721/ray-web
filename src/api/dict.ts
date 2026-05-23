import { get } from '@/utils/request'

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
