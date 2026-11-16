import { describe, expect, it } from 'vitest'
import { onlineQueryError, toOnlineQuery, toOnlineTime } from '@/views/system/online/online-query'

describe('online query', () => {
  it('omits empty times and expands a selected minute', () => {
    expect(
      toOnlineQuery({ pageIndex: 0, pageSize: 10, startTime: '', endTime: '' }),
    ).toEqual({ pageNum: 1, pageSize: 10 })
    expect(toOnlineTime('2026-11-07T10:15', 'start')).toBe('2026-11-07T10:15:00')
    expect(toOnlineTime('2026-11-07T10:15', 'end')).toBe('2026-11-07T10:15:59')
    expect(
      toOnlineQuery({
        pageIndex: 1,
        pageSize: 20,
        startTime: '2026-11-07T10:15',
        endTime: '2026-11-07T10:15',
      }),
    ).toEqual({
      pageNum: 2,
      pageSize: 20,
      startTime: '2026-11-07T10:15:00',
      endTime: '2026-11-07T10:15:59',
    })
    expect(onlineQueryError('2026-11-07T10:15', '2026-11-07T10:15')).toBe('')
  })

  it('blocks a start time later than the end time', () => {
    expect(onlineQueryError('2026-11-07T11:00', '2026-11-07T10:00')).toBe('起始时间不能晚于结束时间')
    expect(onlineQueryError('昨天', '')).toBe('起始时间格式无效')
  })
})
