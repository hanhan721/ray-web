<!--
  上查下表组件 (ProTable)

  功能：
  - 统一 columns 配置
  - 集成 SearchForm
  - 自动分页
  - loading 状态管理
  - 工具栏（刷新、列设置）
  - 支持插槽扩展
  - 暴露 refresh 方法

  使用示例：
  <ProTable
    :columns="columns"
    :request="getUserPage"
  >
    <template #toolbar>
      <n-button type="primary" @click="handleAdd">新增</n-button>
    </template>
    <template #action="{ row }">
      <n-button text @click="handleEdit(row)">编辑</n-button>
    </template>
  </ProTable>
-->
<template>
  <div class="pro-table">
    <!-- 搜索表单 -->
    <NCard v-if="searchSchema.length > 0" class="pro-table__search">
      <SearchForm
        ref="searchFormRef"
        :schema="searchSchema"
        :model="searchModel"
        @search="handleSearch"
        @reset="handleReset"
      />
    </NCard>

    <!-- 表格区域 -->
    <NCard class="pro-table__content">
      <!-- 工具栏 -->
      <div v-if="showToolbar" class="pro-table__toolbar">
        <div class="pro-table__toolbar-left">
          <slot name="toolbar"></slot>
          <NTag v-if="showSelection && checkedRowKeys.length > 0" type="info" closable @close="clearSelection">
            已选 {{ checkedRowKeys.length }} 项
          </NTag>
        </div>
        <div class="pro-table__toolbar-right">
          <NSpace>
            <NTooltip>
              <template #trigger>
                <NButton quaternary circle @click="refresh">
                  <template #icon>
                    <NIcon><RefreshOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              刷新
            </NTooltip>
            <!-- 列设置按钮：仅当 pageKey 存在时显示 -->
            <NTooltip v-if="pageKey">
              <template #trigger>
                <NButton quaternary circle @click="drawerVisible = true">
                  <template #icon>
                    <NIcon><SettingsOutline /></NIcon>
                  </template>
                </NButton>
              </template>
              列设置
            </NTooltip>
          </NSpace>
        </div>
      </div>

      <!-- 数据表格 -->
      <div>
        <NDataTable
          v-model:checked-row-keys="checkedRowKeys"
          :columns="tableColumns"
          :data="data"
          :loading="loading"
          :row-key="rowKeyFn"
          :bordered="bordered"
          :pagination="false"
          :scroll-x="scrollX"
          :on-unstable-column-resize="handleColumnResize"
          @update:sorter="handleSorterChange"
          @update:checked-row-keys="handleCheckedRowKeysChange"
        />
      </div>

      <!-- 分页 -->
      <div class="pro-table__pagination">
        <NPagination
          v-model:page="pageNum"
          v-model:page-size="pageSize"
          :item-count="total"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker
          show-quick-jumper
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix="{ itemCount }">
            共 {{ itemCount }} 条
          </template>
        </NPagination>
      </div>
    </NCard>

    <!-- 列设置抽屉 -->
    <ColumnSettingDrawer
      v-if="pageKey"
      v-model:show="drawerVisible"
      :items="configItems"
      :column-defs="permittedColumns"
      @change="updateConfigItems"
      @reset="handleColumnReset"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import { h, type VNode, resolveComponent } from 'vue'
import type { DataTableColumn, DataTableSortState } from 'naive-ui'
import { RefreshOutline, SettingsOutline } from '@vicons/ionicons5'
import type { ProTableColumn, ProTableRequest, ProTableExpose } from './types'
import type { SearchFormItem } from '../SearchForm.vue'
import { usePermissionStore } from '@/stores/permission'
import { useProTable } from './useProTable'
import { useColumnConfig } from './useColumnConfig'
import ColumnSettingDrawer from '@/components/common/ColumnSettingDrawer/index.vue'

defineOptions({
  name: 'ProTable',
})

const props = withDefaults(
  defineProps<{
    /** 列配置 */
    columns: ProTableColumn<T>[]
    /** 数据请求函数 */
    request: ProTableRequest<T>
    /** 行键 */
    rowKey?: string | ((row: T) => string | number)
    /** 是否显示边框 */
    bordered?: boolean
    /** 是否显示序号列 */
    showIndex?: boolean
    /** 是否显示复选框列 */
    showSelection?: boolean
    /** 是否显示工具栏 */
    showToolbar?: boolean
    /** 默认每页条数 */
    defaultPageSize?: number
    /** 是否立即加载 */
    immediate?: boolean
    /** 启用列配置持久化，传入 pageKey 即开启；不传则行为与现在完全相同 */
    pageKey?: string
  }>(),
  {
    rowKey: 'id',
    bordered: false,
    showIndex: false,
    showSelection: false,
    showToolbar: true,
    defaultPageSize: 10,
    immediate: true,
  }
)

const emit = defineEmits<{
  (e: 'selectionChange', keys: Array<string | number>, rows: T[]): void
}>()

const slots = defineSlots<{
  toolbar?: () => unknown
  [key: `cell-${string}`]: (props: { row: T; index: number }) => unknown
}>()

// ====== 权限过滤 ======
const permissionStore = usePermissionStore()

/** 过滤掉无权限的列 */
const permittedColumns = computed(() =>
  props.columns.filter((col) => {
    if (!col.permission) return true
    return Array.isArray(col.permission)
      ? permissionStore.hasAnyPermission(col.permission)
      : permissionStore.hasPermission(col.permission)
  })
)

// ====== 列配置逻辑 ======
const drawerVisible = ref(false)

// 当存在 pageKey 时，列配置加载完成前延迟数据请求，避免列闪烁
const {
  mergedColumns: columnConfigColumns,
  configItems,
  loading: columnConfigLoading,
  updateConfigItems,
  handleReset: handleColumnReset,
  updateWidth,
} = props.pageKey
  ? useColumnConfig(permittedColumns.value, props.pageKey)
  : {
      mergedColumns: permittedColumns,
      configItems: ref<ColumnConfigItem[]>([]),
      loading: ref(false),
      updateConfigItems: (_items: ColumnConfigItem[]) => {},
      handleReset: async () => {},
      updateWidth: (_key: string, _width: number) => {},
    }

// ====== 分页 + 数据加载 ======
const {
  loading,
  data,
  total,
  pageNum,
  pageSize,
  refresh,
  reset,
  search,
  handlePageChange,
  handlePageSizeChange,
  handleSorterChange: onSorterChange,
} = useProTable<T>(props.request, {
  defaultPageSize: props.defaultPageSize,
  immediate: false, // 由我们控制首次加载时机
})

// 列配置就绪后才触发数据首次加载
watch(
  columnConfigLoading,
  (isLoading) => {
    if (!isLoading && props.immediate) {
      refresh()
    }
  },
  { immediate: true }
)

const searchFormRef = ref()

// ====== 复选框选中状态 ======
const checkedRowKeys = ref<Array<string | number>>([])

function handleCheckedRowKeysChange(keys: Array<string | number>, rows: T[]) {
  checkedRowKeys.value = keys
  emit('selectionChange', keys, rows)
}

// ====== 列宽拖拽回调 ======
function handleColumnResize(
  _resizedWidth: number,
  limitedWidth: number,
  column: { key?: string | number },
  _getColumnWidth: (key: string | number) => number | undefined
) {
  if (props.pageKey && column.key) {
    updateWidth(String(column.key), Math.round(limitedWidth))
  }
}

// 行键函数
const rowKeyFn = computed(() => {
  if (typeof props.rowKey === 'function') {
    return props.rowKey
  }
  return (row: T) => row[props.rowKey as string] as string | number
})

// 从 columns 提取搜索配置
const searchSchema = computed<SearchFormItem[]>(() => {
  return permittedColumns.value
    .filter((col) => col.search)
    .map((col) => {
      const searchConfig = typeof col.search === 'object' ? col.search : {}
      return {
        field: col.key,
        label: col.title,
        component: 'input' as const,
        ...searchConfig,
      }
    })
})

// 搜索表单数据
const searchModel = reactive<Record<string, unknown>>({})

// 初始化搜索表单默认值
watchEffect(() => {
  searchSchema.value.forEach((item) => {
    if (!(item.field in searchModel)) {
      searchModel[item.field] = item.defaultValue ?? null
    }
  })
})

// 转换为 NDataTable 的列配置
const tableColumns = computed<DataTableColumn<T>[]>(() => {
  const columns: DataTableColumn<T>[] = []

  // 复选框列
  if (props.showSelection) {
    columns.push({
      type: 'selection',
      fixed: 'left',
      width: 50,
    } as DataTableColumn<T>)
  }

  // 序号列
  if (props.showIndex) {
    columns.push({
      key: '_index',
      title: '序号',
      width: 60,
      align: 'center',
      render: (_row, index) => (pageNum.value - 1) * pageSize.value + index + 1,
    })
  }

  // 数据列
  columnConfigColumns.value
    .filter((col) => !col.hideInTable)
    .forEach((col) => {
      const column: DataTableColumn<T> = {
        key: col.key,
        title: col.title,
        width: col.width,
        minWidth: col.minWidth,
        fixed: col.fixed,
        align: col.align,
        ellipsis: col.ellipsis !== false ? { tooltip: true } : undefined,
        sorter: col.sorter,
        // 非锁定列启用拖拽调宽
        ...(!col.configLocked && props.pageKey
          ? {
              resizable: true,
            }
          : {}),
      }

      // 自定义渲染
      if (col.render) {
        column.render = col.render
      } else if (col.dictType) {
        // 字典渲染
        column.render = (row) => h(resolveComponent('DictTag'), {
          type: col.dictType,
          value: row[col.key],
        })
      } else if (slots[`cell-${col.key}`]) {
        // 插槽渲染
        column.render = (row, index) => slots[`cell-${col.key}`]!({ row, index }) as VNode
      }

      columns.push(column)
    })

  return columns
})

// 计算表格横向滚动宽度
const scrollX = computed(() => {
  return tableColumns.value.reduce((sum, col) => {
    const width = typeof col.width === 'number' ? col.width : 0
    const minWidth = typeof col.minWidth === 'number' ? col.minWidth : 0
    return sum + (width || minWidth || 100)
  }, 0)
})

// 清空选中
function clearSelection() {
  checkedRowKeys.value = []
}

// 搜索
function handleSearch() {
  // 过滤掉空值
  const params: Record<string, unknown> = {}
  Object.entries(searchModel).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params[key] = value
    }
  })
  search(params)
}

// 重置
function handleReset() {
  reset()
}

// 排序变化
function handleSorterChange(sorter: DataTableSortState | DataTableSortState[] | null) {
  if (Array.isArray(sorter)) {
    // 暂不支持多列排序
    return
  }
  onSorterChange(sorter as { columnKey: string; order: 'ascend' | 'descend' | false } | null)
}

// 暴露方法
defineExpose<ProTableExpose>({
  refresh,
  reset,
  getSelectedRows: () => {
    const keyFn = rowKeyFn.value
    return data.value.filter((row) => checkedRowKeys.value.includes(keyFn(row)))
  },
  getCheckedKeys: () => [...checkedRowKeys.value],
  clearSelection,
  getSearchParams: () => ({ ...searchModel }),
})
</script>

<style scoped lang="scss">
.pro-table {
  &__search {
    margin-bottom: 16px;
  }

  &__toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    &-left {
      display: flex;
      gap: 8px;
    }
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
