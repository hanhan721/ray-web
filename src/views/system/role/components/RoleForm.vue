<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑角色' : '新增角色'"
    :style="{ width: '560px' }"
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
      <NGrid :cols="2" :x-gap="16">
        <NGridItem>
          <NFormItem label="角色名称" path="roleName">
            <NInput v-model:value="formData.roleName" placeholder="请输入角色名称" />
          </NFormItem>
        </NGridItem>

        <NGridItem>
          <NFormItem label="角色标识" path="roleKey">
            <NInput
              v-model:value="formData.roleKey"
              :disabled="isEdit"
              placeholder="请输入角色标识，如 admin"
            />
          </NFormItem>
        </NGridItem>

        <NGridItem>
          <NFormItem label="排序" path="sort">
            <NInputNumber
              v-model:value="formData.sort"
              :min="0"
              placeholder="请输入排序号"
              style="width: 100%"
            />
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

        <NGridItem :span="2">
          <NFormItem label="备注" path="remark">
            <NInput
              v-model:value="formData.remark"
              type="textarea"
              :rows="2"
              placeholder="请输入备注"
            />
          </NFormItem>
        </NGridItem>
      </NGrid>
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
import { createRole, updateRole, type Role, type RoleForm } from '@/api/role'

defineOptions({
  name: 'RoleForm',
})

interface Props {
  show: boolean
  data: Role | null
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
  roleName: string
  roleKey: string
  sort: number
  enabled: boolean
  remark: string
}

const defaultFormData: FormData = {
  roleName: '',
  roleKey: '',
  sort: 0,
  enabled: true,
  remark: '',
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  roleName: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { max: 30, message: '角色名称最长 30 位', trigger: 'blur' },
  ],
  roleKey: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    { max: 50, message: '角色标识最长 50 位', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '角色标识必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
}

// 监听弹窗打开，填充表单数据
watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      if (props.data) {
        Object.assign(formData, {
          id: props.data.id,
          roleName: props.data.roleName,
          roleKey: props.data.roleKey,
          sort: props.data.sort ?? 0,
          enabled: props.data.enabled ?? true,
          remark: props.data.remark || '',
        })
      } else {
        Object.assign(formData, defaultFormData)
      }
    }
  }
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

    const requestData: RoleForm = {
      roleName: formData.roleName,
      roleKey: formData.roleKey,
      sort: formData.sort,
      enabled: formData.enabled,
      remark: formData.remark || undefined,
    }

    if (isEdit.value && formData.id) {
      await updateRole({ ...requestData, id: formData.id } as Role)
      message.success('修改成功')
    } else {
      await createRole(requestData)
      message.success('新增成功')
    }

    visible.value = false
    emit('success')
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
