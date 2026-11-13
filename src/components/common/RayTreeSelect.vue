<script setup lang="ts" generic="T extends SelectValue, Multiple extends boolean = false">
import { Check, ChevronDown, ChevronRight } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { TreeItem, TreeRoot } from 'reka-ui'
import { selectRowSelectedClass } from '@/components/ui/select/select-styles'
import RaySelect from './RaySelect.vue'
import SelectCheckbox from './SelectCheckbox.vue'
import {
  selectionState,
  type SelectModelValue,
  type SelectValue,
  type SelectionState,
} from './select'

export interface TreeSelectOption<T extends SelectValue> {
  value: T
  label: string
  children?: TreeSelectOption<T>[]
  disabled?: boolean
}

/** 行点击触发什么：select 选中、toggle 展开/收起、both 两者都触发、none 无动作。 */
export type TreeRowAction = 'select' | 'toggle' | 'both' | 'none'

defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{
    modelValue: SelectModelValue<NoInfer<T>, NoInfer<Multiple>>
    multiple?: Multiple & boolean
    options: TreeSelectOption<T>[]
    placeholder?: string
    disabled?: boolean
    searchable?: boolean
    clearable?: boolean
    maxVisible?: number
    maxSelection?: number
    checkStrictly?: boolean
    /** 列表项复选框；默认多选显示、单选隐藏，可显式覆盖。 */
    checkbox?: boolean
    /** 行点击行为；展开/收起只由箭头和键盘方向键触发，默认行点击只选中。 */
    rowAction?: TreeRowAction
    size?: 'sm' | 'default' | 'lg'
  }>(),
  {
    multiple: () => false as Multiple,
    placeholder: '请选择',
    disabled: false,
    searchable: true,
    clearable: true,
    maxVisible: 3,
    maxSelection: 0,
    checkStrictly: false,
    // 显式 undefined：Vue 会把缺省的 Boolean prop 强转为 false，导致 ?? 失效。
    checkbox: undefined,
    rowAction: 'select',
    size: 'default',
  },
)
const emit = defineEmits<{
  'update:modelValue': [value: SelectModelValue<T, Multiple>]
  change: [value: SelectModelValue<T, Multiple>]
  clear: []
}>()
const expanded = shallowRef<string[]>([])
const keyOf = (item: TreeSelectOption<T>) => `${typeof item.value}:${item.value}`
const childrenOf = (item: TreeSelectOption<T>) =>
  item.children?.length ? item.children : undefined
function flatten(items: readonly TreeSelectOption<T>[]): TreeSelectOption<T>[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])])
}
const all = computed(() => flatten(props.options))
const selectedValues = computed<T[]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as T[]) : [],
)
watch(
  () => props.options,
  (options) => {
    expanded.value = flatten(options)
      .filter((item) => item.children?.length)
      .map(keyOf)
  },
  { immediate: true },
)
function filterTree(items: TreeSelectOption<T>[], query: string): TreeSelectOption<T>[] {
  const term = query.trim().toLocaleLowerCase()
  if (!term) return items
  return items.flatMap((item) => {
    const children = filterTree(item.children ?? [], term)
    return item.label.toLocaleLowerCase().includes(term) || children.length
      ? [{ ...item, children }]
      : []
  })
}
function expandedFor(query: string): string[] {
  return query.trim()
    ? flatten(filterTree(props.options, query))
        .filter((item) => item.children?.length)
        .map(keyOf)
    : expanded.value
}
function selectable(item: TreeSelectOption<T>): T[] {
  if (item.disabled) return []
  return [item.value, ...(item.children ?? []).flatMap(selectable)]
}
function state(item: TreeSelectOption<T>): SelectionState {
  const node = all.value.find((candidate) => candidate.value === item.value) ?? item
  const values = props.checkStrictly ? [node.value] : selectable(node)
  return selectionState(selectedValues.value, values)
}
/** 行选中态：单选比较模型值；多选包含全部选中的祖先和部分选中的父级。 */
function rowSelected(item: TreeSelectOption<T>): boolean {
  if (!props.multiple) return item.value === props.modelValue
  return state(item) !== 'unchecked'
}
const blocked = computed(() => {
  const result = new Set<T>()
  function visit(items: TreeSelectOption<T>[], disabled = false) {
    for (const item of items) {
      const isDisabled = disabled || !!item.disabled
      if (isDisabled) result.add(item.value)
      visit(item.children ?? [], isDisabled)
    }
  }
  visit(props.options)
  return result
})
function updateAncestors(next: Set<T>, items: TreeSelectOption<T>[]): void {
  for (const node of items) {
    if (node.disabled) continue
    updateAncestors(next, node.children ?? [])
    const descendants = (node.children ?? []).flatMap(selectable)
    if (descendants.length) {
      if (descendants.every((value) => next.has(value))) next.add(node.value)
      else next.delete(node.value)
    }
  }
}
function normalizeRemoval(value: SelectModelValue<T, Multiple>): SelectModelValue<T, Multiple> {
  if (!props.multiple || props.checkStrictly || !Array.isArray(value)) return value
  const removed = selectedValues.value.filter((item) => !value.includes(item))
  if (removed.length !== 1 || value.some((item) => !selectedValues.value.includes(item)))
    return value
  const node = all.value.find((item) => item.value === removed[0])
  if (!node) return value
  const next = new Set(value as T[])
  for (const item of selectable(node)) next.delete(item)
  updateAncestors(next, props.options)
  return [...next] as SelectModelValue<T, Multiple>
}
function choose(
  item: TreeSelectOption<T>,
  commit: (value: T | T[] | null) => void,
  close: () => void,
) {
  if (blocked.value.has(item.value) || props.disabled) return
  item = all.value.find((node) => node.value === item.value) ?? item
  if (!props.multiple) {
    commit(item.value)
    close()
    return
  }
  const next = new Set(selectedValues.value)
  const affected = props.checkStrictly ? [item.value] : selectable(item)
  const remove = state(item) === 'checked'
  for (const value of affected) {
    if (remove) next.delete(value)
    else next.add(value)
  }
  if (!props.checkStrictly) updateAncestors(next, props.options)
  commit([...next])
}

// 行点击行为可配置：
// - select：只选中，不展开（展开/收起交给箭头和键盘）。
// - toggle：只展开/收起，不选中。
// - both：选中并展开/收起。
// - none：无动作。
// 键盘 Enter/空格始终选中，方向键始终展开收起。
// reka 派发的是包装后的 CustomEvent，原始事件在 detail.originalEvent 上。
const showCheckbox = computed(() => props.checkbox ?? props.multiple)

function onMouse(event: Event): boolean {
  return (
    (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent instanceof MouseEvent
  )
}

function onRowSelect(
  event: Event,
  item: TreeSelectOption<T>,
  commit: (value: T | T[] | null) => void,
  close: () => void,
) {
  // 统一阻断 reka 内部 onSelect，选中一律走自定义模型。
  event.preventDefault()
  // 键盘 Enter/空格始终可选中，无障碍不随 rowAction 变化。
  if (!onMouse(event)) {
    choose(item, commit, close)
    return
  }
  if (props.rowAction === 'select' || props.rowAction === 'both') {
    choose(item, commit, close)
  }
}

function onRowToggle(event: Event) {
  // 键盘方向键始终可展开收起；鼠标行点击按 rowAction 决定是否展开。
  if (!onMouse(event)) return
  if (props.rowAction === 'select' || props.rowAction === 'none') event.preventDefault()
}
</script>

<template>
  <RaySelect
    v-bind="$attrs"
    :model-value="modelValue"
    :multiple="multiple"
    :options="all"
    :placeholder="placeholder"
    :disabled="disabled"
    :searchable="searchable"
    :clearable="clearable"
    :max-visible="maxVisible"
    :max-selection="maxSelection"
    :size="size"
    @update:model-value="emit('update:modelValue', normalizeRemoval($event))"
    @change="emit('change', normalizeRemoval($event))"
    @clear="emit('clear')"
  >
    <template #list="{ query, commit, close }">
      <p
        v-if="!filterTree(options, query).length"
        class="text-muted-foreground px-3 py-5 text-center text-sm"
      >
        {{ options.length ? '没有匹配项' : '没有可选项' }}
      </p>
      <TreeRoot
        v-else
        v-slot="{ flattenItems }"
        :items="filterTree(options, query)"
        :get-key="keyOf"
        :get-children="childrenOf"
        :expanded="expandedFor(query)"
        aria-label="选项"
        class="max-h-64 overflow-auto py-1"
        @update:expanded="
          (value) => {
            if (!query.trim()) expanded = value
          }
        "
      >
        <TreeItem
          v-for="item in flattenItems"
          :key="item._id"
          v-slot="{ isExpanded, handleToggle }"
          v-bind="item.bind"
          :disabled="blocked.has(item.value.value)"
          :class="[
            'flex min-h-9 cursor-pointer items-center gap-1 rounded-sm pr-2 text-sm outline-none data-disabled:pointer-events-none data-disabled:opacity-50',
            rowSelected(item.value)
              ? selectRowSelectedClass
              : 'hover:bg-accent focus-visible:bg-accent',
          ]"
          :style="{ paddingLeft: `${(item.level - 1) * 18 + 4}px` }"
          @select="onRowSelect($event, item.value, commit, close)"
          @toggle="onRowToggle"
        >
          <button
            v-if="item.hasChildren && !query.trim()"
            type="button"
            tabindex="-1"
            class="hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded"
            :aria-label="`${isExpanded ? '收起' : '展开'} ${item.value.label}`"
            @click.stop="handleToggle()"
          >
            <ChevronDown v-if="isExpanded" class="size-4" /><ChevronRight v-else class="size-4" />
          </button>
          <span v-else class="size-7 shrink-0" />
          <button
            v-if="showCheckbox"
            type="button"
            role="checkbox"
            tabindex="-1"
            :aria-checked="
              state(item.value) === 'mixed' ? 'mixed' : state(item.value) === 'checked'
            "
            :aria-label="item.value.label"
            class="flex shrink-0 items-center justify-center"
            @click.stop="choose(item.value, commit, close)"
          >
            <SelectCheckbox :state="state(item.value)" />
          </button>
          <span class="min-w-0 flex-1 truncate" :title="item.value.label">{{
            item.value.label
          }}</span>
          <Check
            v-if="!multiple && rowSelected(item.value)"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
        </TreeItem>
      </TreeRoot>
    </template>
  </RaySelect>
</template>
