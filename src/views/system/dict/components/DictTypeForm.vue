<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑字典类型' : '新增字典类型'"
    :style="{ width: '500px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <NFormItem label="字典名称" path="dictName">
        <NInput v-model:value="formData.dictName" placeholder="请输入字典名称" />
      </NFormItem>

      <NFormItem label="字典编码" path="dictType">
        <NInput
          v-model:value="formData.dictType"
          :disabled="isEdit"
          placeholder="请输入字典编码，如 sys_user_status"
        />
      </NFormItem>

      <NFormItem label="状态" path="enabled">
        <NSwitch v-model:value="formData.enabled">
          <template #checked>
            启用
          </template>
          <template #unchecked>
            禁用
          </template>
        </NSwitch>
      </NFormItem>

      <NFormItem label="备注" path="remark">
        <NInput
          v-model:value="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注"
        />
      </NFormItem>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { createDictType, updateDictType, type DictType, type DictTypeForm } from '@/api/dict-type'

defineOptions({
  name: 'DictTypeForm',
})

interface Props {
  show: boolean
  data: DictType | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

// 弹窗可见性
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

// 是否编辑模式
const isEdit = computed(() => !!props.data?.id)

// 表单实例
const formRef = ref<FormInst | null>(null)

// 提交状态
const submitting = ref(false)

// 表单数据
interface FormData {
  id?: number
  dictName: string
  dictType: string
  enabled: boolean
  remark: string
}

const defaultFormData: FormData = {
  dictName: '',
  dictType: '',
  enabled: true,
  remark: '',
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  dictName: [
    { required: true, message: '请输入字典名称', trigger: 'blur' },
    { max: 50, message: '字典名称最长 50 位', trigger: 'blur' },
  ],
  dictType: [
    { required: true, message: '请输入字典编码', trigger: 'blur' },
    { max: 100, message: '字典编码最长 100 位', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '字典编码必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
}

// 监听 data 变化，初始化表单
watch(
  () => props.data,
  (newData: DictType | null) => {
    if (newData) {
      Object.assign(formData, {
        id: newData.id,
        dictName: newData.dictName,
        dictType: newData.dictType,
        enabled: newData.enabled ?? true,
        remark: newData.remark || '',
      })
    } else {
      Object.assign(formData, defaultFormData)
    }
  },
  { immediate: true }
)

// 取消
function handleCancel() {
  visible.value = false
}

// 弹窗关闭后重置
function handleAfterLeave() {
  Object.assign(formData, defaultFormData)
  formRef.value?.restoreValidation()
}

// 提交
async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    const requestData: DictTypeForm = {
      dictName: formData.dictName,
      dictType: formData.dictType,
      enabled: formData.enabled,
      remark: formData.remark || undefined,
    }

    if (isEdit.value && formData.id) {
      await updateDictType({ ...requestData, id: formData.id })
      message.success('修改成功')
    } else {
      await createDictType(requestData)
      message.success('新增成功')
    }

    visible.value = false
    emit('success')
  } catch (error) {
    if (error instanceof Error) {
      message.error(error.message || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
:deep(.n-form-item) {
  margin-bottom: $spacing-md;
}
</style>
