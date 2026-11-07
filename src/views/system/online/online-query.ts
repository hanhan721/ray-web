import type { OnlineSessionQuery } from '@/api/online'

export const ONLINE_PAGE_SIZES = [10, 20, 50, 100] as const

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

export function pageIndexFromResponse(current: number): number {
  return Math.max(0, current - 1)
}

export function formatLoginTime(value: unknown): string {
  if (typeof value === 'string') return value.replace('T', ' ')
  if (!Array.isArray(value) || value.length < 3) return ''
  const [year, month, day, hour = 0, minute = 0, second = 0] = value
  const pad = (part: unknown) => String(part).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}
