<!--
  部门树选择器组件 (DeptTreeSelect)

  功能：
  - 自动加载部门树
  - 支持单选/多选
  - 支持搜索过滤
  - 支持默认展开
  - 支持仅显示启用的部门

  使用示例：
  <DeptTreeSelect v-model="form.deptId" />

  多选模式：
  <DeptTreeSelect v-model="form.deptIds" multiple checkable />

  仅启用部门：
  <DeptTreeSelect v-model="form.deptId" enabled-only />
-->
<template>
  <NTreeSelect
    v-model:value="modelValue"
    :options="options"
    :loading="loading"
    :placeholder="placeholder"
    :multiple="multiple"
    :disabled="disabled"
    :clearable="clearable"
    :cascade="cascade"
    :checkable="checkable"
    :default-expand-all="defaultExpandAll"
    :check-strategy="checkStrategy"
    filterable
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import type { TreeSelectOption } from 'naive-ui'
import { getDeptTree, type DeptTree } from '@/api/dept'

defineOptions({
  name: 'DeptTreeSelect',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 占位文字 */
    placeholder?: string
    /** 是否多选 */
    multiple?: boolean
    /** 是否禁用 */
    disabled?: boolean
    /** 是否可清除 */
    clearable?: boolean
    /** 是否级联（多选时） */
    cascade?: boolean
    /** 是否可勾选（多选时） */
    checkable?: boolean
    /** 默认展开全部 */
    defaultExpandAll?: boolean
    /** 仅显示启用的部门 */
    enabledOnly?: boolean
    /** 勾选策略 */
    checkStrategy?: 'all' | 'parent' | 'child'
  }>(),
  {
    placeholder: '请选择部门',
    multiple: false,
    disabled: false,
    clearable: true,
    cascade: true,
    checkable: false,
    defaultExpandAll: true,
    enabledOnly: false,
    checkStrategy: 'all',
  }
)

const emit = defineEmits<{
  /** 数据加载完成时触发 */
  (e: 'load', data: DeptTree[]): void
}>()

const modelValue = defineModel<number | number[] | null>({ default: null })

const loading = ref(false)
const treeData = ref<DeptTree[]>([])

// 转换为 TreeSelectOption 格式
const options = computed<TreeSelectOption[]>(() => {
  return transformToOptions(treeData.value)
})

// 递归转换部门树为选项
function transformToOptions(nodes: DeptTree[]): TreeSelectOption[] {
  return nodes
    .filter((node) => !props.enabledOnly || node.enabled)
    .map((node) => ({
      key: node.id,
      label: node.deptName,
      value: node.id,
      disabled: !node.enabled,
      children: node.children?.length ? transformToOptions(node.children) : undefined,
    }))
}

// 加载部门树
async function loadDeptTree() {
  loading.value = true
  try {
    const data = await getDeptTree()
    treeData.value = data || []
    emit('load', treeData.value)
  } catch (error) {
    console.error('加载部门树失败:', error)
    treeData.value = []
  } finally {
    loading.value = false
  }
}

// 刷新数据
function refresh() {
  loadDeptTree()
}

// 组件挂载时加载数据
onMounted(() => {
  loadDeptTree()
})

// 暴露方法
defineExpose({
  /** 刷新部门树 */
  refresh,
  /** 获取部门树数据 */
  getTreeData: () => treeData.value,
})
</script>
