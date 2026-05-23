<template>
  <NDrawer v-model:show="visible" :width="800" placement="right">
    <NDrawerContent :title="`字典数据 - ${dictType?.dictName || ''}`" closable>
      <div class="dict-data-drawer">
        <!-- 操作栏 -->
        <NSpace class="toolbar" justify="space-between">
          <NSpace>
            <NButton type="primary" size="small" @click="handleAdd">
              <template #icon>
                <NIcon><AddOutline /></NIcon>
              </template>
              新增
            </NButton>
            <ConfirmButton
              size="small"
              :disabled="!selectedIds.length"
              type="error"
              confirm-text="确定要删除选中的字典数据吗？"
              @confirm="handleBatchDelete"
            >
              <template #icon>
                <NIcon><TrashOutline /></NIcon>
              </template>
              批量删除
            </ConfirmButton>
          </NSpace>
          <NButton size="small" @click="fetchData">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            刷新
          </NButton>
        </NSpace>

        <!-- 数据表格 -->
        <NDataTable
          :columns="columns"
          :data="tableData"
          :loading="loading"
          :row-key="(row: DictData) => row.id"
          :checked-row-keys="selectedIds"
          @update:checked-row-keys="handleCheckedChange"
        />
      </div>

      <!-- 字典数据表单弹窗 -->
      <DictDataForm
        v-model:show="formVisible"
        :data="currentRow"
        :dict-type="dictType?.dictType || ''"
        @success="fetchData"
      />
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace, NTag } from 'naive-ui'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import { resolveComponent } from 'vue'
import {
  getDictDataByType,
  deleteDictData,
  type DictData,
} from '@/api/dict-data'
import type { DictType } from '@/api/dict-type'
import DictDataForm from './DictDataForm.vue'

defineOptions({
  name: 'DictDataDrawer',
})

interface Props {
  show: boolean
  dictType: DictType | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const message = useMessage()

// 抽屉可见性
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

// 状态
const loading = ref(false)
const tableData = ref<DictData[]>([])
const selectedIds = ref<number[]>([])

// 表单弹窗
const formVisible = ref(false)
const currentRow = ref<DictData | null>(null)

// listClass 类型映射
const listClassMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  default: 'default',
  primary: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
}

// 表格列定义
const columns: DataTableColumns<DictData> = [
  {
    type: 'selection',
    width: 50,
  },
  {
    title: '字典标签',
    key: 'dictLabel',
    width: 150,
  },
  {
    title: '字典值',
    key: 'dictValue',
    width: 120,
  },
  {
    title: '样式',
    key: 'listClass',
    width: 100,
    render(row) {
      if (!row.listClass) return '-'
      const tagType = listClassMap[row.listClass] || 'default'
      return h(NTag, { type: tagType, size: 'small' }, { default: () => row.listClass })
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
    width: 150,
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
          resolveComponent('ConfirmButton'),
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            confirmText: '确定删除该字典数据吗？',
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
  if (!props.dictType?.dictType) return

  loading.value = true
  try {
    tableData.value = await getDictDataByType(props.dictType.dictType)
  } finally {
    loading.value = false
  }
}

// 监听 dictType 变化
watch(
  () => props.dictType,
  (newVal) => {
    if (newVal) {
      fetchData()
    } else {
      tableData.value = []
    }
  }
)

// 监听抽屉显示
watch(
  () => props.show,
  (newVal) => {
    if (newVal && props.dictType) {
      fetchData()
    }
  }
)

// 选中变化
function handleCheckedChange(keys: DataTableRowKey[]) {
  selectedIds.value = keys as number[]
}

// 新增
function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

// 编辑
function handleEdit(row: DictData) {
  currentRow.value = { ...row }
  formVisible.value = true
}

// 删除
async function handleDelete(row: DictData) {
  try {
    await deleteDictData([row.id])
    message.success('删除成功')
    fetchData()
  } catch {
    message.error('删除失败')
  }
}

// 批量删除
async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  try {
    await deleteDictData(selectedIds.value)
    message.success('批量删除成功')
    selectedIds.value = []
    fetchData()
  } catch {
    message.error('批量删除失败')
  }
}
</script>

<style scoped lang="scss">
.dict-data-drawer {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.toolbar {
  margin-bottom: $spacing-sm;
}
</style>
