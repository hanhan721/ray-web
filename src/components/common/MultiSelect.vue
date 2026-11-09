<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckIcon, ChevronDown, XIcon } from '@lucide/vue'
import { computed, ref, useTemplateRef } from 'vue'
import { cn } from 'cn'
import { ComboboxInput } from 'reka-ui'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxViewport,
} from '@/components/ui/combobox'

export interface MultiSelectOption {
  value: number
  label: string
  depth?: number
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    options: MultiSelectOption[]
    placeholder?: string
    emptyText?: string
    noResultsText?: string
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: '请选择',
    emptyText: '没有可选项',
    noResultsText: '没有匹配项',
    disabled: false,
    class: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', (value as number[]) ?? []),
})

const selectedOptions = computed(() =>
  props.modelValue
    .map((value) => props.options.find((option) => option.value === value))
    .filter((option): option is MultiSelectOption => option !== undefined),
)

const inputPlaceholder = computed(() => {
  if (props.options.length === 0) return props.emptyText
  return selectedOptions.value.length === 0 ? props.placeholder : ''
})

const open = ref(false)
const inputRef = useTemplateRef<{ $el?: unknown }>('input')

function focusInput() {
  if (props.disabled) return
  const element = inputRef.value?.$el
  if (element instanceof HTMLInputElement) element.focus()
}

function remove(value: number) {
  emit(
    'update:modelValue',
    props.modelValue.filter((item) => item !== value),
  )
}

function onBackspace(event: KeyboardEvent) {
  if (props.disabled) return
  const target = event.target as HTMLInputElement | null
  if (target?.value || selectedOptions.value.length === 0) return
  event.preventDefault()
  remove(selectedOptions.value[selectedOptions.value.length - 1].value)
}
</script>

<template>
  <Combobox
    v-model="selected"
    v-model:open="open"
    multiple
    :disabled="disabled"
    open-on-focus
    open-on-click
    class="w-full"
  >
    <ComboboxAnchor
      :class="
        cn(
          'border-input bg-input/20 dark:bg-input/30 focus-within:border-ring focus-within:ring-ring/30 relative flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-2 py-1 pr-8 text-sm transition-colors focus-within:ring-2',
          disabled && 'cursor-not-allowed opacity-50',
          props.class,
        )
      "
      @click="focusInput"
    >
      <span
        v-for="option in selectedOptions"
        :key="option.value"
        class="bg-secondary text-secondary-foreground inline-flex h-6 max-w-44 items-center gap-1 rounded-md px-2 text-[0.75rem]"
      >
        <span class="truncate">{{ option.label }}</span>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/30 rounded-sm outline-none focus-visible:ring-2"
          :disabled="disabled"
          :aria-label="`移除 ${option.label}`"
          @click.stop.prevent="remove(option.value)"
        >
          <XIcon class="size-3" />
        </button>
      </span>

      <ComboboxInput
        ref="input"
        class="h-6 min-w-16 flex-1 border-0 bg-transparent p-0 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        autocomplete="off"
        :placeholder="inputPlaceholder"
        :disabled="disabled"
        @click.stop
        @keydown.backspace="onBackspace"
      />

      <ChevronDown
        class="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 transition-transform"
        :class="open ? 'rotate-180' : ''"
      />
    </ComboboxAnchor>

    <ComboboxList align="start">
      <ComboboxEmpty>{{ options.length === 0 ? emptyText : noResultsText }}</ComboboxEmpty>
      <ComboboxViewport>
        <ComboboxGroup>
          <ComboboxItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :disabled="disabled || option.disabled"
            class="pr-8"
          >
            <span
              class="truncate"
              :style="option.depth ? { paddingLeft: `${option.depth * 14}px` } : undefined"
            >
              {{ option.label }}
            </span>
            <ComboboxItemIndicator>
              <CheckIcon />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxViewport>
    </ComboboxList>
  </Combobox>
</template>
