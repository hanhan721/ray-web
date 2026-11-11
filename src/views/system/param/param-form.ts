import type { ParamCreateForm, ParamQuery, ParamUpdateForm } from '@/api/param'
import type { ColumnSettingItem } from '@/components/common/column-settings'
import { ParamTypeOptions, type ParamType } from '@/types/enums'

export const PARAM_BIZ_OPTIONS = [
  { value: 0, label: '系统' },
  { value: 1, label: '用户管理' },
  { value: 2, label: '订单管理' },
  { value: 3, label: '支付' },
  { value: 4, label: '通知' },
  { value: 99, label: '其他' },
] as const

/** 筛选下拉需要字符串值，分类码在查询时再转回数字。 */
export const PARAM_BIZ_SELECT_OPTIONS = PARAM_BIZ_OPTIONS.map((item) => ({
  value: String(item.value),
  label: item.label,
}))

export const PARAM_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'paramKey', label: '参数键' },
  { key: 'paramValue', label: '参数值' },
  { key: 'paramType', label: '类型' },
  { key: 'bizType', label: '分类' },
  { key: 'encrypted', label: '加密' },
  { key: 'description', label: '描述' },
]

const CELL_SIZE: Record<string, string> = {
  paramKey: 'min-w-40 max-w-56',
  paramValue: 'min-w-40 max-w-52',
  paramType: 'min-w-20 max-w-24',
  bizType: 'min-w-20 max-w-24',
  encrypted: 'min-w-12 max-w-16',
  description: 'min-w-40 max-w-64',
}

/** 单元格文本样式：参数键加重，其余只做截断。 */
export function paramCellClass(columnId: string): string {
  const size = CELL_SIZE[columnId] ?? 'min-w-16'
  if (columnId === 'paramKey') return `block truncate font-medium text-foreground ${size}`
  return `block truncate ${size}`
}

const PARAM_TYPES = new Set<string>(ParamTypeOptions.map((item) => item.value))

export function isParamType(value: string): value is ParamType {
  return PARAM_TYPES.has(value)
}

export function paramTypeLabel(value: string): string {
  return ParamTypeOptions.find((item) => item.value === value)?.label ?? value
}

export function paramBizLabel(code: number): string {
  return PARAM_BIZ_OPTIONS.find((item) => item.value === code)?.label ?? String(code)
}

export function toParamQuery(input: {
  pageIndex: number
  pageSize: number
  bizType: string
  paramType: string
}): ParamQuery {
  const query: ParamQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  if (input.bizType !== '') {
    const bizType = Number(input.bizType)
    if (Number.isInteger(bizType)) query.bizType = bizType
  }
  if (isParamType(input.paramType)) query.paramType = input.paramType
  return query
}

export function paramValueToSend(value: string, paramType: ParamType): string {
  if (paramType === 'STRING' || paramType === 'STRING_LIST') return value
  return value.trim()
}

export function paramValueError(value: string, paramType: ParamType): string {
  if (paramType === 'INTEGER') {
    if (!/^[+-]?\d+$/.test(value)) return `参数值无法转换为整数：${value}`
    const number = BigInt(value.replace(/^\+/, ''))
    if (number < -2147483648n || number > 2147483647n) {
      return `参数值无法转换为整数：${value}`
    }
  }
  if (paramType === 'BOOLEAN') {
    const normalized = value.toLowerCase()
    const accepted =
      normalized === 'true' ||
      normalized === 'false' ||
      value === '1' ||
      value === '0' ||
      normalized === 'yes' ||
      normalized === 'no'
    if (!accepted) return `参数值无法转换为布尔值：${value}`
  }
  if (paramType === 'JSON') {
    try {
      JSON.parse(value)
    } catch {
      return `参数值不是有效的 JSON：${value}`
    }
  }
  return ''
}

export function paramFormError(input: {
  creating: boolean
  paramKey: string
  paramValue: string
  paramType: ParamType
  description: string
  originalDescription: string
}): string {
  if (input.creating) {
    if (!input.paramKey) return '请填写参数键'
    if (input.paramKey.length > 64) return '参数键不能超过 64 个字符'
  }
  if (!input.paramValue.trim()) return '请填写参数值'
  const valueError = paramValueError(
    paramValueToSend(input.paramValue, input.paramType),
    input.paramType,
  )
  if (valueError) return valueError
  if (input.description.length > 256) return '描述不能超过 256 个字符'
  if (input.originalDescription && !input.description) return '描述暂时不能清空。'
  return ''
}

export function toParamCreate(input: {
  paramKey: string
  paramValue: string
  paramType: ParamType
  bizType: number
  encrypted: boolean
  description: string
}): ParamCreateForm {
  const body: ParamCreateForm = {
    paramKey: input.paramKey,
    paramValue: paramValueToSend(input.paramValue, input.paramType),
    paramType: input.paramType,
    bizType: input.bizType,
    encrypted: input.encrypted,
  }
  if (input.description) body.description = input.description
  return body
}

export function toParamUpdate(input: {
  id: number
  paramValue: string
  paramType: ParamType
  encrypted: boolean
  description: string
}): ParamUpdateForm {
  const body: ParamUpdateForm = {
    id: input.id,
    paramValue: paramValueToSend(input.paramValue, input.paramType),
    encrypted: input.encrypted,
  }
  if (input.description) body.description = input.description
  return body
}
