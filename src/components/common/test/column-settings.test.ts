import { describe, expect, it } from 'vitest'
import { moveColumn, normalizeColumnOrder } from '../column-settings'

describe('moveColumn', () => {
  const order = ['a', 'b', 'c', 'd']

  it('places the moved key at the requested index', () => {
    expect(moveColumn(order, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveColumn(order, 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns a copy without changing the source for no-op or out-of-range moves', () => {
    const noop = moveColumn(order, 1, 1)
    expect(noop).toEqual(order)
    expect(noop).not.toBe(order)
    expect(moveColumn(order, -1, 2)).toEqual(order)
    expect(moveColumn(order, 0, 4)).toEqual(order)
  })
})

describe('normalizeColumnOrder', () => {
  const columns = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
  ]

  it('keeps the saved order and appends columns added later', () => {
    expect(normalizeColumnOrder(columns, ['c', 'a'])).toEqual(['c', 'a', 'b'])
  })

  it('drops unknown and duplicate keys', () => {
    expect(normalizeColumnOrder(columns, ['b', 'unknown', 'b'])).toEqual(['b', 'a', 'c'])
  })
})
