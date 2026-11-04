<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑用户' : '新增用户'"
    :style="{ width: '650px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NSpin :show="detailLoading">
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
            <NFormItem label="用户名" path="username">
              <NInput
                v-model:value="formData.username"
                :disabled="isEdit"
                placeholder="请输入用户名"
              />
            </NFormItem>
          </NGridItem>

          <NGridItem v-if="!isEdit">
            <NFormItem label="密码" path="password">
              <NInput
                v-model:value="formData.password"
                type="password"
                show-password-on="click"
                placeholder="请输入密码"
              />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="昵称" path="nickname">
              <NInput v-model:value="formData.nickname" placeholder="请输入昵称" />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="性别" path="gender">
              <NSelect
                v-model:value="formData.gender"
                :options="genderOptions"
                placeholder="请选择性别"
              />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="邮箱" path="email">
              <NInput v-model:value="formData.email" placeholder="请输入邮箱" />
            </NFormItem>
          </NGridItem>

          <NGridItem>
            <NFormItem label="手机号" path="phone">
              <NInput v-model:value="formData.phone" placeholder="请输入手机号" />
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem label="角色" path="roleIds">
              <NSelect
                v-model:value="formData.roleIds"
                multiple
                :options="roleOptions"
                :loading="rolesLoading"
                placeholder="请选择角色"
                clearable
              />
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
            <NFormItem label="部门" path="deptIds">
              <DeptTreeSelect
                v-model="formData.deptIds"
                multiple
                checkable
                check-strategy="child"
                enabled-only
              />
            </NFormItem>
          </NGridItem>

          <NGridItem :span="2">
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
                :rows="3"
                placeholder="请输入备注"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
      </NForm>
    </NSpin>

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
import type { FormInst, FormRules, SelectOption } from 'naive-ui'
import { createUser, updateUser, assignUserRoles, assignUserDepts, getUserById, type SysUser, type UserForm } from '@/api/user'
import { getRoleList } from '@/api/role'
import { GenderOptions } from '@/types/enums'
import type { Gender } from '@/types/enums'

defineOptions({
  name: 'UserForm',
})

interface Props {
  show: boolean
  data: SysUser | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

// 枚举常量是只读元组，NSelect 需要可变选项数组
const genderOptions = [...GenderOptions]

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

// 详情加载状态
const detailLoading = ref(false)

// 角色列表
const roleOptions = ref<SelectOption[]>([])
const rolesLoading = ref(false)

// 表单数据
interface FormData {
  id?: number
  username: string
  password: string
  nickname: string
  email: string
  phone: string
  gender: Gender
  enabled: boolean
  remark: string
  roleIds: number[]
  deptIds: number[]
}

const defaultFormData: FormData = {
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  gender: 'SECRET',
  enabled: true,
  remark: '',
  roleIds: [],
  deptIds: [],
}

const formData = reactive<FormData>({ ...defaultFormData })

// 表单校验规则
const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度 2-20 位', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '用户名只能包含字母、数字和下划线',
      trigger: 'blur',
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: 'blur',
      validator: (_rule, value) => {
        if (!isEdit.value && !value) {
          return new Error('请输入密码')
        }
        return true
      },
    },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
  ],
  nickname: [{ max: 30, message: '昵称最长 30 位', trigger: 'blur' }],
  email: [
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入正确的邮箱格式',
      trigger: 'blur',
    },
  ],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号格式',
      trigger: 'blur',
    },
  ],
}

// 加载角色选项
async function loadRoleOptions() {
  rolesLoading.value = true
  try {
    const list = await getRoleList()
    roleOptions.value = list
      .filter((r) => r.enabled)
      .map((r) => ({ label: r.roleName, value: r.id }))
  } finally {
    rolesLoading.value = false
  }
}

// 监听弹窗打开，加载角色列表
watch(visible, (val) => {
  if (val) {
    loadRoleOptions()
  }
})

// 监听 data 变化，初始化表单
watch(
  () => props.data,
  async (newData) => {
    if (newData?.id) {
      detailLoading.value = true
      try {
        const detail = await getUserById(newData.id)
        Object.assign(formData, {
          id: detail.user.id,
          username: detail.user.username,
          password: '',
          nickname: detail.user.nickname || '',
          email: detail.user.email || '',
          phone: detail.user.phone || '',
          gender: detail.user.gender || 'SECRET',
          enabled: detail.user.enabled ?? true,
          remark: detail.user.remark || '',
          roleIds: detail.roleIds || [],
          deptIds: detail.deptIds || [],
        })
      } finally {
        detailLoading.value = false
      }
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

    if (isEdit.value && formData.id) {
      // 编辑：三个独立请求
      const basicData: UserForm = {
        username: formData.username,
        nickname: formData.nickname || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender,
        enabled: formData.enabled,
        remark: formData.remark || undefined,
      }
      await Promise.all([
        updateUser({ ...basicData, id: formData.id } as SysUser),
        assignUserRoles(formData.id, formData.roleIds),
        assignUserDepts(formData.id, formData.deptIds),
      ])
      message.success('修改成功')
    } else {
      // 新增
      await createUser({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender,
        enabled: formData.enabled,
        remark: formData.remark || undefined,
        roleIds: formData.roleIds.length ? formData.roleIds : undefined,
        deptIds: formData.deptIds.length ? formData.deptIds : undefined,
      })
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
