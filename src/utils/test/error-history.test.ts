import { describe, expect, it, vi } from 'vitest'

describe('error history', () => {
  it('keeps the most recent 30 errors in arrival order, including repeated messages', async () => {
    vi.resetModules()
    const { errorHistory, recordError } = await import('@/utils/error-history')
    for (let i = 1; i <= 31; i++) recordError(`错误 ${i}`, `/api/${i}`)
    expect(errorHistory.value).toHaveLength(30)
    expect(errorHistory.value[0]?.message).toBe('错误 2')
    expect(errorHistory.value[29]?.message).toBe('错误 31')
    expect(errorHistory.value[0]?.path).toBe('/api/2')
    recordError('错误 31', '/api/31')
    expect(errorHistory.value.slice(-2).map((entry) => entry.message)).toEqual(['错误 31', '错误 31'])
  })
})
