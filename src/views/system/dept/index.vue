<template>
  <div class="dept-page">
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
        <NButton @click="fetchData">
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
        :row-key="(row: DeptTree) => row.id"
        :expanded-row-keys="expandedRowKeys"
        @update:expanded-row-keys="handleExpandedRowKeysChange"
      />
    </NCard>

    <!-- 表单弹窗 -->
    <DeptForm
      v-model:show="formVisible"
      :data="currentRow"
      :tree-data="tableData"
      @success="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { resolveComponent } from 'vue'
import { NTag, NButton, NIcon, NSpace } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  RefreshOutline,
  ChevronDownOutline,
} from '@vicons/ionicons5'
import { getDeptTree, deleteDept, type DeptTree } from '@/api/dept'
import DeptForm from './components/DeptForm.vue'

defineOptions({
  name: 'DeptPage',
})

const message = useMessage()

// 状态
const loading = ref(false)
const tableData = ref<DeptTree[]>([])
const formVisible = ref(false)
const currentRow = ref<DeptTree | null>(null)
const expandedRowKeys = ref<number[]>([])
const isExpanded = ref(false)

// 表格列定义
const columns: DataTableColumns<DeptTree> = [
  {
    title: '部门名称',
    key: 'deptName',
    width: 200,
    ellipsis: { tooltip: true },
  },
  {
    title: '负责人',
    key: 'leader',
    width: 120,
    render(row) {
      return row.leader || '-'
    },
  },
  {
    title: '联系电话',
    key: 'phone',
    width: 150,
    render(row) {
      return row.phone || '-'
    },
  },
  {
    title: '邮箱',
    key: 'email',
    width: 200,
    ellipsis: { tooltip: true },
    render(row) {
      return row.email || '-'
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
    title: '创建时间',
    key: 'createTime',
    width: 180,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render(row) {
      return h(NSpace, { size: 'small' }, () => [
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
            default: () => '新增子部门',
            icon: () => h(NIcon, null, { default: () => h(AddOutline) }),
          }
        ),
        h(
          resolveComponent('ConfirmButton'),
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            confirmText: '确定删除该部门吗？',
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

// 获取数据
async function fetchData() {
  loading.value = true
  try {
    tableData.value = await getDeptTree()
  } catch {
    message.error('获取部门列表失败')
  } finally {
    loading.value = false
  }
}

// 获取所有节点 ID（用于展开/收起）
function getAllRowKeys(data: DeptTree[]): number[] {
  const keys: number[] = []
  function traverse(nodes: DeptTree[]) {
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

// 新增子部门
function handleAddChild(row: DeptTree) {
  currentRow.value = { parentId: row.id } as DeptTree
  formVisible.value = true
}

// 编辑
function handleEdit(row: DeptTree) {
  currentRow.value = { ...row }
  formVisible.value = true
}

// 删除
async function handleDelete(row: DeptTree) {
  try {
    await deleteDept(row.id)
    message.success('删除成功')
    fetchData()
  } catch {
    message.error('删除失败')
  }
}

// 初始化
onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.dept-page {
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
