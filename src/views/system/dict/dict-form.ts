import type { DictDataQuery, DictDataRecord, DictTypeQuery, DictTypeRecord } from '@/api/dict'

export const DICT_PAGE_SIZES = [10, 20, 50, 100] as const

export function toTypeQuery(input: {
  pageIndex: number
  pageSize: number
  dictName: string
  dictType: string
  enabled: '' | 'true' | 'false'
}): DictTypeQuery {
  const query: DictTypeQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  const dictName = input.dictName.trim()
  const dictType = input.dictType.trim()
  if (dictName) query.dictName = dictName
  if (dictType) query.dictType = dictType
  if (input.enabled === 'true') query.enabled = true
  if (input.enabled === 'false') query.enabled = false
  return query
}

export function toDataQuery(input: {
  pageIndex: number
  pageSize: number
  dictType: string
  dictLabel: string
  enabled: '' | 'true' | 'false'
}): DictDataQuery {
  const query: DictDataQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
    dictType: input.dictType,
  }
  const dictLabel = input.dictLabel.trim()
  if (dictLabel) query.dictLabel = dictLabel
  if (input.enabled === 'true') query.enabled = true
  if (input.enabled === 'false') query.enabled = false
  return query
}

export function parseSort(text: string): number | null {
  if (!text.trim()) return 0
  const value = Number(text)
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) return null
  return value
}

export function dictTypeFormError(input: {
  dictName: string
  dictType: string
  remark: string
}): string {
  if (!input.dictName) return '请填写名称'
  if (input.dictName.length > 100) return '名称不能超过 100 个字符'
  if (!input.dictType) return '请填写类型编码'
  if (input.dictType.length > 100) return '类型编码不能超过 100 个字符'
  if (input.remark.length > 500) return '备注不能超过 500 个字符'
  return ''
}

export function dictDataFormError(input: {
  dictLabel: string
  dictValue: string
  sort: number | null
  cssClass: string
  listClass: string
  remark: string
}): string {
  if (!input.dictLabel) return '请填写标签'
  if (input.dictLabel.length > 100) return '标签不能超过 100 个字符'
  if (!input.dictValue) return '请填写字典值'
  if (input.dictValue.length > 100) return '字典值不能超过 100 个字符'
  if (input.sort === null) return '顺序需要是 -2147483648 到 2147483647 的整数'
  if (input.cssClass.length > 100 || input.listClass.length > 100) {
    return '样式类名不能超过 100 个字符'
  }
  if (input.remark.length > 500) return '备注不能超过 500 个字符'
  return ''
}

export function toDictTypeWrite(
  row: Pick<DictTypeRecord, 'id' | 'dictName' | 'dictType' | 'enabled' | 'remark'>,
  enabled = row.enabled,
): DictTypeRecord {
  return {
    id: row.id,
    dictName: row.dictName,
    dictType: row.dictType,
    enabled,
    remark: row.remark ?? '',
  }
}

export function toDictDataWrite(
  row: DictDataRecord,
  enabled = row.enabled !== false,
): DictDataRecord {
  return {
    id: row.id,
    dictType: row.dictType,
    dictLabel: row.dictLabel,
    dictValue: row.dictValue,
    sort: row.sort ?? 0,
    cssClass: row.cssClass ?? '',
    listClass: row.listClass ?? '',
    isDefault: row.isDefault === true,
    enabled,
    remark: row.remark ?? '',
  }
}

export function pageIndexFromResponse(current: number): number {
  return Math.max(0, current - 1)
}
