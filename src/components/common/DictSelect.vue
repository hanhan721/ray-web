<!--
  字典选择器组件 (DictSelect)

  功能：
  - 根据 type 自动加载选项
  - 支持单选/多选
  - 支持 placeholder
  - 支持禁用选项
  - 透传 n-select 的其他属性

  使用示例：
  <DictSelect type="sys_gender" v-model="form.gender" />
  <DictSelect type="sys_status" v-model="form.status" placeholder="请选择状态" />
  <DictSelect type="sys_tags" v-model="form.tags" multiple />
  <DictSelect type="sys_sample_source" v-model="form.source" number /> <! -- 返回数字 -->
-->
<template>
  <NSelect
    v-model:value="modelValue"
    :options="options"
    :loading="loading"
    :placeholder="placeholder"
    :multiple="multiple"
    :disabled="disabled"
    :clearable="clearable"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import { useDictStore } from '@/stores/dict'

defineOptions({
  name: 'DictSelect',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 字典类型 */
    type: string
    /** 占位符 */
    placeholder?: string
    /** 是否多选 */
    multiple?: boolean
    /** 是否禁用 */
    disabled?: boolean
    /** 是否可清除 */
    clearable?: boolean
    /** 是否以数字类型返回（适用于整型字典字段） */
    number?: boolean
  }>(),
  {
    placeholder: '请选择',
    multiple: false,
    disabled: false,
    clearable: true,
    number: false,
  }
)

// v-model 绑定（外部可能传入 number，但字典 value 始终是 string，需要适配）
const rawModel = defineModel<string | number | (string | number)[] | null>()

const modelValue = computed({
  get: () => {
    const v = rawModel.value
    if (v === null || v === undefined) return null
    if (Array.isArray(v)) return v.map(String)
    return String(v)
  },
  set: (v) => {
    if (props.number) {
      // 转为数字返回，多选时转为数字数组
      if (Array.isArray(v)) {
        rawModel.value = v.map(Number)
      } else {
        rawModel.value = v != null ? Number(v) : null
      }
    } else {
      rawModel.value = v
    }
  },
})

const dictStore = useDictStore()

const loading = ref(true)
const options = ref<SelectOption[]>([])

// 加载字典数据
async function loadDict() {
  if (!props.type) {
    loading.value = false
    return
  }

  try {
    const items = await dictStore.getDict(props.type)
    options.value = items.map((item) => ({
      label: item.label,
      value: item.value,
      disabled: item.disabled,
    }))
  } finally {
    loading.value = false
  }
}

// 监听 type 变化
watch(
  () => props.type,
  () => {
    loading.value = true
    loadDict()
  },
  { immediate: true }
)
</script>
