<!--
  字典标签组件 (DictTag)

  功能：
  - 根据 type + value 显示对应的字典标签
  - 支持不同标签颜色（通过 tagType）
  - 支持加载中状态
  - 值不存在时的降级显示

  使用示例：
  <DictTag type="sys_status" :value="row.status" />
  <DictTag type="sys_gender" :value="row.gender" />
-->
<template>
  <NSpin v-if="loading" size="small" :stroke-width="12" />
  <NTag v-else :type="tagType" size="small">
    {{ label }}
  </NTag>
</template>

<script setup lang="ts">
import { useDictStore, type DictItem } from '@/stores/dict'

defineOptions({
  name: 'DictTag',
})

const props = defineProps<{
  /** 字典类型 */
  type: string
  /** 字典值 */
  value: string | number | undefined | null
}>()

const dictStore = useDictStore()

const loading = ref(true)
const dictItem = ref<DictItem | undefined>()

// 计算标签文本
const label = computed(() => {
  if (props.value === undefined || props.value === null) {
    return '-'
  }
  return dictItem.value?.label ?? String(props.value)
})

// 计算标签类型
const tagType = computed(() => {
  return dictItem.value?.tagType ?? 'default'
})

// 加载字典数据
async function loadDict() {
  if (!props.type || props.value === undefined || props.value === null) {
    loading.value = false
    return
  }

  try {
    await dictStore.getDict(props.type)
    dictItem.value = dictStore.getItemSync(props.type, props.value)
  } finally {
    loading.value = false
  }
}

// 监听 type 和 value 变化
watch(
  () => [props.type, props.value] as const,
  () => {
    loading.value = true
    loadDict()
  },
  { immediate: true }
)
</script>
