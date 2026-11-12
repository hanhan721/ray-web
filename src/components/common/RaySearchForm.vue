<script setup lang="ts">
import { FieldGroup } from '@/components/ui/field'

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <form class="ray-search-form" role="search" @submit.prevent="emit('submit')">
    <FieldGroup class="ray-search-fields">
      <slot />
      <div v-if="$slots.actions" class="ray-search-actions">
        <slot name="actions" />
      </div>
      <div v-if="$slots.feedback" class="w-full min-w-0">
        <slot name="feedback" />
      </div>
    </FieldGroup>
  </form>
</template>
