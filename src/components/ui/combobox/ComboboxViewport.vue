<script setup lang="ts">
import type { ComboboxViewportProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { ComboboxViewport, useForwardProps } from 'reka-ui'

const props = defineProps<ComboboxViewportProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <ComboboxViewport
    data-slot="combobox-viewport"
    v-bind="forwarded"
    :class="
      cn(
        'no-scrollbar max-h-[min(16rem,var(--reka-combobox-content-available-height,16rem))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0',
        props.class,
      )
    "
  >
    <slot />
  </ComboboxViewport>
</template>
