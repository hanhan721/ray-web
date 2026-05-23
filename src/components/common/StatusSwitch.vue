<!--
  状态切换组件 (StatusSwitch)

  功能：
  - 表格中常用的状态切换开关
  - 切换前二次确认（可选）
  - 自动调用 API
  - loading 状态
  - 成功/失败提示

  使用示例：
  <StatusSwitch
    v-model="row.enabled"
    :api="updateUserStatus"
    :params="{ id: row.id }"
    confirm-text="确定要修改状态吗？"
  />

  不需要确认:
  <StatusSwitch
    v-model="row.enabled"
    :api="updateStatus"
    :params="{ id: row.id }"
    :confirm="false"
  />
-->
<template>
  <NSwitch
    :value="modelValue"
    :loading="loading"
    :disabled="disabled"
    @update:value="handleChange"
  />
</template>

<script setup lang="ts">
defineOptions({
  name: 'StatusSwitch',
})

const props = withDefaults(
  defineProps<{
    /** API 调用函数，接收 params 和新状态值 */
    api: (params: Record<string, unknown>) => Promise<unknown>
    /** API 参数（不含状态值） */
    params?: Record<string, unknown>
    /** 状态字段名，默认 'enabled' */
    statusField?: string
    /** 是否需要确认，默认 true */
    confirm?: boolean
    /** 确认文案 */
    confirmText?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 成功提示文案 */
    successText?: string
  }>(),
  {
    params: () => ({}),
    statusField: 'enabled',
    confirm: true,
    confirmText: '确定要修改状态吗？',
    disabled: false,
    successText: '状态修改成功',
  }
)

const emit = defineEmits<{
  /** 状态变更成功后触发 */
  (e: 'success', value: boolean): void
  /** 状态变更失败后触发 */
  (e: 'error', error: Error): void
}>()

// v-model 绑定
const modelValue = defineModel<boolean>({ required: true })

const dialog = useDialog()
const message = useMessage()

const loading = ref(false)

// 处理状态变更
async function handleChange(newValue: boolean) {
  if (props.confirm) {
    dialog.warning({
      title: '提示',
      content: props.confirmText,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => doChange(newValue),
    })
  } else {
    await doChange(newValue)
  }
}

// 执行状态变更
async function doChange(newValue: boolean) {
  loading.value = true
  try {
    await props.api({
      ...props.params,
      [props.statusField]: newValue,
    })
    modelValue.value = newValue
    message.success(props.successText)
    emit('success', newValue)
  } catch (error) {
    message.error((error as Error).message || '状态修改失败')
    emit('error', error as Error)
  } finally {
    loading.value = false
  }
}
</script>
