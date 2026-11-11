<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronDownIcon, XIcon } from '@lucide/vue'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { cn } from 'cn'
import { ComboboxInput } from 'reka-ui'
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
import { splitVisibleOptions } from './select'

export interface MultiSelectOption {
  value: number
  label: string
  depth?: number
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: readonly MultiSelectOption[]
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
  'update:modelValue': [value: number[]]
  change: [value: number[]]
  clear: []
}>()

defineOptions({ inheritAttrs: false })

const open = ref(false)
const selectedOptions = computed(() =>
  props.modelValue
    .map((value) => props.options.find((option) => option.value === value))
    .filter((option): option is MultiSelectOption => option !== undefined),
)

const visibleSelected = computed(() => splitVisibleOptions(selectedOptions.value, props.maxVisible))

const showClear = computed(() => props.clearable && props.modelValue.length > 0 && !props.disabled)

const limitReached = computed(
  () =>
    !!props.maxSelection && props.maxSelection > 0 && props.modelValue.length >= props.maxSelection,
)

const inputPlaceholder = computed(() => {
  if (props.options.length === 0) return props.emptyText
  return props.modelValue.length === 0 ? props.placeholder : ''
})

const selected = computed<number[]>({
  get: () => props.modelValue,
  set: (next: unknown) => commit(Array.isArray(next) ? next.map(Number) : []),
})

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

function commit(next: readonly number[]) {
  const unique = [...new Set(next)]
  if (props.maxSelection && props.maxSelection > 0 && unique.length > props.maxSelection) return
  if (
    unique.length === props.modelValue.length &&
    unique.every((value, index) => value === props.modelValue[index])
  ) {
    return
  }
  emit('update:modelValue', unique)
  emit('change', unique)
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

function removeOption(value: number) {
  if (props.disabled) return
  commit(props.modelValue.filter((item) => item !== value))
  nextTick(() => focusInputWithoutOpening())
}

function clearAll() {
  if (!showClear.value) return
  commit([])
  emit('clear')
  open.value = false
  nextTick(() => focusInputWithoutOpening())
}

function isSelected(value: number): boolean {
  return props.modelValue.includes(value)
}

function isOptionDisabled(option: MultiSelectOption): boolean {
  if (option.disabled) return true
  return limitReached.value && !isSelected(option.value)
}

function onBackspace(event: KeyboardEvent) {
  if (props.disabled) return
  const target = event.target as HTMLInputElement | null
  if (target?.value || selectedOptions.value.length === 0) return
  const last = selectedOptions.value[selectedOptions.value.length - 1]
  if (!last) return
  event.preventDefault()
  removeOption(last.value)
}

function onEnter(event: KeyboardEvent) {
  // 菜单打开时 Enter 只负责选中，不能把外层表单一起提交。
  if (open.value) event.preventDefault()
}
</script>

<template>
  <Combobox
    v-model="selected"
    :open="open"
    multiple
    :disabled="disabled"
    :name="name || undefined"
    :required="required"
    open-on-focus
    open-on-click
    class="w-full"
    @update:open="onOpenChange"
  >
    <ComboboxAnchor
      data-slot="multi-select-trigger"
      :data-size="size"
      :data-open="open ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :data-invalid="invalid ? '' : undefined"
      :class="
        cn(selectTriggerVariants({ size }), 'h-auto flex-wrap pr-11', anchorSizeClass, props.class)
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
        v-if="visibleSelected.hiddenCount > 0"
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
        :readonly="!searchable"
        :placeholder="inputPlaceholder"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        :class="
          cn(
            'min-w-16 flex-1 border-0 bg-transparent p-0 text-inherit shadow-none outline-none placeholder:text-muted-foreground read-only:cursor-pointer disabled:cursor-not-allowed',
            inputSizeClass,
            !searchable && 'caret-transparent',
          )
        "
        autocomplete="off"
        @keydown.backspace="onBackspace"
        @keydown.enter="onEnter"
      />

      <span class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
        <button
          v-if="showClear"
          type="button"
          aria-label="清空已选"
          class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 flex size-5 items-center justify-center rounded-sm transition-colors outline-none focus-visible:ring-2"
          @click.stop.prevent="clearAll"
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
      <ComboboxEmpty class="py-5 text-sm">
        {{ options.length === 0 ? emptyText : noResultsText }}
      </ComboboxEmpty>
      <ComboboxViewport>
        <ComboboxGroup>
          <ComboboxItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
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
    </ComboboxList>
  </Combobox>
</template>
