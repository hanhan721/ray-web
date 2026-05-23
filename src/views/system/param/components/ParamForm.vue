<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑参数' : '新增参数'"
    :style="{ width: '520px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="90"
      require-mark-placement="right-hanging"
    >
      <NFormItem label="参数键" path="paramKey">
        <NInput
          v-model:value="formData.paramKey"
          :disabled="isEdit"
          placeholder="如 sys.max-upload-size"
        />
      </NFormItem>

      <NFormItem label="参数值" path="paramValue">
        <!-- STRING_LIST 类型：动态数组输入 -->
        <template v-if="formData.paramType === 'STRING_LIST'">
          <div style="width: 100%">
            <div
              v-for="(_, index) in listValues"
              :key="index"
              style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px"
            >
              <NInput
                v-model:value="listValues[index]"
                placeholder="请输入值"
                style="flex: 1"
                @update:value="syncListToParamValue"
              />
              <NButton
                v-if="listValues.length > 1"
                text
                type="error"
                @click="removeListItem(index)"
              >
                <template #icon>
                  <NIcon><RemoveCircleOutline /></NIcon>
                </template>
              </NButton>
            </div>
            <NButton dashed block @click="addListItem">
              <template #icon>
                <NIcon><AddCircleOutline /></NIcon>
              </template>
              添加一项
            </NButton>
          </div>
        </template>
        <!-- 其他类型：普通文本输入 -->
        <NInput v-else v-model:value="formData.paramValue" placeholder="请输入参数值" />
      </NFormItem>

      <NFormItem label="参数类型" path="paramType">
        <NSelect
          v-model:value="formData.paramType"
          :disabled="isEdit"
          :options="ParamTypeOptions"
          placeholder="请选择参数类型"
        />
      </NFormItem>

      <NFormItem label="业务分类" path="bizType">
        <DictSelect
          v-model="formData.bizType"
          type="biz_type"
          :disabled="isEdit"
          placeholder="请选择业务分类"
        />
      </NFormItem>

      <NFormItem label="是否加密" path="encrypted">
        <NSwitch v-model:value="formData.encrypted">
          <template #checked>
            加密
          </template>
          <template #unchecked>
            明文
          </template>
        </NSwitch>
      </NFormItem>

      <NFormItem label="描述" path="description">
        <NInput
          v-model:value="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入参数描述"
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
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSwitch,
  NButton,
  NSpace,
  NIcon,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { AddCircleOutline, RemoveCircleOutline } from '@vicons/ionicons5'
import { createParam, updateParam, type SystemParam } from '@/api/param'
import { ParamTypeOptions } from '@/types/enums'

defineOptions({
  name: 'ParamForm',
})

interface Props {
  show: boolean
  data: SystemParam | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const isEdit = computed(() => !!props.data?.id)

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)


interface FormData {
  id?: number
  paramKey: string
  paramValue: string
  paramType: string
  bizType: string | number | null
  encrypted: boolean
  description: string
}

const defaultFormData: FormData = {
  paramKey: '',
  paramValue: '',
  paramType: 'STRING',
  bizType: '0',
  encrypted: false,
  description: '',
}

const formData = reactive<FormData>({ ...defaultFormData })

// STRING_LIST 类型的数组值
const listValues = ref<string[]>([''])

function syncListToParamValue() {
  formData.paramValue = listValues.value.filter((v) => v.trim() !== '').join(',')
}

function addListItem() {
  listValues.value.push('')
}

function removeListItem(index: number) {
  listValues.value.splice(index, 1)
  syncListToParamValue()
}

// 当参数类型切换为 STRING_LIST 时，将已有的 paramValue 拆分为数组
watch(
  () => formData.paramType,
  (newType) => {
    if (newType === 'STRING_LIST') {
      listValues.value = formData.paramValue
        ? formData.paramValue.split(',').map((v) => v.trim())
        : ['']
    }
  }
)

const rules = computed<FormRules>(() => {
  const base: FormRules = {
    paramValue: [{ required: true, message: '请输入参数值', trigger: 'blur' }],
  }
  if (!isEdit.value) {
    base.paramKey = [
      { required: true, message: '请输入参数键', trigger: 'blur' },
      { max: 100, message: '参数键最长 100 位', trigger: 'blur' },
    ]
    base.paramType = [{ required: true, message: '请选择参数类型', trigger: 'change' }]
    base.bizType = [{ required: true, type: 'number', message: '请选择业务分类', trigger: 'change' }]
  }
  return base
})

watch(
  () => props.data,
  (newData) => {
    if (newData) {
      Object.assign(formData, {
        id: newData.id,
        paramKey: newData.paramKey,
        paramValue: newData.paramValue,
        paramType: newData.paramType,
        bizType: newData.bizType,
        encrypted: newData.encrypted,
        description: newData.description || '',
      })
      // 编辑时回显 STRING_LIST 数组
      if (newData.paramType === 'STRING_LIST' && newData.paramValue) {
        listValues.value = newData.paramValue.split(',').map((v) => v.trim())
      } else {
        listValues.value = ['']
      }
    } else {
      Object.assign(formData, defaultFormData)
      listValues.value = ['']
    }
  },
  { immediate: true }
)

function handleCancel() {
  visible.value = false
}

function handleAfterLeave() {
  Object.assign(formData, defaultFormData)
  listValues.value = ['']
  formRef.value?.restoreValidation()
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (isEdit.value && formData.id) {
      await updateParam({
        id: formData.id,
        paramValue: formData.paramValue,
        encrypted: formData.encrypted,
        description: formData.description || undefined,
      })
      message.success('修改成功')
    } else {
      await createParam({
        paramKey: formData.paramKey,
        paramValue: formData.paramValue,
        paramType: formData.paramType,
        bizType: Number(formData.bizType) ?? 0,
        encrypted: formData.encrypted,
        description: formData.description || undefined,
      })
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
