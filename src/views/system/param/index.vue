<template>
  <div class="param-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestParamPage"
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
          confirm-text="确定要删除选中的参数吗？"
          @confirm="handleBatchDelete"
        >
          <template #icon>
            <NIcon><TrashOutline /></NIcon>
          </template>
          批量删除
        </ConfirmButton>
      </template>

      <!-- 参数值列：加密参数显示 **** -->
      <!-- 非加密值使用纯文本渲染：NText 会显式设置文字颜色，该颜色会随内容一起出现在省略 tooltip 中，
           导致深色气泡上的文字难以辨认 -->
      <template #cell-paramValue="{ row }">
        <NText v-if="(row as ParamRow).encrypted" type="warning">
          ****
        </NText>
        <template v-else>
          {{ (row as ParamRow).paramValue }}
        </template>
      </template>

      <!-- 参数类型列 -->
      <template #cell-paramType="{ row }">
        <NTag :type="paramTypeTagType((row as ParamRow).paramType)" size="small">
          {{ paramTypeLabel((row as ParamRow).paramType) }}
        </NTag>
      </template>

      <!-- 业务分类列 -->
      <template #cell-bizType="{ row }">
        <DictTag type="biz_type" :value="(row as ParamRow).bizType" />
      </template>

      <!-- 是否加密列 -->
      <template #cell-encrypted="{ row }">
        <NTag :type="(row as ParamRow).encrypted ? 'warning' : 'default'" size="small">
          {{ (row as ParamRow).encrypted ? '加密' : '明文' }}
        </NTag>
      </template>

      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4">
          <NButton text type="primary" @click="handleEdit(row as ParamRow)">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            编辑
          </NButton>
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要删除该参数吗？"
            @confirm="handleDelete(row as ParamRow)"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            删除
          </ConfirmButton>
        </NSpace>
      </template>
    </ProTable>

    <ParamForm
      v-model:show="formVisible"
      :data="currentRow"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace, NTag, NText } from 'naive-ui'
import { AddOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import { getParamPage, deleteParams, type SystemParam } from '@/api/param'
import ParamForm from './components/ParamForm.vue'

defineOptions({
  name: 'ParamPage',
})

type ParamRow = SystemParam & Record<string, unknown>

const message = useMessage()

const tableRef = ref<ProTableExpose | null>(null)
const selectedIds = ref<number[]>([])
const formVisible = ref(false)
const currentRow = ref<SystemParam | null>(null)

async function requestParamPage(params: ProTableRequestParams) {
  const result = await getParamPage(params)
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

const paramTypeLabelMap: Record<string, string> = {
  STRING: '字符串',
  INTEGER: '整数',
  BOOLEAN: '布尔值',
  STRING_LIST: '字符串列表',
}

function paramTypeLabel(type: string): string {
  return paramTypeLabelMap[type] ?? type
}

function paramTypeTagType(type: string): 'info' | 'success' | 'warning' | 'error' | 'default' {
  const map: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
    STRING: 'info',
    INTEGER: 'success',
    BOOLEAN: 'warning',
    STRING_LIST: 'error',
  }
  return map[type] ?? 'default'
}

const columns: ProTableColumn[] = [
  {
    key: 'paramKey',
    title: '参数键',
    minWidth: 180,
    ellipsis: true,
  },
  {
    key: 'paramValue',
    title: '参数值',
    minWidth: 150,
    ellipsis: true,
  },
  {
    key: 'paramType',
    title: '参数类型',
    width: 110,
    align: 'center',
    search: {
      component: 'select',
      props: {
        options: [
          { label: '字符串', value: 'STRING' },
          { label: '整数', value: 'INTEGER' },
          { label: '布尔值', value: 'BOOLEAN' },
          { label: '字符串列表', value: 'STRING_LIST' },
        ],
      },
    },
  },
  {
    key: 'bizType',
    title: '业务分类',
    width: 100,
    align: 'center',
    search: { component: 'dict-select', dictType: 'biz_type' },
  },
  {
    key: 'encrypted',
    title: '加密',
    width: 80,
    align: 'center',
  },
  {
    key: 'description',
    title: '描述',
    minWidth: 160,
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
    width: 140,
    fixed: 'right',
    align: 'center',
  },
]

function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

function handleEdit(row: ParamRow) {
  currentRow.value = { ...row } as SystemParam
  formVisible.value = true
}

async function handleDelete(row: ParamRow) {
  try {
    await deleteParams([row.id])
    message.success('删除成功')
    tableRef.value?.refresh()
  } catch {
    message.error('删除失败')
  }
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) return
  try {
    await deleteParams(selectedIds.value)
    message.success('批量删除成功')
    tableRef.value?.clearSelection()
    tableRef.value?.refresh()
  } catch {
    message.error('批量删除失败')
  }
}

function handleFormSuccess() {
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.param-page {
  padding: $spacing-lg;
}
</style>
