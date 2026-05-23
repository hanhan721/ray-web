<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    :style="{ width: '600px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <NFormItem label="上级菜单" path="parentId">
        <NTreeSelect
          v-model:value="formData.parentId"
          :options="parentOptions"
          placeholder="请选择上级菜单（不选则为顶级）"
          clearable
          default-expand-all
        />
      </NFormItem>

      <NFormItem label="菜单类型" path="type">
        <NRadioGroup v-model:value="formData.type">
          <NRadioButton v-for="item in PermissionTypeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </NRadioButton>
        </NRadioGroup>
      </NFormItem>

      <NFormItem label="菜单名称" path="name">
        <NInput v-model:value="formData.name" placeholder="请输入菜单名称" />
      </NFormItem>

      <NFormItem v-if="formData.type !== 'BUTTON'" label="路由路径" path="url">
        <NInput v-model:value="formData.url" placeholder="请输入路由路径，如 /system/user" />
      </NFormItem>

      <NFormItem v-if="formData.type === 'MENU'" label="组件路径" path="component">
        <NInput v-model:value="formData.component" placeholder="请输入组件路径，如 system/user/index" />
      </NFormItem>

      <NFormItem v-if="formData.type === 'MENU'" label="路由名称" path="routeName">
        <NInput v-model:value="formData.routeName" placeholder="与组件 defineOptions name 一致，如 UserPage" />
      </NFormItem>

      <NFormItem v-if="formData.type === 'DIRECTORY'" label="重定向" path="redirect">
        <NInput v-model:value="formData.redirect" placeholder="请输入重定向路径" />
      </NFormItem>

      <NFormItem v-if="formData.type === 'BUTTON'" label="权限标识" path="code">
        <NInput v-model:value="formData.code" placeholder="请输入权限标识，如 system:user:add" />
      </NFormItem>

      <NFormItem v-if="formData.type !== 'BUTTON'" label="图标" path="icon">
        <IconSelect v-model="formData.icon" placeholder="选择菜单图标" />
      </NFormItem>

      <NGrid :cols="2" :x-gap="24">
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

      <NGrid v-if="formData.type !== 'BUTTON'" :cols="2" :x-gap="24">
        <NGridItem>
          <NFormItem label="隐藏菜单" path="hidden">
            <NSwitch v-model:value="formData.hidden">
              <template #checked>
                隐藏
              </template>
              <template #unchecked>
                显示
              </template>
            </NSwitch>
          </NFormItem>
        </NGridItem>

        <NGridItem>
          <NFormItem label="缓存页面" path="keepAlive">
            <NSwitch v-model:value="formData.keepAlive">
              <template #checked>
                缓存
              </template>
              <template #unchecked>
                不缓存
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
import { createPermission, updatePermission } from '@/api/permission'
import type { PermissionTree, PermissionForm } from '@/types/permission'
import { PermissionTypeOptions } from '@/types/enums'
import type { PermissionType } from '@/types/enums'

defineOptions({
  name: 'MenuForm',
})

interface Props {
  show: boolean
  data: PermissionTree | null
  treeData: PermissionTree[]
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
  name: string
  type: PermissionType
  url: string
  component: string
  routeName: string
  redirect: string
  code: string
  icon: string
  sort: number
  hidden: boolean
  keepAlive: boolean
  enabled: boolean
}

const defaultFormData: FormData = {
  parentId: null,
  name: '',
  type: 'MENU',
  url: '',
  component: '',
  routeName: '',
  redirect: '',
  code: '',
  icon: '',
  sort: 0,
  hidden: false,
  keepAlive: false,
  enabled: true,
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
  url: [
    {
      required: true,
      message: '请输入路由路径',
      trigger: 'blur',
      validator: (_rule, value) => {
        if (formData.type !== 'BUTTON' && !value) {
          return new Error('请输入路由路径')
        }
        return true
      },
    },
  ],
  component: [
    {
      validator: (_rule, value) => {
        if (formData.type === 'MENU' && !value) {
          return new Error('请输入组件路径')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
  code: [
    {
      validator: (_rule, value) => {
        if (formData.type === 'BUTTON' && !value) {
          return new Error('请输入权限标识')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

// 上级菜单选项（转换为树形选择器格式）
const parentOptions = computed<TreeSelectOption[]>(() => {
  function transform(nodes: PermissionTree[]): TreeSelectOption[] {
    return nodes
      .filter((node) => node.type !== 'BUTTON') // 按钮不能作为父级
      .map((node) => ({
        key: node.id,
        label: node.name,
        value: node.id,
        children: node.children?.length ? transform(node.children) : undefined,
      }))
  }
  return transform(props.treeData)
})

// 监听 data 变化，初始化表单
watch(
  () => props.data,
  (newData: PermissionTree | null) => {
    if (newData) {
      // 如果有 id，说明是编辑模式
      if (newData.id) {
        Object.assign(formData, {
          id: newData.id,
          parentId: newData.parentId || null,
          name: newData.name,
          type: newData.type,
          url: newData.url || '',
          component: newData.component || '',
          routeName: newData.routeName || '',
          redirect: newData.redirect || '',
          code: newData.code || '',
          icon: newData.icon || '',
          sort: newData.sort ?? 0,
          hidden: newData.hidden ?? false,
          keepAlive: newData.keepAlive ?? false,
          enabled: newData.enabled ?? true,
        })
      } else {
        // 新增子项，只设置 parentId
        Object.assign(formData, {
          ...defaultFormData,
          parentId: newData.parentId || null,
        })
      }
    } else {
      // 新增顶级
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

    const requestData: PermissionForm = {
      parentId: formData.parentId ?? 0,
      name: formData.name,
      type: formData.type,
      url: formData.type !== 'BUTTON' ? formData.url : undefined,
      component: formData.type === 'MENU' ? formData.component : undefined,
      routeName: formData.type === 'MENU' ? formData.routeName || undefined : undefined,
      redirect: formData.type === 'DIRECTORY' ? formData.redirect : undefined,
      code: formData.type === 'BUTTON' ? formData.code : undefined,
      icon: formData.type !== 'BUTTON' ? formData.icon || undefined : undefined,
      sort: formData.sort,
      hidden: formData.type !== 'BUTTON' ? formData.hidden : undefined,
      keepAlive: formData.type !== 'BUTTON' ? formData.keepAlive : undefined,
      enabled: formData.enabled,
    }

    if (isEdit.value && formData.id) {
      await updatePermission({ ...requestData, id: formData.id })
      message.success('修改成功')
    } else {
      await createPermission(requestData)
      message.success('新增成功')
    }

    visible.value = false
    emit('success')
  } catch (error) {
    // 表单验证失败或请求失败
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
