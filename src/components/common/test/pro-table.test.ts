import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, h, nextTick, shallowRef, ssrContextKey, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { ColumnSettingsDraft } from '../column-settings'
import { getColumnConfig, saveColumnConfig } from '@/api/column-config'
import RayTable from '../RayTable.vue'

vi.mock('@/api/column-config', () => ({
  getColumnConfig: vi.fn(),
  saveColumnConfig: vi.fn(),
  resetColumnConfig: vi.fn(),
}))

const checkboxes = vi.hoisted(() => [] as Array<{ checked: boolean; toggle: () => void }>)
vi.mock('@/components/ui/checkbox', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Checkbox: defineComponent({
      props: { modelValue: Boolean },
      emits: ['update:modelValue'],
      setup(props, { emit }) {
        checkboxes.push({
          checked: props.modelValue,
          toggle: () => emit('update:modelValue', !props.modelValue),
        })
        return () => h('button', { role: 'checkbox', 'aria-checked': props.modelValue })
      },
    }),
  }
})

// Node 环境把 SFC 编译为 SSR。用内存宿主保留同一实例，以验证运行中的 props 更新。
const renderer = createRenderer<object, object>({
  insert: () => {},
  remove: () => {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
  patchProp: () => {},
})

const columns = [{ key: 'name', label: 'Name' }]
const rows = [
  { id: 'user-a', name: 'Ada', code: 'A' },
  { id: 'user-b', name: 'Grace', code: 'G' },
]
const baseProps = { columns, rows, total: 2, pageIndex: 0, pageSize: 10 }
const unmounts: Array<() => void> = []

function mount(props: Record<string, unknown> = {}) {
  const source = shallowRef({ ...baseProps, ...props })
  const component = { ...RayTable, render: () => null }
  let vnode: VNode
  const app = renderer.createApp({ render: () => (vnode = h(component, source.value)) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  unmounts.push(() => app.unmount())
  const state = (
    vnode!.component as unknown as {
      setupState: {
        table: { getVisibleLeafColumns: () => Array<{ id: string }> }
        saveColumns: (draft: ColumnSettingsDraft) => Promise<void> | void
        onRowClick: (row: unknown, event: MouseEvent) => void
      }
    }
  ).setupState
  return {
    state,
    async update(next: Record<string, unknown>) {
      source.value = { ...source.value, ...next }
      await nextTick()
    },
  }
}

beforeEach(() => {
  checkboxes.length = 0
  vi.mocked(getColumnConfig).mockReset().mockResolvedValue(null)
  vi.mocked(saveColumnConfig).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount())
  vi.unstubAllGlobals()
})

describe('RayTable contracts', () => {
  it('emits the clicked row while ignoring interactive controls and text selection', () => {
    class Target {
      private interactive: boolean
      constructor(interactive: boolean) { this.interactive = interactive }
      closest() { return this.interactive ? this : null }
    }
    let selection = ''
    vi.stubGlobal('Element', Target)
    vi.stubGlobal('window', { getSelection: () => ({ toString: () => selection }) })
    const onRowClick = vi.fn()
    const table = mount({ onRowClick })
    const event = (interactive: boolean) => ({ target: new Target(interactive) }) as unknown as MouseEvent
    table.state.onRowClick(rows[0], event(false))
    table.state.onRowClick(rows[0], event(true))
    selection = 'Ada'
    table.state.onRowClick(rows[1], event(false))
    expect(onRowClick).toHaveBeenCalledExactlyOnceWith(rows[0])
  })
  it('updates data columns and optional selection/actions columns without remounting', async () => {
    const table = mount()
    const headers = () => table.state.table.getVisibleLeafColumns().map((column) => column.id)
    expect(headers()).toEqual(['select', 'name', 'actions'])
    await table.update({
      columns: [{ key: 'code', label: 'Code' }],
      selectable: false,
      showActions: false,
    })
    expect(headers()).toEqual(['code'])
    await table.update({ selectable: true, showActions: true })
    expect(headers()).toEqual(['select', 'code', 'actions'])
  })

  it.each(['user-a', 7])(
    'preserves the row key %s in selection events and checked state',
    async (id) => {
      const toggle = vi.fn()
      // SSR 验证真实模板的选择状态和事件，保留字符串与数字两种业务主键。
      const html = await renderToString(
        h(
          { ...RayTable },
          {
            ...baseProps,
            rows: [
              { key: id, name: 'Ada' },
              { key: typeof id === 'string' ? 'user-b' : 8, name: 'Grace' },
            ],
            rowKey: (row: { key: string | number }) => row.key,
            selectedIds: [id],
            'onToggle-row': toggle,
          },
        ),
      )
      expect(html).toContain('Ada')
      expect(html).toContain('Grace')
      expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([false, true, false])
      checkboxes[1]!.toggle()
      expect(toggle.mock.calls).toEqual([[id, false]])
    },
  )

  it('loads and saves using the updated page key', async () => {
    const table = mount({ pageKey: 'page-a' })
    await nextTick()
    await table.update({ pageKey: 'page-b' })
    expect(vi.mocked(getColumnConfig).mock.calls.map(([key]) => key)).toEqual(['page-a', 'page-b'])
    await table.state.saveColumns({ order: ['name'], visibility: { name: true } })
    expect(vi.mocked(saveColumnConfig).mock.calls[0]?.[0]).toBe('page-b')
  })
})
