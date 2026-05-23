<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑部门' : '新增部门'"
    :style="{ width: '550px' }"
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
      <NFormItem label="上级部门" path="parentId">
        <NTreeSelect
          v-model:value="formData.parentId"
          :options="parentOptions"
          placeholder="请选择上级部门（不选则为顶级）"
          clearable
          default-expand-all
        />
      </NFormItem>

      <NFormItem label="部门名称" path="deptName">
        <NInput v-model:value="formData.deptName" placeholder="请输入部门名称" />
      </NFormItem>

      <NGrid :cols="2" :x-gap="16">
        <NGridItem>
          <NFormItem label="负责人" path="leader">
            <NInput v-model:value="formData.leader" placeholder="请输入负责人" />
          </NFormItem>
        </NGridItem>

        <NGridItem>
          <NFormItem label="联系电话" path="phone">
            <NInput v-model:value="formData.phone" placeholder="请输入联系电话" />
          </NFormItem>
        </NGridItem>
      </NGrid>

      <NFormItem label="邮箱" path="email">
        <NInput v-model:value="formData.email" placeholder="请输入邮箱" />
      </NFormItem>

      <NGrid :cols="2" :x-gap="16">
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
import type { FormInst, FormRules, TreeSelectOption } from 'naive-ui'
import { createDept, updateDept, type DeptTree, type DeptForm } from '@/api/dept'

defineOptions({
  name: 'DeptForm',
})

interface Props {
  show: boolean
  data: DeptTree | null
  treeData: DeptTree[]
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
const isEdit = computed(() => props.data?.id !== undefined)

// 表单实例
const formRef = ref<FormInst | null>(null)

// 提交状态
const submitting = ref(false)

// 表单数据
interface FormData {
  id?: number
  parentId: number | null
  deptName: string
  leader: string
  phone: string
  email: string
  sort: number
  enabled: boolean
}

const defaultFormData: FormData = {
  parentId: null,
  deptName: '',
  leader: '',
  phone: '',
  email: '',
  sort: 0,
  enabled: true,
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  deptName: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { max: 50, message: '部门名称最长 50 位', trigger: 'blur' },
  ],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur',
    },
  ],
  email: [
    {
      type: 'email',
      message: '请输入正确的邮箱',
      trigger: 'blur',
    },
  ],
}

// 上级部门选项（转换为树形选择器格式）
const parentOptions = computed<TreeSelectOption[]>(() => {
  function transform(nodes: DeptTree[]): TreeSelectOption[] {
    return nodes.map((node) => ({
      key: node.id,
      label: node.deptName,
      value: node.id,
      disabled: isEdit.value && node.id === formData.id, // 编辑时不能选择自己
      children: node.children?.length ? transform(node.children) : undefined,
    }))
  }
  return transform(props.treeData)
})

// 监听 data 变化，初始化表单
watch(
  () => props.data,
  (newData: DeptTree | null) => {
    if (newData) {
      // 如果有 id，说明是编辑模式
      if (newData.id) {
        Object.assign(formData, {
          id: newData.id,
          parentId: newData.parentId || null,
          deptName: newData.deptName,
          leader: newData.leader || '',
          phone: newData.phone || '',
          email: newData.email || '',
          sort: newData.sort ?? 0,
          enabled: newData.enabled ?? true,
        })
      } else {
        // 新增子部门，只设置 parentId
        Object.assign(formData, {
          ...defaultFormData,
          parentId: newData.parentId || null,
        })
      }
    } else {
      // 新增顶级部门
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

    // 构建请求数据
    const requestData: DeptForm = {
      parentId: formData.parentId ?? 0,
      deptName: formData.deptName,
      leader: formData.leader || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      sort: formData.sort,
      enabled: formData.enabled,
    }

    if (isEdit.value && formData.id) {
      await updateDept({ ...requestData, id: formData.id })
      message.success('修改成功')
    } else {
      await createDept(requestData)
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
