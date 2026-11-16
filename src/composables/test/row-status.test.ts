import { describe, expect, it, vi } from 'vitest'
import { useRowStatus } from '../useRowStatus'
import { deferred } from './deferred'

describe('row status requests', () => {
  it('locks each row independently and ignores repeated submissions for a pending row', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    const update = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const setRowEnabled = vi.fn()
    const status = useRowStatus({ update, setRowEnabled })

    const firstRequest = status.change(1, false)
    const secondRequest = status.change(2, true)
    await status.change(1, true)
    expect(update.mock.calls).toEqual([
      [1, false],
      [2, true],
    ])
    expect([...status.pendingIds.value]).toEqual([1, 2])

    first.resolve()
    await firstRequest
    expect([...status.pendingIds.value]).toEqual([2])
    expect(setRowEnabled.mock.calls).toEqual([[1, false]])

    second.resolve()
    await secondRequest
    expect(status.pendingIds.value.size).toBe(0)
    expect(setRowEnabled.mock.calls).toEqual([
      [1, false],
      [2, true],
    ])
  })

  it('keeps the original value after failure and unlocks the row for retry', async () => {
    const update = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(undefined)
    const setRowEnabled = vi.fn()
    const status = useRowStatus({ update, setRowEnabled })

    await status.change(1, false)
    expect(status.pendingIds.value.size).toBe(0)
    expect(setRowEnabled.mock.calls).toEqual([])
    await status.change(1, false)
    expect(update).toHaveBeenCalledTimes(2)
    expect(setRowEnabled.mock.calls).toEqual([[1, false]])
  })
})
