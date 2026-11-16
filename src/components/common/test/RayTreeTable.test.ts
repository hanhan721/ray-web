import { describe, expect, it } from 'vitest'
import { createRenderer, createSSRApp, h, nextTick, shallowRef, ssrContextKey, type Component, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RayTreeTable from '../RayTreeTable.vue'

const rows = [{ id: 1, name: '总部', children: [{ id: 2, name: '研发', children: [{ id: 3, name: '平台', children: [] }] }] }]
type Row = typeof rows[number]
async function render(match?: (row: Row) => boolean, filterMode: 'ancestors' | 'branch' = 'ancestors') {
  return renderToString(createSSRApp({ render: () => h(RayTreeTable as unknown as Component, {
    rows, columns: [{ key: 'name', label: '名称' }], treeColumn: 'name',
    rowKey: (row: Row) => row.id, children: (row: Row) => row.children,
    rowLabel: (row: Row) => row.name, match, filterMode,
  }) }))
}
describe('RayTreeTable', () => {
  it('retains ancestor paths for matching descendants', async () => {
    const html = await render(row => row.name === '平台')
    expect(html).toContain('总部')
    expect(html).toContain('研发')
    expect(html).toContain('平台')
    expect(html).toContain('匹配 1 条')
  })
  it('includes descendants when branch filtering is selected', async () => {
    const html = await render(row => row.name === '研发', 'branch')
    expect(html).toContain('平台')
  })
})

it('applies the three selection modes and clears ancestors on partial removal', async () => {
  const tree = [{ id: 1, children: [{ id: 2, children: [] }, { id: 3, children: [] }] }]
  const renderer = createRenderer<object, object>({
    insert: () => {}, remove: () => {}, createElement: () => ({}), createText: () => ({}),
    createComment: () => ({}), setText: () => {}, setElementText: () => {},
    parentNode: () => null, nextSibling: () => null, patchProp: () => {},
  })
  const source = shallowRef({ selectedIds: [] as number[], selectionMode: 'cascade-down' })
  let vnode: VNode
  let emitted: number[] = []
  const component = { ...RayTreeTable, render: () => null }
  const app = renderer.createApp({ render: () => (vnode = h(component as Component, {
    ...source.value, rows: tree, columns: [], treeColumn: 'id',
    rowKey: (row: any) => row.id, children: (row: any) => row.children,
    match: (row: any) => row.id === 2,
    rowLabel: (row: any) => String(row.id), 'onUpdate:selectedIds': (ids: number[]) => { emitted = ids },
  })) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  const state = (vnode!.component as unknown as { setupState: any }).setupState
  state.selectNode(state.filtered[0], true)
  expect(emitted).toEqual([1, 2, 3])
  source.value = { ...source.value, selectedIds: emitted }
  await nextTick()
  state.selectNode(state.allNodes[1], false)
  expect(emitted).toEqual([3])
  source.value = { ...source.value, selectedIds: [2] }
  await nextTick()
  state.selectNode(state.allNodes[2], true)
  expect(emitted).toEqual([2, 3])
  expect(state.nodeState(state.allNodes[0])).toBe('indeterminate')
  source.value = { selectedIds: [2], selectionMode: 'cascade' }
  await nextTick()
  state.selectNode(state.allNodes[2], true)
  expect(emitted).toEqual([2, 3, 1])
  source.value = { selectedIds: [], selectionMode: 'independent' }
  await nextTick()
  state.selectNode(state.allNodes[0], true)
  expect(emitted).toEqual([1])
  app.unmount()
})


