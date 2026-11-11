<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronDownIcon, XIcon } from '@lucide/vue'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { cn } from 'cn'
import { ComboboxInput } from 'reka-ui'
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

export interface SingleSelectOption {
  value: string
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options: readonly SingleSelectOption[]
    placeholder?: string
    emptyText?: string
    noResultsText?: string
    disabled?: boolean
    clearable?: boolean
    searchable?: boolean
    invalid?: boolean
    size?: 'sm' | 'default' | 'lg'
    name?: string
    required?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: '',
    placeholder: '请选择',
    emptyText: '没有可选项',
    noResultsText: '没有匹配项',
    disabled: false,
    clearable: true,
    searchable: true,
    invalid: false,
    size: 'default',
    name: '',
    required: false,
    class: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
  clear: []
}>()

defineOptions({ inheritAttrs: false })

const open = ref(false)
const value = computed(() => props.modelValue ?? '')
const hasValue = computed(() => value.value !== '')
const selectedOption = computed(() => props.options.find((option) => option.value === value.value))
const showClear = computed(() => props.clearable && hasValue.value && !props.disabled)
const emptyMessage = computed(() =>
  props.options.length === 0 ? props.emptyText : props.noResultsText,
)
const inputPlaceholder = computed(() =>
  open.value && selectedOption.value ? selectedOption.value.label : props.placeholder,
)
const searchText = ref('')

const comboboxValue = computed({
  get: () => (hasValue.value ? value.value : undefined),
  set: (next: unknown) => commit(typeof next === 'string' ? next : ''),
})

const inputRef = useTemplateRef<{ $el?: unknown }>('input')
const inputElement = computed(() => {
  const element = inputRef.value?.$el
  return element instanceof HTMLInputElement ? element : null
})

let suppressOpen = false

function commit(next: string) {
  if (next === value.value) return
  emit('update:modelValue', next)
  emit('change', next)
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

function clear() {
  if (!showClear.value) return
  commit('')
  emit('clear')
  open.value = false
  focusInputWithoutOpening()
}

function onDelete(event: KeyboardEvent) {
  if (!showClear.value) return
  const target = event.target as HTMLInputElement | null
  if (target?.value) return
  event.preventDefault()
  clear()
}

function onEnter(event: KeyboardEvent) {
  // 菜单打开时 Enter 只负责选中，不能把外层表单一起提交。
  if (open.value) event.preventDefault()
}

function displayValue(current: unknown): string {
  if (typeof current !== 'string' || current === '') return ''
  return props.options.find((option) => option.value === current)?.label ?? ''
}

watch(open, (next) => {
  if (next && props.searchable) searchText.value = ''
})
</script>

<template>
  <Combobox
    v-model="comboboxValue"
    :open="open"
    :disabled="disabled"
    :name="name || undefined"
    :required="required"
    open-on-click
    open-on-focus
    class="w-full"
    @update:open="onOpenChange"
  >
    <ComboboxAnchor
      data-slot="single-select-trigger"
      :data-size="size"
      :data-open="open ? '' : undefined"
      :data-disabled="disabled ? '' : undefined"
      :data-invalid="invalid ? '' : undefined"
      :class="cn(selectTriggerVariants({ size }), props.class)"
      @click="onAnchorClick"
      @pointerdown="onAnchorPointerDown"
    >
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
            'h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit shadow-none outline-none placeholder:text-muted-foreground read-only:cursor-pointer disabled:cursor-not-allowed',
            !searchable && 'cursor-pointer caret-transparent',
          )
        "
        autocomplete="off"
        @keydown.delete="onDelete"
        @keydown.enter="onEnter"
      />

      <span class="flex shrink-0 items-center gap-0.5">
        <button
          v-if="showClear"
          type="button"
          aria-label="清空选择"
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
      <ComboboxEmpty class="py-5 text-sm">{{ emptyMessage }}</ComboboxEmpty>
      <ComboboxViewport>
        <ComboboxGroup>
          <ComboboxItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            :disabled="option.disabled"
            :aria-disabled="option.disabled || undefined"
            :class="selectItemClass"
          >
            <slot name="option" :option="option" :selected="option.value === value">
              <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            </slot>
            <CheckIcon
              v-if="option.value === value"
              class="text-muted-foreground size-3.5 shrink-0"
              aria-hidden="true"
            />
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
