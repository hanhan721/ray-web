import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, h, nextTick, shallowRef, ssrContextKey, type VNode } from 'vue'
import RaySelect from '../RaySelect.vue'
import type { SelectOption, SelectValue } from '../select'

// 与现有组件测试一致：Node 中保留 SFC setup 实例，DOM/键盘交互由浏览器验证。
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
const unmounts: Array<() => void> = []

function mount(
  modelValue: SelectValue | SelectValue[] | null,
  props: Record<string, unknown> = {},
) {
  const update = vi.fn()
  const change = vi.fn()
  const clear = vi.fn()
  const source = shallowRef({
    options: [
      { value: '01', label: 'String' },
      { value: 0, label: 'Zero' },
      { value: 1, label: 'One' },
    ],
    modelValue,
    ...props,
    'onUpdate:modelValue': update,
    onChange: change,
    onClear: clear,
  })
  let vnode: VNode
  const component = { ...RaySelect, render: () => null }
  const app = renderer.createApp({
    render: () => (vnode = h(component, source.value)),
  })
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  unmounts.push(() => app.unmount())
  const state = (vnode!.component as unknown as { setupState: unknown }).setupState as {
    selected: SelectOption | SelectOption[] | null
    searchText: string
    closeAndFocus: () => void
    showClear: boolean
    clear: () => void
    removeOption: (value: SelectValue) => void
    isSelected: (value: SelectValue) => boolean
    isOptionDisabled: (option: SelectOption) => boolean
    displayValue: (value: unknown) => string
    formFields: Array<{ name: string; value: SelectValue }>
  }
  return {
    state,
    choose(next: SelectValue | SelectValue[] | null) {
      const option = (value: SelectValue) => ({ value, label: '' })
      state.selected = Array.isArray(next) ? next.map(option) : next === null ? null : option(next)
    },
    update,
    change,
    clear,
    async setProps(next: Record<string, unknown>) {
      source.value = { ...source.value, ...next }
      await nextTick()
    },
  }
}

afterEach(async () => {
  await nextTick()
  unmounts.splice(0).forEach((unmount) => unmount())
  vi.unstubAllGlobals()
})

describe('RaySelect value contracts', () => {
  it('casts a bare multiple attribute and keeps native form fields as primitive values', async () => {
    const select = mount([0, '01'], { multiple: '', name: 'values' })
    select.choose([0])
    expect(select.update).toHaveBeenLastCalledWith([0])
    expect(select.state.formFields).toEqual([
      { name: 'values[0]', value: 0 },
      { name: 'values[1]', value: '01' },
    ])
    await select.setProps({ modelValue: [], required: true })
    expect(select.state.formFields).toEqual([{ name: 'values', value: '' }])
    await select.setProps({ multiple: false, modelValue: null })
    expect(select.state.formFields).toEqual([{ name: 'values', value: '' }])
  })

  it.each(['01', '', 0, 1])('preserves single value %j and clears to null', async (value) => {
    vi.stubGlobal('HTMLInputElement', class {})
    const select = mount(null)
    select.choose(value)
    expect(select.update.mock.calls).toEqual([[value]])
    expect(select.change.mock.calls).toEqual([[value]])
    await select.setProps({ modelValue: value })
    expect(select.state.isSelected(value)).toBe(true)
    expect(select.state.showClear).toBe(true)
    select.state.clear()
    expect(select.update).toHaveBeenLastCalledWith(null)
    expect(select.change).toHaveBeenLastCalledWith(null)
    expect(select.clear).toHaveBeenCalledOnce()
  })

  it.each([
    ['01', '02'],
    [0, 1],
    ['1', 1],
  ])(
    'preserves array values %j without coercion, removes a tag and clears to []',
    async (...values) => {
      vi.stubGlobal('HTMLInputElement', class {})
      const select = mount([], { multiple: true })
      select.choose(values)
      expect(select.update).toHaveBeenLastCalledWith(values)
      expect(select.change).toHaveBeenLastCalledWith(values)
      await select.setProps({ modelValue: values })
      select.state.removeOption(values[0]!)
      expect(select.update).toHaveBeenLastCalledWith(values.slice(1))
      select.state.clear()
      expect(select.update).toHaveBeenLastCalledWith([])
      expect(select.change).toHaveBeenLastCalledWith([])
    },
  )

  it('enforces the selection cap while allowing deselection, and deduplicates values', async () => {
    const select = mount([0], { multiple: true, maxSelection: 1 })
    expect(select.state.isOptionDisabled({ value: 1, label: 'One' })).toBe(true)
    expect(select.state.isOptionDisabled({ value: 0, label: 'Zero' })).toBe(false)
    select.choose([0, 1])
    expect(select.update).not.toHaveBeenCalled()
    select.choose([])
    expect(select.update).toHaveBeenLastCalledWith([])
    await select.setProps({ modelValue: [], maxSelection: 2 })
    select.choose([0, 0, '01'])
    expect(select.update).toHaveBeenLastCalledWith([0, '01'])
  })

  it('keeps controlled values and labels in sync with option reloads', async () => {
    const select = mount(0)
    expect(select.state.displayValue({ value: 0, label: 'Zero' })).toBe('Zero')
    await select.setProps({ options: [{ value: 0, label: 'Updated' }] })
    expect(select.state.displayValue({ value: 0, label: 'Zero' })).toBe('Updated')
    expect(select.state.isSelected(0)).toBe(true)
    expect(select.update).not.toHaveBeenCalled()
  })

  it('shows the selected label after closing a custom search result', async () => {
    vi.stubGlobal('HTMLInputElement', class {})
    const select = mount(null)
    select.state.searchText = 'Zer'
    select.choose(0)
    await select.setProps({ modelValue: 0 })
    select.state.closeAndFocus()
    await nextTick()
    expect(select.state.searchText).toBe('Zero')
  })

  it('clears the input text as well as the selected value', async () => {
    vi.stubGlobal('HTMLInputElement', class {})
    const select = mount('01')
    select.state.searchText = 'String'
    select.state.clear()
    await nextTick()
    expect(select.state.searchText).toBe('')
    expect(select.update).toHaveBeenLastCalledWith(null)
    expect(select.clear).toHaveBeenCalledOnce()
  })

  it('respects disabled and clearable controls', async () => {
    const select = mount('01', { clearable: false })
    select.state.clear()
    expect(select.state.showClear).toBe(false)
    expect(select.update).not.toHaveBeenCalled()
    await select.setProps({ clearable: true, disabled: true })
    select.choose(0)
    select.state.clear()
    expect(select.update).not.toHaveBeenCalled()
  })
})
