import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RayTreeSelect from '../RayTreeSelect.vue'

describe('RayTreeSelect', () => {
  it('displays the selected descendant label without hierarchy markers', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(RayTreeSelect as unknown as Component, {
      modelValue: '2', options: [{ value: '1', label: '总部', children: [{ value: '2', label: '研发部' }] }],
    }) }))
    expect(html).toContain('研发部')
  })
})


// Exercise the tree contract with controlled values, independently of the overlay DOM.
import { createRenderer, nextTick, shallowRef, ssrContextKey, type VNode } from 'vue'
import { afterEach, vi } from 'vitest'

const renderer = createRenderer<object, object>({
  insert: () => {}, remove: () => {}, createElement: () => ({}), createText: () => ({}),
  createComment: () => ({}), setText: () => {}, setElementText: () => {},
  parentNode: () => null, nextSibling: () => null, patchProp: () => {},
})
const unmounts: Array<() => void> = []
afterEach(() => unmounts.splice(0).forEach((unmount) => unmount()))

it('retains ancestor paths and applies cascading, mixed and disabled subtree rules', async () => {
  const options = [{ value: 'a', label: '总部', children: [
    { value: 'b', label: '研发' },
    { value: 'c', label: '禁用', disabled: true, children: [{ value: 'd', label: '下级' }] },
    { value: 'e', label: '销售' },
  ] }]
  const source = shallowRef({ modelValue: [] as string[], options, multiple: true, checkStrictly: false })
  let vnode: VNode
  const component = { ...RayTreeSelect, render: () => null }
  const app = renderer.createApp({ render: () => (vnode = h(component, source.value)) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  unmounts.push(() => app.unmount())
  const state = (vnode!.component as unknown as { setupState: any }).setupState
  expect(state.filterTree(options, '研发')).toEqual([{ ...options[0], children: [{ ...options[0]!.children![0], children: [] }] }])
  const commit = vi.fn()
  state.choose(options[0], commit, vi.fn())
  expect(commit).toHaveBeenLastCalledWith(['a', 'b', 'e'])
  expect(state.blocked.has('d')).toBe(true)
  source.value = { ...source.value, modelValue: ['b'] }
  await nextTick()
  expect(state.state(options[0])).toBe('mixed')
  state.choose(options[0]!.children![2], commit, vi.fn())
  expect(commit).toHaveBeenLastCalledWith(['b', 'e', 'a'])
  source.value = { ...source.value, modelValue: ['a', 'b', 'e'] }
  await nextTick()
  expect(state.normalizeRemoval(['a', 'e'])).toEqual(['e'])
  source.value = { ...source.value, checkStrictly: true, modelValue: [] }
  await nextTick()
  state.choose(options[0], commit, vi.fn())
  expect(commit).toHaveBeenLastCalledWith(['a'])
})

it('retains the parent when only one child is selected', async () => {
  const options = [{ value: 'parent', label: '菜单', children: [
    { value: 'read', label: '查询' }, { value: 'write', label: '修改' },
  ] }]
  let vnode: VNode
  const component = { ...RayTreeSelect, render: () => null }
  const app = renderer.createApp({ render: () => (vnode = h(component, {
    modelValue: [], options, multiple: true, retainAncestors: true,
  })) })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  unmounts.push(() => app.unmount())
  const state = (vnode!.component as unknown as { setupState: any }).setupState
  const commit = vi.fn()
  state.choose(options[0]!.children![0], commit, vi.fn())
  expect(commit).toHaveBeenCalledWith(['read', 'parent'])
})
