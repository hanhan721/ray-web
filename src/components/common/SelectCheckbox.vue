<script setup lang="ts">
import { Check, Minus } from '@lucide/vue'
import type { SelectionState } from './select'

defineProps<{ state: SelectionState }>()
</script>

<template>
  <span
    class="border-input flex size-4 shrink-0 items-center justify-center rounded border"
    aria-hidden="true"
  >
    <Check v-if="state === 'checked'" class="size-3" />
    <Minus v-else-if="state === 'mixed'" class="size-3" />
  </span>
</template>
