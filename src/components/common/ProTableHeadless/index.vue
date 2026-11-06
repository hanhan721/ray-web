<script setup lang="ts" generic="TData extends { id: number }">
import { computed } from 'vue'
import {
  FlexRender,
  useTable,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/vue-table'
import { ChevronBackOutline, ChevronForwardOutline, SwapVerticalOutline, OptionsOutline } from '@vicons/ionicons5'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { proTableFeatures, type HeadlessColumn } from './features'

defineOptions({ name: 'ProTableHeadless' })

const props = defineProps<{
  columns: HeadlessColumn<TData>[]
  data: TData[]
  total: number
  loading: boolean
  error?: string
}>()

const pagination = defineModel<PaginationState>('pagination', { required: true })
const sorting = defineModel<SortingState>('sorting', { required: true })
const selection = defineModel<RowSelectionState>('selection', { default: () => ({}) })
const emit = defineEmits<{ retry: [] }>()

const table = useTable<typeof proTableFeatures, TData>({
  features: proTableFeatures,
  columns: computed(() => props.columns),
  data: computed(() => props.data),
  rowCount: computed(() => props.total),
  getRowId: (row) => String(row.id),
  manualPagination: true,
  manualSorting: true,
  enableMultiSort: false,
  autoResetPageIndex: false,
  state: computed(() => ({ pagination: pagination.value, sorting: sorting.value, rowSelection: selection.value })),
  onPaginationChange: (updater) => {
    const next = typeof updater === 'function' ? updater(pagination.value) : updater
    pagination.value = next.pageSize !== pagination.value.pageSize ? { ...next, pageIndex: 0 } : next
    selection.value = {}
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    pagination.value = { ...pagination.value, pageIndex: 0 }
    selection.value = {}
  },
  onRowSelectionChange: (updater) => {
    selection.value = typeof updater === 'function' ? updater(selection.value) : updater
  },
})

const selectedCount = computed(() => Object.keys(selection.value).length)
</script>

<template>
  <section class="tw:min-w-0" aria-label="用户数据表格" :aria-busy="loading">
    <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:px-5 tw:py-4">
      <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <h2 class="tw:text-base tw:font-semibold">用户列表</h2>
        <span class="tw:rounded-md tw:bg-muted tw:px-2 tw:py-0.5 tw:text-xs tw:tabular-nums tw:text-muted-foreground">
          {{ total }} 位用户
        </span>
        <span v-if="loading" role="status" class="tw:text-xs tw:text-muted-foreground">正在加载…</span>
      </div>
      <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <slot name="toolbar" :selected-count="selectedCount"></slot>
        <details class="tw:relative">
          <summary
            class="tw:flex tw:h-9 tw:cursor-pointer tw:list-none tw:items-center tw:gap-2 tw:rounded-md tw:border tw:bg-card tw:px-3 tw:text-sm"
          >
            <OptionsOutline class="tw:size-4" aria-hidden="true" />
            显示列
          </summary>
          <div
            class="tw:absolute tw:right-0 tw:z-20 tw:mt-2 tw:grid tw:min-w-40 tw:gap-1 tw:rounded-lg tw:border tw:bg-card tw:p-2 tw:shadow-lg"
          >
            <label
              v-for="column in table.getAllLeafColumns().filter((item) => item.getCanHide())"
              :key="column.id"
              class="tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:px-2 tw:py-2 tw:text-sm tw:hover:bg-muted"
            >
              <Checkbox
                :model-value="column.getIsVisible()"
                @update:model-value="column.toggleVisibility($event === true)"
              />
              {{ column.columnDef.header }}
            </label>
          </div>
        </details>
      </div>
    </div>
    <div class="tw:overflow-x-auto tw:border-y">
      <table class="tw:w-full tw:min-w-[980px] tw:border-collapse tw:text-left tw:text-sm" aria-label="用户列表">
        <thead class="tw:bg-muted/60 tw:text-xs tw:text-muted-foreground">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th scope="col" class="tw:w-12 tw:px-5 tw:py-3">
              <Checkbox
                :model-value="
                  table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false
                "
                :disabled="loading || !data.length"
                aria-label="选择本页全部用户"
                @update:model-value="table.toggleAllPageRowsSelected($event === true)"
              />
            </th>
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              scope="col"
              class="tw:whitespace-nowrap tw:px-4 tw:py-3 tw:font-medium"
              :aria-sort="
                header.column.getCanSort()
                  ? header.column.getIsSorted() === 'asc'
                    ? 'ascending'
                    : header.column.getIsSorted() === 'desc'
                      ? 'descending'
                      : 'none'
                  : undefined
              "
            >
              <button
                v-if="header.column.getCanSort()"
                type="button"
                class="tw:flex tw:items-center tw:gap-2"
                :disabled="loading"
                @click="header.column.toggleSorting()"
              >
                <FlexRender :header="header" />
                <SwapVerticalOutline class="tw:size-3.5" aria-hidden="true" />
                <span v-if="header.column.getIsSorted()" class="tw:text-primary">
                  {{ header.column.getIsSorted() === 'asc' ? '↑' : '↓' }}
                </span>
              </button>
              <FlexRender v-else :header="header" />
            </th>
          </tr>
        </thead>
        <tbody :class="loading ? 'tw:pointer-events-none tw:opacity-50' : ''">
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="tw:border-t tw:transition-colors tw:hover:bg-muted/40"
            :class="row.getIsSelected() ? 'tw:bg-primary/5' : ''"
          >
            <td class="tw:px-5 tw:py-4">
              <Checkbox
                :model-value="row.getIsSelected()"
                :disabled="loading"
                :aria-label="`选择用户 ${row.original.id}`"
                @update:model-value="row.toggleSelected($event === true)"
              />
            </td>
            <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="tw:px-4 tw:py-4">
              <slot :name="`cell-${cell.column.id}`" :row="row.original">
                <FlexRender :cell="cell" />
              </slot>
            </td>
          </tr>
          <tr v-if="!data.length">
            <td :colspan="table.getVisibleLeafColumns().length + 1" class="tw:px-6 tw:py-16 tw:text-center">
              <p :role="error ? 'alert' : 'status'" class="tw:text-muted-foreground">
                {{ loading ? '正在加载用户…' : error || '没有找到符合条件的用户' }}
              </p>
              <Button v-if="error" type="button" variant="outline" class="tw:mt-4" @click="emit('retry')">
                重新加载
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:px-5 tw:py-4 tw:text-sm">
      <p class="tw:text-muted-foreground" aria-live="polite">
        已选 {{ selectedCount }} 项
        <span class="tw:ml-2 tw:text-xs">仅选择当前页，翻页后清空</span>
      </p>
      <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
        <Select
          :model-value="String(pagination.pageSize)"
          :disabled="loading"
          @update:model-value="table.setPageSize(Number($event))"
        >
          <SelectTrigger class="tw:w-28" aria-label="每页条数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent class="headless-ui">
            <SelectItem v-for="size in [10, 20, 50]" :key="size" :value="String(size)">{{ size }} 条 / 页</SelectItem>
          </SelectContent>
        </Select>
        <span class="tw:whitespace-nowrap tw:tabular-nums tw:text-muted-foreground">
          {{ pagination.pageIndex + 1 }} / {{ Math.max(1, table.getPageCount()) }} 页
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          :disabled="loading || !table.getCanPreviousPage()"
          aria-label="上一页"
          @click="table.previousPage()"
        >
          <ChevronBackOutline class="tw:size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          :disabled="loading || !table.getCanNextPage()"
          aria-label="下一页"
          @click="table.nextPage()"
        >
          <ChevronForwardOutline class="tw:size-4" />
        </Button>
      </div>
    </div>
  </section>
</template>
