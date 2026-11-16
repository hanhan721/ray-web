<script setup lang="ts">
import { shallowRef } from 'vue'
import RaySelect from '../RaySelect.vue'
import RayFormDialog from '../RayFormDialog.vue'

const strings = [
  { value: '01', label: 'Alpha' },
  { value: '02', label: 'Beta', depth: 1 },
  { value: '', label: 'Empty string' },
  { value: 'disabled', label: 'Disabled', disabled: true },
]
const numbers = [
  { value: 0, label: 'Zero' },
  { value: 1, label: 'One' },
  { value: 2, label: 'Two' },
]
const string = shallowRef<string | null>(null)
const number = shallowRef<number | null>(null)
const stringArray = shallowRef<string[]>([])
const numberArray = shallowRef<number[]>([])
const open = shallowRef(false)
const submits = shallowRef(0)
</script>

<template>
  <main class="mx-auto flex max-w-lg flex-col gap-5 p-10">
    <RaySelect v-model="string" :options="strings" aria-label="String single" />
    <RaySelect v-model="number" :options="numbers" aria-label="Number single" :searchable="false" />
    <RaySelect
      v-model="stringArray"
      :options="strings"
      aria-label="String multiple"
      multiple
      :max-visible="1"
      :max-selection="2"
    >
      <template #option="{ option, selected }"
        ><span>{{ option.label }}</span
        ><span v-if="selected" class="sr-only">chosen</span></template
      >
    </RaySelect>
    <RaySelect
      v-model="numberArray"
      :options="numbers"
      aria-label="Number multiple"
      multiple
      :max-selection="2"
    />
    <RaySelect :model-value="null" :options="strings" aria-label="Disabled select" disabled />
    <button type="button" @click="open = true">Open dialog</button>
    <output data-testid="values">{{
      JSON.stringify({ string, number, stringArray, numberArray, submits })
    }}</output>
    <RayFormDialog v-model:open="open" title="Selection dialog" @submit="submits++">
      <div class="flex flex-col gap-5">
        <input aria-label="First field" />
        <RaySelect
          v-model="string"
          :options="strings"
          aria-label="Dialog single"
          name="single"
          required
        />
        <RaySelect
          v-model="numberArray"
          :options="numbers"
          aria-label="Dialog multiple"
          multiple
          name="many"
        />
      </div>
      <template #footer><button type="submit">Save</button></template>
    </RayFormDialog>
  </main>
</template>
