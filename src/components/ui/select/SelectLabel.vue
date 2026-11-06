<script setup lang="ts">
import type { SelectLabelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { SelectLabel } from 'reka-ui'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <SelectLabel
    data-slot="select-label"
    :class="cn('tw:text-muted-foreground tw:px-2 tw:py-1.5 tw:text-xs', props.class)"
  >
    <slot></slot>
  </SelectLabel>
</template>
