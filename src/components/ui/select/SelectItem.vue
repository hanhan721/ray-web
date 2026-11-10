<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { CheckIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from 'reka-ui'
import { selectItemClass } from './select-styles'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="cn(selectItemClass, 'pr-7', props.class)"
  >
    <span class="pointer-events-none absolute right-2 flex items-center justify-center">
      <SelectItemIndicator>
        <slot name="indicator-icon">
          <CheckIcon class="pointer-events-none size-3.5" />
        </slot>
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
