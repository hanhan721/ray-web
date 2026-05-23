<template>
  <div class="dict-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestDictType"
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
          confirm-text="确定要删除选中的字典类型吗？"
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
        <NTag :type="(row as DictTypeRow).enabled ? 'success' : 'error'" size="small">
          {{ (row as DictTypeRow).enabled ? '启用' : '禁用' }}
        </NTag>
      </template>

      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4">
          <NButton text type="info" @click="handleViewData(row as DictTypeRow)">
            <template #icon>
              <NIcon><ListOutline /></NIcon>
            </template>
            字典数据
          </NButton>
          <NButton text type="primary" @click="handleEdit(row as DictTypeRow)">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            编辑
          </NButton>
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要删除该字典类型吗？"
            @confirm="handleDelete(row as DictTypeRow)"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            删除
          </ConfirmButton>
        </NSpace>
      </template>
    </ProTable>

    <!-- 字典类型表单弹窗 -->
    <DictTypeForm
      v-model:show="formVisible"
      :data="currentRow"
      @success="handleFormSuccess"
    />

    <!-- 字典数据抽屉 -->
    <DictDataDrawer
      v-model:show="drawerVisible"
      :dict-type="currentDictType"
    />
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace, NTag } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  ListOutline,
} from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import {
  getDictTypePage,
  deleteDictTypes,
  type DictType,
} from '@/api/dict-type'
import DictTypeForm from './components/DictTypeForm.vue'
import DictDataDrawer from './components/DictDataDrawer.vue'

defineOptions({
  name: 'DictPage',
})

// 为了 ProTable 兼容定义带索引签名的类型
type DictTypeRow = DictType & Record<string, unknown>

const message = useMessage()

// 表格引用
const tableRef = ref<ProTableExpose | null>(null)

// 选中的 ID
const selectedIds = ref<number[]>([])

// 字典类型表单弹窗
const formVisible = ref(false)
const currentRow = ref<DictType | null>(null)

// 字典数据抽屉
const drawerVisible = ref(false)
const currentDictType = ref<DictType | null>(null)

// 封装请求函数以适配 ProTable
async function requestDictType(params: ProTableRequestParams) {
  const result = await getDictTypePage(params)
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

// 表格列配置
const columns: ProTableColumn[] = [
  {
    key: 'dictName',
    title: '字典名称',
    width: 150,
    search: { component: 'input' },
  },
  {
    key: 'dictType',
    title: '字典编码',
    width: 180,
    search: { component: 'input' },
  },
  {
    key: 'enabled',
    title: '状态',
    width: 80,
    align: 'center',
  },
  {
    key: 'remark',
    title: '备注',
    minWidth: 200,
    ellipsis: true,
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
  },
]

// 新增
function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row: DictTypeRow) {
  currentRow.value = { ...row } as DictType
  formVisible.value = true
}

// 查看字典数据
function handleViewData(row: DictTypeRow) {
  currentDictType.value = row as DictType
  drawerVisible.value = true
}

// 删除
async function handleDelete(row: DictTypeRow) {
  try {
    await deleteDictTypes([row.id])
    message.success('删除成功')
    tableRef.value?.refresh()
  } catch {
    message.error('删除失败')
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  try {
    await deleteDictTypes(selectedIds.value)
    message.success('批量删除成功')
    tableRef.value?.clearSelection()
    tableRef.value?.refresh()
  } catch {
    message.error('批量删除失败')
  }
}

// 表单成功回调
function handleFormSuccess() {
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.dict-page {
  padding: $spacing-lg;
}
</style>
