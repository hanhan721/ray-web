<!--
  确认按钮组件 (ConfirmButton)

  功能：
  - 点击弹出确认框
  - 支持自定义确认文案
  - 支持 loading 状态
  - 透传 n-button 属性

  使用示例：
  <ConfirmButton
    type="error"
    text
    confirm-text="确定要删除该用户吗？"
    @confirm="handleDelete(row.id)"
  >
    删除
  </ConfirmButton>

  自定义标题和按钮文案：
  <ConfirmButton
    confirm-title="警告"
    confirm-text="此操作不可恢复，确定继续吗？"
    positive-text="继续"
    negative-text="返回"
    @confirm="handleDanger"
  >
    危险操作
  </ConfirmButton>
-->
<template>
  <NButton
    :loading="loading"
    v-bind="$attrs"
    @click="handleClick"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon"></slot>
    </template>
    <slot></slot>
  </NButton>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ConfirmButton',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 确认文案 */
    confirmText?: string
    /** 确认标题 */
    confirmTitle?: string
    /** loading 状态 */
    loading?: boolean
    /** 确认按钮文案 */
    positiveText?: string
    /** 取消按钮文案 */
    negativeText?: string
  }>(),
  {
    confirmText: '确定要执行此操作吗？',
    confirmTitle: '提示',
    loading: false,
    positiveText: '确定',
    negativeText: '取消',
  }
)

const emit = defineEmits<{
  /** 用户点击确认时触发 */
  (e: 'confirm'): void
  /** 用户点击取消时触发 */
  (e: 'cancel'): void
}>()

const dialog = useDialog()

function handleClick() {
  dialog.warning({
    title: props.confirmTitle,
    content: props.confirmText,
    positiveText: props.positiveText,
    negativeText: props.negativeText,
    onPositiveClick: () => emit('confirm'),
    onNegativeClick: () => emit('cancel'),
  })
}
</script>
