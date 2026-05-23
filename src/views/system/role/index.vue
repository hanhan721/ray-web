<template>
  <div class="role-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestRole"
      show-index
      show-selection
      @selection-change="(keys) => selectedIds = keys as number[]"
    >
      <template #toolbar>
        <NButton type="primary" @click="handleAdd">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          新增
        </NButton>
        <ConfirmButton
          :disabled="!selectedIds.length"
          type="error"
          confirm-text="确定要删除选中的角色吗？"
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
          v-model="(row as RoleRow).enabled"
          :api="handleUpdateStatus"
          :params="{ id: (row as RoleRow).id }"
          confirm-text="确定要修改该角色的状态吗？"
          status-field="enabled"
        />
      </template>

      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4">
          <NButton text type="primary" @click="handleEdit(row as RoleRow)">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            编辑
          </NButton>
          <NButton text type="info" @click="handleAuth(row as RoleRow)">
            <template #icon>
              <NIcon><ShieldCheckmarkOutline /></NIcon>
            </template>
            授权
          </NButton>
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要删除该角色吗？"
            @confirm="handleDelete(row as RoleRow)"
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
    <RoleForm
      v-model:show="formVisible"
      :data="currentRow"
      @success="handleFormSuccess"
    />

    <!-- 授权弹窗 -->
    <RoleAuth
      v-model:show="authVisible"
      :data="currentRow"
    />
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import {
  getRolePage,
  updateRoleStatus,
  deleteRoles,
  type Role,
} from '@/api/role'
import RoleForm from './components/RoleForm.vue'
import RoleAuth from './components/RoleAuth.vue'

defineOptions({
  name: 'RolePage',
})

// 为了 ProTable 兼容定义带索引签名的类型
type RoleRow = Role & Record<string, unknown>

const message = useMessage()

// 表格引用
const tableRef = ref<ProTableExpose | null>(null)

// 选中的 ID
const selectedIds = ref<number[]>([])

// 表单弹窗
const formVisible = ref(false)
const currentRow = ref<Role | null>(null)

// 授权弹窗
const authVisible = ref(false)

// 封装请求函数以适配 ProTable
async function requestRole(params: ProTableRequestParams) {
  const result = await getRolePage(params)
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

// 封装状态更新函数以适配 StatusSwitch
async function handleUpdateStatus(params: Record<string, unknown>) {
  const { id, enabled } = params
  return updateRoleStatus(id as number, enabled as boolean)
}

// 表格列配置
const columns: ProTableColumn[] = [
  {
    key: 'roleName',
    title: '角色名称',
    width: 150,
    search: { component: 'input' },
  },
  {
    key: 'roleKey',
    title: '角色标识',
    width: 150,
    search: { component: 'input' },
  },
  {
    key: 'sort',
    title: '排序',
    width: 80,
    align: 'center',
  },
  {
    key: 'enabled',
    title: '状态',
    width: 100,
    align: 'center',
  },
  {
    key: 'remark',
    title: '备注',
    minWidth: 200,
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
    width: 200,
    fixed: 'right',
    align: 'center',
  },
]

// 新增
function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row: RoleRow) {
  currentRow.value = { ...row } as Role
  formVisible.value = true
}

// 授权
function handleAuth(row: RoleRow) {
  currentRow.value = { ...row } as Role
  authVisible.value = true
}

// 删除
async function handleDelete(row: RoleRow) {
  await deleteRoles([row.id])
  message.success('删除成功')
  tableRef.value?.refresh()
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  await deleteRoles(selectedIds.value)
  message.success('批量删除成功')
  tableRef.value?.clearSelection()
  tableRef.value?.refresh()
}

// 表单成功回调
function handleFormSuccess() {
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.role-page {
  padding: $spacing-lg;
}
</style>
