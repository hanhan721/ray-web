<script setup lang="ts" generic="T extends SelectValue, Multiple extends boolean = false">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronDownIcon, XIcon } from '@lucide/vue'
import { computed, nextTick, shallowRef, useTemplateRef, useSlots, watch } from 'vue'
import { cn } from 'cn'
import { ComboboxInput, VisuallyHidden } from 'reka-ui'
import { Badge } from '@/components/ui/badge'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxViewport,
} from '@/components/ui/combobox'
import { selectItemClass, selectTriggerVariants } from '@/components/ui/select/select-styles'
import {
  splitVisibleOptions,
  type SelectModelValue,
  type SelectOption,
  type SelectValue,
} from './select'

const props = withDefaults(
  defineProps<{
    modelValue: SelectModelValue<NoInfer<T>, NoInfer<Multiple>>
    // 保留 Boolean 运行时类型，使裸 multiple 属性也能正确启用多选。
    multiple?: Multiple & boolean
    options: readonly SelectOption<T>[]
    placeholder?: string
    emptyText?: string
    noResultsText?: string
    disabled?: boolean
    clearable?: boolean
    searchable?: boolean
    maxVisible?: number
    maxSelection?: number
    invalid?: boolean
    size?: 'sm' | 'default' | 'lg'
    name?: string
    required?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    multiple: () => false as Multiple,
    placeholder: '请选择',
    emptyText: '没有可选项',
    noResultsText: '没有匹配项',
    disabled: false,
    clearable: true,
    searchable: true,
    maxVisible: 3,
    maxSelection: 0,
    size: 'default',
    name: '',
    required: false,
    class: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: SelectModelValue<T, Multiple>]
  change: [value: SelectModelValue<T, Multiple>]
  clear: []
}>()

defineOptions({ inheritAttrs: false })

const slots = useSlots()
const open = shallowRef(false)
const searchText = shallowRef('')
const values = computed<T[]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as T[]) : [],
)
const value = computed<T | null>(() =>
  Array.isArray(props.modelValue) ? null : (props.modelValue as T | null),
)
const hasValue = computed(() => (props.multiple ? values.value.length > 0 : value.value !== null))
const selectedOption = computed(() => props.options.find((option) => option.value === value.value))
const selectedOptions = computed(() =>
  values.value
    .map((value) => props.options.find((option) => option.value === value))
    .filter((option): option is SelectOption<T> => option !== undefined),
)

const visibleSelected = computed(() => splitVisibleOptions(selectedOptions.value, props.maxVisible))

// 表单仍提交原始值，不能提交 Combobox 内部选项对象的 label/depth 等字段。
const formFields = computed(() => {
  if (!props.name) return []
  if (!props.multiple) return [{ name: props.name, value: value.value ?? '' }]
  if (values.value.length === 0) return props.required ? [{ name: props.name, value: '' }] : []
  return values.value.map((value, index) => ({ name: `${props.name}[${index}]`, value }))
})

const showClear = computed(() => props.clearable && hasValue.value && !props.disabled)

const limitReached = computed(
  () => !!props.multiple && props.maxSelection > 0 && values.value.length >= props.maxSelection,
)

const inputPlaceholder = computed(() => {
  if (!props.multiple) {
    return selectedOption.value?.label ?? props.placeholder
  }
  if (props.options.length === 0) return props.emptyText
  return hasValue.value ? '' : props.placeholder
})

const selected = computed({
  // Reka 保留空字符串作为内部清空值，使用选项对象承载原始业务值。
  get: () =>
    props.multiple
      ? values.value.map(toOption)
      : value.value === null
        ? null
        : toOption(value.value),
  set: (next: unknown) => {
    if (props.multiple) {
      if (Array.isArray(next) && next.every(isSelectOption))
        commit(next.map((option) => option.value))
    } else if (next == null || isSelectOption(next)) {
      commit(next?.value ?? null)
    }
  },
})

function toOption(value: T): SelectOption<T> {
  return props.options.find((option) => option.value === value) ?? { value, label: '' }
}

function isSelectOption(value: unknown): value is SelectOption<T> {
  if (value === null || typeof value !== 'object' || !('value' in value)) return false
  return typeof value.value === 'string' || typeof value.value === 'number'
}

const inputRef = useTemplateRef<{ $el?: unknown }>('input')
const inputElement = computed(() => {
  const element = inputRef.value?.$el
  return element instanceof HTMLInputElement ? element : null
})

const anchorSizeClass = computed(() => {
  if (props.size === 'sm') return 'min-h-8 gap-1 py-0.5 text-xs'
  if (props.size === 'lg') return 'min-h-10 gap-1 py-1.5'
  return 'min-h-9 gap-1 py-1'
})

const inputSizeClass = computed(() =>
  props.size === 'sm' ? 'h-5 text-xs leading-5' : 'h-6 text-sm leading-6',
)

let suppressOpen = false

function commit(next: T | T[] | null) {
  if (props.disabled) return
  let normalized = next
  if (props.multiple) {
    if (!Array.isArray(next)) return
    const unique = [...new Set(next)]
    if (props.maxSelection > 0 && unique.length > props.maxSelection) return
    if (
      unique.length === values.value.length &&
      unique.every((value, index) => value === values.value[index])
    )
      return
    normalized = unique
  } else if (next === value.value) {
    return
  }
  // multiple 决定运行时分支；公共类型同时约束绑定值及事件。
  const result = normalized as SelectModelValue<T, Multiple>
  emit('update:modelValue', result)
  emit('change', result)
}

function onAnchorClick(event: MouseEvent) {
  if (props.disabled || event.target === inputElement.value) return
  const next = !open.value
  focusInputWithoutOpening()
  open.value = next
}

function onAnchorPointerDown(event: PointerEvent) {
  if (event.target === event.currentTarget) event.preventDefault()
}

function focusInputWithoutOpening() {
  const element = inputElement.value
  if (!element || props.disabled) return
  suppressOpen = true
  element.focus()
  suppressOpen = false
}

function onOpenChange(next: boolean) {
  if (next && suppressOpen) return
  open.value = next
}

function closeAndFocus() {
  open.value = false
  nextTick(() => {
    searchText.value = props.multiple ? '' : (selectedOption.value?.label ?? '')
    focusInputWithoutOpening()
  })
}

function removeOption(value: T) {
  if (props.disabled) return
  commit(values.value.filter((item) => item !== value))
  nextTick(() => focusInputWithoutOpening())
}

function clear() {
  if (!showClear.value) return
  commit(props.multiple ? [] : null)
  searchText.value = ''
  emit('clear')
  open.value = false
  nextTick(() => focusInputWithoutOpening())
}

function isSelected(optionValue: T): boolean {
  return props.multiple ? values.value.includes(optionValue) : value.value === optionValue
}

function isOptionDisabled(option: SelectOption<T>): boolean {
  if (option.disabled) return true
  return limitReached.value && !isSelected(option.value)
}

function onDelete(event: KeyboardEvent) {
  if (props.disabled) return
  const target = event.target as HTMLInputElement | null
  if (target?.value) return
  if (!props.multiple) {
    if (!showClear.value) return
    event.preventDefault()
    clear()
    return
  }
  if (event.key !== 'Backspace') return
  const last = selectedOptions.value.at(-1)
  if (!last) return
  event.preventDefault()
  removeOption(last.value)
}

function displayValue(current: unknown): string {
  if (props.multiple || !isSelectOption(current)) return ''
  return props.options.find((option) => option.value === current.value)?.label ?? ''
}

watch(open, (next) => {
  if (next && props.searchable) searchText.value = ''
})

function onArrowDown(event: KeyboardEvent) {
  if (!slots.list || !open.value) return
  event.preventDefault()
  const id = inputElement.value?.getAttribute('aria-controls')
  const tree = id ? document.getElementById(id) : null
  tree?.querySelector<HTMLElement>('[role="treeitem"]:not([data-disabled])')?.focus()
}

function onEnter(event: KeyboardEvent) {
  // 菜单打开时 Enter 只负责选中，不能把外层表单一起提交。
  if (open.value) event.preventDefault()
}
</script>

<template>
  <Combobox
    v-model="selected"
    by="value"
    :open="open"
    :multiple="multiple"
    :disabled="disabled"
    :required="required"
    open-on-focus
    open-on-click
    class="w-full"
    @update:open="onOpenChange"
  >
    <VisuallyHidden
      v-for="field in formFields"
      :key="field.name"
      as="input"
      feature="fully-hidden"
      :name="field.name"
      :value="field.value"
      :required="required"
      :disabled="disabled"
    />
    <ComboboxAnchor
      data-slot="select-trigger"
      :data-multiple="multiple ? '' : undefined"
      :data-size="size"
      :data-open="open ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :data-invalid="invalid ? '' : undefined"
      :class="
        cn(
          selectTriggerVariants({ size }),
          multiple && ['h-auto flex-wrap pr-11', anchorSizeClass],
          props.class,
        )
      "
      @click="onAnchorClick"
      @pointerdown="onAnchorPointerDown"
    >
      <Badge
        v-for="option in visibleSelected.visible"
        :key="option.value"
        variant="secondary"
        class="border-border/60 h-6 max-w-full gap-1 rounded-md px-1.5 text-xs font-normal"
      >
        <span class="max-w-32 truncate" :title="option.label">{{ option.label }}</span>
        <button
          type="button"
          tabindex="-1"
          :disabled="disabled"
          class="text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring/30 -mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
          :aria-label="`移除 ${option.label}`"
          @click.stop.prevent="removeOption(option.value)"
        >
          <XIcon class="size-3" aria-hidden="true" />
        </button>
      </Badge>

      <Badge
        v-if="multiple && visibleSelected.hiddenCount > 0"
        as="button"
        type="button"
        variant="outline"
        class="text-muted-foreground h-6 cursor-pointer rounded-md px-1.5 text-xs font-normal"
        :aria-label="`还有 ${visibleSelected.hiddenCount} 项已选，打开列表查看`"
      >
        +{{ visibleSelected.hiddenCount }}
      </Badge>

      <ComboboxInput
        ref="input"
        v-bind="$attrs"
        v-model="searchText"
        :display-value="displayValue"
        :readonly="!searchable"
        :placeholder="inputPlaceholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :class="
          cn(
            'min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit shadow-none outline-none placeholder:text-muted-foreground read-only:cursor-pointer disabled:cursor-not-allowed',
            multiple ? ['min-w-16', inputSizeClass] : 'h-full',
            !searchable && 'caret-transparent',
          )
        "
        autocomplete="off"
        @keydown.delete="onDelete"
        @keydown.down="onArrowDown"
        @keydown.enter="onEnter"
      />

      <span
        :class="
          cn(
            'flex shrink-0 items-center gap-0.5',
            multiple && 'absolute top-1/2 right-2 -translate-y-1/2',
          )
        "
      >
        <button
          v-if="showClear"
          type="button"
          :aria-label="multiple ? '清空已选' : '清空选择'"
          class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 flex size-5 items-center justify-center rounded-sm transition-colors outline-none focus-visible:ring-2"
          @click.stop.prevent="clear"
        >
          <XIcon class="size-3.5" aria-hidden="true" />
        </button>
        <ComboboxTrigger
          aria-label="切换选项"
          class="text-muted-foreground focus-visible:ring-ring/30 flex size-5 shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2"
          @click.stop
        >
          <ChevronDownIcon
            class="size-3.5 transition-transform duration-150"
            :class="open && 'rotate-180'"
            aria-hidden="true"
          />
        </ComboboxTrigger>
      </span>
    </ComboboxAnchor>

    <ComboboxList align="start">
      <slot name="list" :query="searchText" :commit="commit" :close="closeAndFocus">
        <ComboboxEmpty class="py-5 text-sm">
          {{ options.length === 0 ? emptyText : noResultsText }}
        </ComboboxEmpty>
        <ComboboxViewport>
          <ComboboxGroup>
            <ComboboxItem
              v-for="option in options"
              :key="option.value"
              :value="option"
              :text-value="option.label"
              :disabled="isOptionDisabled(option)"
              :aria-disabled="isOptionDisabled(option) || undefined"
              :class="selectItemClass"
            >
              <slot name="option" :option="option" :selected="isSelected(option.value)">
                <span
                  class="min-w-0 flex-1 truncate"
                  :style="option.depth ? { paddingLeft: `${option.depth * 14}px` } : undefined"
                >
                  {{ option.label }}
                </span>
              </slot>
              <CheckIcon
                v-if="isSelected(option.value)"
                class="text-muted-foreground size-3.5 shrink-0"
                aria-hidden="true"
              />
            </ComboboxItem>
          </ComboboxGroup>
        </ComboboxViewport>
      </slot>
    </ComboboxList>
  </Combobox>
</template>
