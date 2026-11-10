import type { OnlineSessionQuery } from '@/api/online'
import type { ColumnSettingItem } from '@/components/common/column-settings'

export const ONLINE_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'username', label: '账号' },
  { key: 'nickname', label: '昵称' },
  { key: 'loginIp', label: '登录 IP' },
  { key: 'browser', label: '浏览器' },
  { key: 'os', label: '系统' },
  { key: 'loginTime', label: '登录时间' },
]

const CELL_MIN_WIDTH: Record<string, string> = {
  username: 'min-w-28',
  nickname: 'min-w-24',
  loginIp: 'min-w-28',
  browser: 'min-w-24',
  os: 'min-w-20',
  loginTime: 'min-w-36',
}

/** 单元格文本样式：账号加重，登录时间用等宽数字并弱化，其余只做截断。 */
export function onlineCellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'username') return `block truncate font-medium text-foreground ${minWidth}`
  if (columnId === 'loginTime')
    return `block truncate text-muted-foreground tabular-nums ${minWidth}`
  return `block truncate ${minWidth}`
}

const TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

export function toOnlineTime(value: string, bound: 'start' | 'end'): string {
  const text = value.trim()
  if (!text || !TIME_PATTERN.test(text)) return ''
  if (text.length === 16) return bound === 'start' ? `${text}:00` : `${text}:59`
  return text
}

export function onlineQueryError(startTime: string, endTime: string): string {
  const start = startTime.trim()
  const end = endTime.trim()
  if (start && !TIME_PATTERN.test(start)) return '起始时间格式无效'
  if (end && !TIME_PATTERN.test(end)) return '结束时间格式无效'
  const startValue = toOnlineTime(start, 'start')
  const endValue = toOnlineTime(end, 'end')
  if (startValue && endValue && startValue > endValue) return '起始时间不能晚于结束时间'
  return ''
}

export function toOnlineQuery(input: {
  pageIndex: number
  pageSize: number
  startTime: string
  endTime: string
}): OnlineSessionQuery {
  const query: OnlineSessionQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  const startTime = toOnlineTime(input.startTime, 'start')
  const endTime = toOnlineTime(input.endTime, 'end')
  if (startTime) query.startTime = startTime
  if (endTime) query.endTime = endTime
  return query
}

export function formatLoginTime(value: unknown): string {
  if (typeof value === 'string') return value.replace('T', ' ')
  if (!Array.isArray(value) || value.length < 3) return ''
  const [year, month, day, hour = 0, minute = 0, second = 0] = value
  const pad = (part: unknown) => String(part).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}
