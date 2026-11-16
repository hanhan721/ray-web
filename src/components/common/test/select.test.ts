import { describe, expect, it } from 'vitest'
import { splitVisibleOptions } from '../select'

describe('splitVisibleOptions', () => {
  const options = [1, 2, 3, 4, 5]

  it('keeps every option when no limit is configured', () => {
    expect(splitVisibleOptions(options)).toEqual({ visible: options, hiddenCount: 0 })
  })

  it('caps the visible options and reports the remainder', () => {
    expect(splitVisibleOptions(options, 3)).toEqual({ visible: [1, 2, 3], hiddenCount: 2 })
    expect(splitVisibleOptions(options, 5)).toEqual({ visible: options, hiddenCount: 0 })
  })

  it('treats zero or negative limits as no limit', () => {
    expect(splitVisibleOptions(options, 0)).toEqual({ visible: options, hiddenCount: 0 })
    expect(splitVisibleOptions(options, -1)).toEqual({ visible: options, hiddenCount: 0 })
  })
})
