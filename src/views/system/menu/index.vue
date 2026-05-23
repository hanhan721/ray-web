<template>
  <div class="menu-page">
    <!-- 操作栏 -->
    <NCard class="action-card">
      <NSpace justify="space-between">
        <NSpace>
          <NButton type="primary" @click="handleAdd">
            <template #icon>
              <NIcon>
                <AddOutline />
              </NIcon>
            </template>
            新增
          </NButton>
          <NButton @click="handleExpandAll">
            <template #icon>
              <NIcon>
                <ChevronDownOutline />
              </NIcon>
            </template>
            {{ isExpanded ? '全部收起' : '全部展开' }}
          </NButton>
        </NSpace>
        <NButton :loading="refreshing" @click="handleRefresh">
          <template #icon>
            <NIcon>
              <RefreshOutline />
            </NIcon>
          </template>
          刷新
        </NButton>
      </NSpace>
    </NCard>

    <!-- 数据表格 -->
    <NCard class="table-card">
      <NDataTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="(row: PermissionTree) => row.id"
        :expanded-row-keys="expandedRowKeys"
        @update:expanded-row-keys="handleExpandedRowKeysChange"
      />
    </NCard>

    <!-- 表单弹窗 -->
    <MenuForm
      v-model:show="formVisible"
      :data="currentRow"
      :tree-data="tableData"
      @success="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { NTag, NButton, NIcon, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import type { Component } from 'vue'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  RefreshOutline,
  ChevronDownOutline,
} from '@vicons/ionicons5'
import * as IonIcons from '@vicons/ionicons5'
import { getPermissionTree, deletePermission, clearPermissionTreeCache, clearPermissionCache } from '@/api/permission'
import type { PermissionTree } from '@/types/permission'
import type { PermissionType } from '@/types/enums'
import MenuForm from './components/MenuForm.vue'

defineOptions({
  name: 'MenuPage',
})

const message = useMessage()

// 状态
const loading = ref(false)
const refreshing = ref(false)
const tableData = ref<PermissionTree[]>([])
const formVisible = ref(false)
const currentRow = ref<PermissionTree | null>(null)
const expandedRowKeys = ref<number[]>([])
const isExpanded = ref(false)

// 类型映射
const typeMap: Record<PermissionType, { label: string; type: 'success' | 'info' | 'warning' }> = {
  DIRECTORY: { label: '目录', type: 'info' },
  MENU: { label: '菜单', type: 'success' },
  BUTTON: { label: '按钮', type: 'warning' },
}

// 表格列定义
const columns: DataTableColumns<PermissionTree> = [
  {
    title: '名称',
    key: 'name',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: '类型',
    key: 'type',
    width: 100,
    render(row) {
      const config = typeMap[row.type]
      return h(NTag, { type: config.type, size: 'small' }, { default: () => config.label })
    },
  },
  {
    title: '路由路径',
    key: 'url',
    width: 150,
    ellipsis: { tooltip: true },
  },
  {
    title: '组件路径',
    key: 'component',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: '权限标识',
    key: 'code',
    width: 140,
    ellipsis: { tooltip: true },
  },
  {
    title: '图标',
    key: 'icon',
    width: 80,
    align: 'center',
    render(row) {
      if (!row.icon) return '-'
      const IconComp = (IonIcons as Record<string, Component>)[row.icon]
      if (!IconComp) return '-'
      return h(NIcon, { size: 18 }, { default: () => h(IconComp) })
    },
  },
  {
    title: '排序',
    key: 'sort',
    width: 80,
    align: 'center',
  },
  {
    title: '状态',
    key: 'enabled',
    width: 80,
    render(row) {
      return h(
        NTag,
        { type: row.enabled ? 'success' : 'error', size: 'small' },
        { default: () => (row.enabled ? '启用' : '禁用') }
      )
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 4 }, () => [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => handleEdit(row),
          },
          {
            default: () => '编辑',
            icon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
          }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'info',
            onClick: () => handleAddChild(row),
          },
          {
            default: () => '新增子项',
            icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
          }
        ),
        h(
          resolveComponent('ConfirmButton'),
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            confirmText: '确定删除该菜单吗？',
            onConfirm: () => handleDelete(row),
          },
          {
            default: () => '删除',
            icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
          }
        ),
      ])
    },
  },
]

// 获取数据（普通加载，复用前端缓存）
async function fetchData() {
  loading.value = true
  try {
    tableData.value = await getPermissionTree()
  } finally {
    loading.value = false
  }
}

// 手动刷新：先清后端缓存 + 前端缓存，再重新拉取
async function handleRefresh() {
  refreshing.value = true
  try {
    await clearPermissionCache()
    clearPermissionTreeCache()
    await fetchData()
  } finally {
    refreshing.value = false
  }
}

// 获取所有节点 ID（用于展开/收起）
function getAllRowKeys(data: PermissionTree[]): number[] {
  const keys: number[] = []
  function traverse(nodes: PermissionTree[]) {
    for (const node of nodes) {
      if (node.children?.length) {
        keys.push(node.id)
        traverse(node.children)
      }
    }
  }
  traverse(data)
  return keys
}

// 展开/收起切换
function handleExpandAll() {
  if (isExpanded.value) {
    expandedRowKeys.value = []
  } else {
    expandedRowKeys.value = getAllRowKeys(tableData.value)
  }
  isExpanded.value = !isExpanded.value
}

// 展开行 key 变更
function handleExpandedRowKeysChange(keys: number[]) {
  expandedRowKeys.value = keys
}

// 新增
function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

// 新增子项
function handleAddChild(row: PermissionTree) {
  currentRow.value = { parentId: row.id } as PermissionTree
  formVisible.value = true
}

// 编辑
function handleEdit(row: PermissionTree) {
  currentRow.value = { ...row }
  formVisible.value = true
}

// 删除
async function handleDelete(row: PermissionTree) {
  await deletePermission(row.id)
  message.success('删除成功')
  fetchData()
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.menu-page {
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.action-card {
  :deep(.n-card__content) {
    padding: $spacing-md $spacing-lg;
  }
}

.table-card {
  flex: 1;

  :deep(.n-card__content) {
    padding: $spacing-md $spacing-lg;
  }
}
</style>
