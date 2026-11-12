<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  class?: HTMLAttributes['class']
  required?: boolean
}>()
</script>

<template>
  <Label
    data-slot="field-label"
    :class="
      cn(
        'has-data-checked:bg-primary/5 dark:has-data-checked:bg-primary/10 gap-2 group-data-[disabled]/field:opacity-50 has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-2 group/field-label peer/field-label flex w-fit leading-snug',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        props.class,
      )
    "
  >
    <slot />
    <template v-if="required">
      <span class="text-destructive" aria-hidden="true">*</span>
      <span class="sr-only">（必填）</span>
    </template>
  </Label>
</template>
