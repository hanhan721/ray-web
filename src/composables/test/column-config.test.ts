import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, shallowRef, type EffectScope } from 'vue'
import { getColumnConfig, resetColumnConfig, saveColumnConfig } from '@/api/column-config'
import { RequestError } from '@/utils/request'
import { useColumnConfig } from '../useColumnConfig'
import { deferred } from './deferred'

vi.mock('@/api/column-config', () => ({
  getColumnConfig: vi.fn(),
  saveColumnConfig: vi.fn(),
  resetColumnConfig: vi.fn(),
}))

const scopes: EffectScope[] = []
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
]
const savedCode: ColumnConfigItem[] = [
  { key: 'code', visible: false, sort: 0, width: null, fixed: null },
]

function setup(pageKey = shallowRef<string | null>('page-a')) {
  const source = shallowRef(columns)
  const scope = effectScope()
  scopes.push(scope)
  const config = scope.run(() => useColumnConfig(source, pageKey))!
  return { config, source, pageKey }
}

beforeEach(() => {
  vi.mocked(getColumnConfig).mockReset().mockResolvedValue(null)
  vi.mocked(saveColumnConfig).mockReset().mockResolvedValue(undefined)
  vi.mocked(resetColumnConfig).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
})

describe('reactive column configuration', () => {
  it('loads the new page key and ignores an older page response', async () => {
    const first = deferred<ColumnConfigItem[] | null>()
    vi.mocked(getColumnConfig).mockReturnValueOnce(first.promise).mockResolvedValueOnce(savedCode)
    const { config, pageKey } = setup()
    pageKey.value = 'page-b'
    await nextTick()
    expect(vi.mocked(getColumnConfig).mock.calls.map(([key]) => key)).toEqual(['page-a', 'page-b'])
    expect(config.order.value).toEqual(['code', 'name'])
    first.resolve(null)
    await nextTick()
    expect(config.visibility.value.code).toBe(false)

    await config.save({ order: ['name', 'code'], visibility: { code: true } })
    expect(vi.mocked(saveColumnConfig).mock.calls[0]?.[0]).toBe('page-b')
    await config.reset()
    expect(vi.mocked(resetColumnConfig).mock.calls[0]?.[0]).toBe('page-b')
    expect(config.order.value).toEqual(['name', 'code'])
    expect(config.visibility.value.code).toBe(true)
  })

  it('reconciles new columns with the saved visibility and order', async () => {
    vi.mocked(getColumnConfig).mockResolvedValueOnce(savedCode)
    const { config, source } = setup()
    await nextTick()
    source.value = [
      { key: 'code', label: 'Code' },
      { key: 'remark', label: 'Remark' },
    ]
    expect(config.order.value).toEqual(['code', 'remark'])
    expect(config.visibility.value).toEqual({ code: false, remark: true })
  })

  it('keeps a saved draft when the initial read completes later', async () => {
    const read = deferred<ColumnConfigItem[] | null>()
    vi.mocked(getColumnConfig).mockReturnValueOnce(read.promise)
    const { config } = setup()
    await config.save({ order: ['code', 'name'], visibility: { code: false } })
    read.resolve(null)
    await nextTick()
    expect(config.order.value).toEqual(['code', 'name'])
    expect(config.visibility.value.code).toBe(false)
  })

  it.each(['success', 'failure'] as const)(
    'ignores an old page save %s after switching pages',
    async (result) => {
      const write = deferred<void>()
      vi.mocked(saveColumnConfig).mockReturnValueOnce(write.promise)
      const { config, pageKey } = setup()
      await nextTick()
      const pendingSave = config.save({ order: ['code', 'name'], visibility: { code: false } })
      pageKey.value = 'page-b'
      await nextTick()
      config.setDialogOpen(true)
      if (result === 'success') write.resolve()
      else write.reject(new RequestError('old page error'))
      await pendingSave
      expect(config.order.value).toEqual(['name', 'code'])
      expect(config.visibility.value.code).toBe(true)
      expect(config.dialogOpen.value).toBe(true)
      expect(config.error.value).toBe('')
      expect(config.saving.value).toBe(false)
    },
  )
})
