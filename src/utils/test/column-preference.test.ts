import { describe, expect, it } from 'vitest'
import { applyColumnPreference, toColumnPreference } from '@/utils/column-preference'

const keys = ['name', 'code', 'remark']

describe('column preference', () => {
  it('uses the local order when nothing is saved and appends keys the server does not know', () => {
    expect(applyColumnPreference(keys, null).order).toEqual(keys)
    const applied = applyColumnPreference(keys, [
      { key: 'removed', visible: true, sort: 0, width: null, fixed: null },
      { key: 'code', visible: false, sort: 1, width: 40, fixed: 'left' },
    ])
    expect(applied.order).toEqual(['code', 'name', 'remark'])
    expect(applied.visibility.code).toBe(false)
    expect(applied.visibility.name).toBe(true)
    expect(toColumnPreference(keys, applied.order, applied.visibility)).toEqual([
      { key: 'code', visible: false, sort: 0, width: null, fixed: null },
      { key: 'name', visible: true, sort: 1, width: null, fixed: null },
      { key: 'remark', visible: true, sort: 2, width: null, fixed: null },
    ])
  })
})
