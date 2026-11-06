<template>
  <div :class="route.query.ui === 'headless' ? 'user-comparison' : 'user-page'">
    <UserHeadless v-if="route.query.ui === 'headless'" @compare="showOriginal" />
    <template v-else>
      <ProTable
        ref="tableRef"
        :columns="columns"
        :request="requestUser"
        :page-key="PAGE_KEYS.SYS_USER"
        show-index
        show-selection
        @selection-change="(keys) => selectedIds = keys as number[]"
      >
        <template #toolbar>
          <NButton secondary type="info" @click="showHeadless">
            新版对照
          </NButton>
          <NButton type="primary" @click="handleAdd">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            新增
          </NButton>
          <ConfirmButton
            :disabled="!selectedIds.length"
            type="error"
            confirm-text="确定要删除选中的用户吗？"
            @confirm="handleBatchDelete"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            批量删除
          </ConfirmButton>
        </template>

        <!-- 状态列 -->
        <template #cell-enabled="{ row }">
          <StatusSwitch
            v-model="(row as UserRow).enabled"
            :api="handleUpdateStatus"
            :params="{ id: (row as UserRow).id }"
            confirm-text="确定要修改该用户的状态吗？"
            status-field="enabled"
          />
        </template>

        <!-- 操作列 -->
        <template #cell-actions="{ row }">
          <NSpace :size="4">
            <NButton text type="primary" @click="handleEdit(row as UserRow)">
              <template #icon>
                <NIcon><CreateOutline /></NIcon>
              </template>
              编辑
            </NButton>
            <NButton text type="info" @click="handleResetPassword(row as UserRow)">
              <template #icon>
                <NIcon><LockClosedOutline /></NIcon>
              </template>
              重置密码
            </NButton>
            <ConfirmButton
              text
              type="error"
              confirm-text="确定要删除该用户吗？"
              @confirm="handleDelete(row as UserRow)"
            >
              <template #icon>
                <NIcon><TrashOutline /></NIcon>
              </template>
              删除
            </ConfirmButton>
          </NSpace>
        </template>
      </ProTable>

      <!-- 新增/编辑表单弹窗 -->
      <UserForm
        v-model:show="formVisible"
        :data="currentRow"
        @success="handleFormSuccess"
      />

      <!-- 重置密码弹窗 -->
      <NModal
        v-model:show="passwordVisible"
        preset="card"
        title="重置密码"
        :style="{ width: '400px' }"
        :mask-closable="false"
      >
        <NForm
          ref="passwordFormRef"
          :model="passwordForm"
          :rules="passwordRules"
          label-placement="left"
          label-width="80"
        >
          <NFormItem label="新密码" path="password">
            <NInput
              v-model:value="passwordForm.password"
              type="password"
              show-password-on="click"
              placeholder="请输入新密码"
            />
          </NFormItem>
          <NFormItem label="确认密码" path="confirmPassword">
            <NInput
              v-model:value="passwordForm.confirmPassword"
              type="password"
              show-password-on="click"
              placeholder="请再次输入新密码"
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <NSpace justify="end">
            <NButton @click="passwordVisible = false">
              取消
            </NButton>
            <NButton type="primary" :loading="passwordLoading" @click="handlePasswordSubmit">
              确定
            </NButton>
          </NSpace>
        </template>
      </NModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  LockClosedOutline,
} from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import {
  getUserPage,
  deleteUsers,
  resetUserPassword,
  updateUserStatus,
  type SysUser,
} from '@/api/user'
import { GenderLabel, PAGE_KEYS, type Gender } from '@/types/enums'
import UserForm from './components/UserForm.vue'
import UserHeadless from './headless/index.vue'

defineOptions({
  name: 'UserPage',
})

// 为了 ProTable 兼容定义带索引签名的类型
type UserRow = SysUser & Record<string, unknown>

const message = useMessage()
const route = useRoute()
const router = useRouter()

function showHeadless() {
  router.replace({ query: { ...route.query, ui: 'headless' } })
}

function showOriginal() {
  router.replace({ query: { ...route.query, ui: undefined } })
}

// 表格引用
const tableRef = ref<ProTableExpose | null>(null)

// 选中的 ID
const selectedIds = ref<number[]>([])

// 表单弹窗
const formVisible = ref(false)
const currentRow = ref<SysUser | null>(null)

// 重置密码弹窗
const passwordVisible = ref(false)
const passwordLoading = ref(false)
const passwordFormRef = ref<FormInst | null>(null)
const passwordUserId = ref<number | null>(null)
const passwordForm = reactive({
  password: '',
  confirmPassword: '',
})

// 密码表单规则
const passwordRules: FormRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value) => {
        if (value !== passwordForm.password) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
}

// 封装状态更新函数以适配 StatusSwitch
async function handleUpdateStatus(params: Record<string, unknown>) {
  const { id, enabled } = params
  return updateUserStatus(id as number, enabled as boolean)
}

// 封装请求函数以适配 ProTable
async function requestUser(params: ProTableRequestParams) {
  const result = await getUserPage(params)
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

// 表格列配置
const columns: ProTableColumn[] = [
  {
    key: 'username',
    title: '用户名',
    width: 120,
    search: { component: 'input' },
  },
  {
    key: 'nickname',
    title: '昵称',
    width: 120,
  },
  {
    key: 'email',
    title: '邮箱',
    width: 180,
  },
  {
    key: 'phone',
    title: '手机号',
    width: 140,
  },
  {
    key: 'gender',
    title: '性别',
    width: 80,
    align: 'center',
    render: (row) => GenderLabel[(row as UserRow).gender as Gender] || '-',
  },
  {
    key: 'enabled',
    title: '状态',
    width: 100,
    align: 'center',
    search: {
      component: 'select',
      props: {
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false },
        ],
      },
    },
  },
  {
    key: 'lastLoginTime',
    title: '最后登录',
    width: 180,
  },
  {
    key: 'createTime',
    title: '创建时间',
    width: 180,
    sorter: true,
  },
  {
    key: 'actions',
    title: '操作',
    width: 220,
    fixed: 'right',
    align: 'center',
    configLocked: true,
  },
]

// 新增
function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row: UserRow) {
  currentRow.value = { ...row } as SysUser
  formVisible.value = true
}

// 删除
async function handleDelete(row: UserRow) {
  await deleteUsers([row.id])
  message.success('删除成功')
  tableRef.value?.refresh()
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  await deleteUsers(selectedIds.value)
  message.success('批量删除成功')
  tableRef.value?.clearSelection()
  tableRef.value?.refresh()
}

// 重置密码
function handleResetPassword(row: UserRow) {
  passwordUserId.value = row.id
  passwordForm.password = ''
  passwordForm.confirmPassword = ''
  passwordVisible.value = true
}

// 提交重置密码
async function handlePasswordSubmit() {
  try {
    await passwordFormRef.value?.validate()
    passwordLoading.value = true

    await resetUserPassword(passwordUserId.value!, passwordForm.password)
    message.success('密码重置成功')
    passwordVisible.value = false
  } finally {
    passwordLoading.value = false
  }
}

// 表单成功回调
function handleFormSuccess() {
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.user-page {
  padding: $spacing-lg;
}
</style>
