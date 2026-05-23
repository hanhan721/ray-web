<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑字典数据' : '新增字典数据'"
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
      <NFormItem label="字典标签" path="dictLabel">
        <NInput v-model:value="formData.dictLabel" placeholder="请输入字典标签" />
      </NFormItem>

      <NFormItem label="字典值" path="dictValue">
        <NInput v-model:value="formData.dictValue" placeholder="请输入字典值" />
      </NFormItem>

      <NGrid :cols="2" :x-gap="16">
        <NGridItem>
          <NFormItem label="样式" path="listClass">
            <NSelect
              v-model:value="formData.listClass"
              :options="listClassOptions"
              placeholder="请选择样式"
              clearable
            />
          </NFormItem>
        </NGridItem>

        <NGridItem>
          <NFormItem label="排序" path="sort">
            <NInputNumber
              v-model:value="formData.sort"
              :min="0"
              placeholder="排序号"
              style="width: 100%"
            />
          </NFormItem>
        </NGridItem>
      </NGrid>

      <NGrid :cols="2" :x-gap="16">
        <NGridItem>
          <NFormItem label="是否默认" path="isDefault">
            <NSwitch v-model:value="formData.isDefault">
              <template #checked>
                是
              </template>
              <template #unchecked>
                否
              </template>
            </NSwitch>
          </NFormItem>
        </NGridItem>

        <NGridItem>
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
        </NGridItem>
      </NGrid>

      <NFormItem label="CSS类名" path="cssClass">
        <NInput v-model:value="formData.cssClass" placeholder="可选，自定义CSS类名" />
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
import { createDictData, updateDictData, type DictData, type DictDataForm } from '@/api/dict-data'

defineOptions({
  name: 'DictDataForm',
})

interface Props {
  show: boolean
  data: DictData | null
  dictType: string
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

// 样式选项
const listClassOptions = [
  { label: '默认', value: 'default' },
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
  { label: '信息', value: 'info' },
]

// 表单数据
interface FormData {
  id?: number
  dictLabel: string
  dictValue: string
  listClass: string | null
  cssClass: string
  sort: number
  isDefault: boolean
  enabled: boolean
}

const defaultFormData: FormData = {
  dictLabel: '',
  dictValue: '',
  listClass: null,
  cssClass: '',
  sort: 0,
  isDefault: false,
  enabled: true,
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  dictLabel: [
    { required: true, message: '请输入字典标签', trigger: 'blur' },
    { max: 100, message: '字典标签最长 100 位', trigger: 'blur' },
  ],
  dictValue: [
    { required: true, message: '请输入字典值', trigger: 'blur' },
    { max: 100, message: '字典值最长 100 位', trigger: 'blur' },
  ],
}

// 监听 data 变化，初始化表单
watch(
  () => props.data,
  (newData: DictData | null) => {
    if (newData) {
      Object.assign(formData, {
        id: newData.id,
        dictLabel: newData.dictLabel,
        dictValue: newData.dictValue,
        listClass: newData.listClass || null,
        cssClass: newData.cssClass || '',
        sort: newData.sort ?? 0,
        isDefault: newData.isDefault ?? false,
        enabled: newData.enabled ?? true,
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

    const requestData: DictDataForm = {
      dictType: props.dictType,
      dictLabel: formData.dictLabel,
      dictValue: formData.dictValue,
      listClass: formData.listClass || undefined,
      cssClass: formData.cssClass || undefined,
      sort: formData.sort,
      isDefault: formData.isDefault,
      enabled: formData.enabled,
    }

    if (isEdit.value && formData.id) {
      await updateDictData({ ...requestData, id: formData.id })
      message.success('修改成功')
    } else {
      await createDictData(requestData)
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
