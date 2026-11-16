<script setup lang="ts">
import { shallowRef } from 'vue'
import RaySelect from '../RaySelect.vue'
import type { SelectOption } from '../select'

const strings: SelectOption<string>[] = [{ value: '01', label: 'String' }]
const numbers: SelectOption<number>[] = [{ value: 0, label: 'Zero' }]
const string = shallowRef<string | null>(null)
const number = shallowRef<number | null>(null)
const stringArray = shallowRef<string[]>([])
const numberArray = shallowRef<number[]>([])
const onString = (_value: string | null) => {}
const onNumber = (_value: number | null) => {}
const onStrings = (_value: string[]) => {}
const onNumbers = (_value: number[]) => {}
</script>

<template>
  <RaySelect v-model="string" :options="strings" @change="onString" />
  <RaySelect v-model="number" :options="numbers" @change="onNumber" />
  <RaySelect v-model="stringArray" :options="strings" multiple @change="onStrings" />
  <RaySelect v-model="numberArray" :options="numbers" multiple @change="onNumbers" />
  <!-- @vue-expect-error 单选不接受数组 -->
  <RaySelect v-model="numberArray" :options="numbers" />
  <!-- @vue-expect-error 多选不接受标量 -->
  <RaySelect v-model="number" :options="numbers" multiple />
  <!-- @vue-expect-error 字符串选项不接受数字绑定 -->
  <RaySelect v-model="number" :options="strings" />
  <!-- @vue-expect-error 数字多选不接受字符串数组 -->
  <RaySelect v-model="stringArray" :options="numbers" multiple />
  <!-- @vue-expect-error 单选更新事件保留空值和数字类型 -->
  <RaySelect :model-value="number" :options="numbers" @update:model-value="onStrings" />
  <!-- @vue-expect-error 多选 change 事件保留数组类型 -->
  <RaySelect :model-value="numberArray" :options="numbers" multiple @change="onNumber" />
</template>
