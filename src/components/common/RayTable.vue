<script setup lang="ts" generic="T extends RowData, TId extends string | number = number">
import { Columns3 } from '@lucide/vue'
import { computed, getCurrentInstance, useId, useSlots } from 'vue'
import {
  columnOrderingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  FlexRender,
  tableFeatures,
  useTable,
  type RowData,
} from '@tanstack/vue-table'
import type { ColumnSettingItem } from '@/components/common/column-settings'
import RayTableColumnSettings from '@/components/common/RayTableColumnSettings.vue'
import { useColumnConfig } from '@/composables/useColumnConfig'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PAGE_SIZES } from '@/utils/pagination'

const props = withDefaults(
  defineProps<{
    /** 业务数据列；勾选列和操作列由组件自己补。 */
    columns: readonly ColumnSettingItem[]
    rows: T[]
    total: number
    pageIndex: number
    pageSize: number
    loading?: boolean
    errorMessage?: string
    pageSizes?: readonly number[]
    /** 传了才启用列显隐/排序，并读写后端个人配置。 */
    pageKey?: string
    selectable?: boolean
    showActions?: boolean
    /** 撑满视口高度，适合单表整页。 */
    fill?: boolean
    /** 服务端分页；关掉后隐藏页码与每页条数，只保留总数和已选信息。 */
    paginated?: boolean
    /** 无分页时骨架屏占用的行数。 */
    skeletonRows?: number
    rowKey?: (row: T) => TId
    rowLabel?: (row: T) => string
    cellClass?: (columnId: string) => string
    selectedIds?: TId[]
    /** 已选数量后面的单位，例如「人」。 */
    selectionUnit?: string
    emptyTitle?: string
  }>(),
  {
    loading: false,
    errorMessage: '',
    pageSizes: () => [...PAGE_SIZES],
    pageKey: undefined,
    selectable: true,
    showActions: true,
    fill: false,
    paginated: true,
    skeletonRows: 5,
    rowKey: undefined,
    rowLabel: undefined,
    cellClass: undefined,
    selectedIds: () => [],
    selectionUnit: '项',
    emptyTitle: '没有符合条件的数据',
  },
)

const emit = defineEmits<{
  'update:pageIndex': [index: number]
  'update:pageSize': [size: number]
  'toggle-row': [id: TId, checked: boolean]
  'toggle-page': [checked: boolean]
  'row-click': [row: T]
  retry: []
}>()

defineSlots<{
  filters?: () => unknown
  caption?: () => unknown
  actions?: () => unknown
  toolbar?: () => unknown
  empty?: (props: { errorMessage: string }) => unknown
  [cell: `cell-${string}`]: (props: { row: T; cell: unknown }) => unknown
}>()

const pageSizeId = useId()
const slots = useSlots()
const instance = getCurrentInstance()

function rowClickable() {
  return Boolean(instance?.vnode.props?.onRowClick)
}

function onRowClick(row: T, event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('button, a, input, select, textarea, label, [role="button"], [role="checkbox"], [role="switch"], [contenteditable]:not([contenteditable="false"])')) return
  if (window.getSelection()?.toString()) return
  emit('row-click', row)
}

const {
  order,
  visibility,
  dialogOpen,
  saving: columnSaving,
  error: columnError,
  setDialogOpen,
  save: saveColumns,
  reset: resetColumns,
} = useColumnConfig(
  () => props.columns,
  () => props.pageKey,
)

const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
})
const helper = createColumnHelper<typeof features, T>()
const tableColumns = computed(() => [
  ...(props.selectable ? [helper.display({ id: 'select', header: '选择' })] : []),
  ...props.columns.map((column) =>
    helper.accessor((row: T): unknown => (row as unknown as Record<string, unknown>)[column.key], {
      id: column.key,
      header: column.label,
    }),
  ),
  ...(props.showActions ? [helper.display({ id: 'actions', header: '操作' })] : []),
])

/** TanStack 只解包 options 里的 ref，props 需要通过 computed 桥接。 */
const data = computed(() => props.rows)
const tableState = computed(() => ({
  columnVisibility: {
    ...visibility.value,
    ...(props.selectable ? { select: true } : {}),
    ...(props.showActions ? { actions: true } : {}),
  },
  columnOrder: [
    ...(props.selectable ? ['select'] : []),
    ...order.value,
    ...(props.showActions ? ['actions'] : []),
  ],
}))

const table = useTable({
  features,
  columns: tableColumns,
  data,
  getRowId: (row: T) => String(rowKeyOf(row)),
  state: tableState,
})

const pageCount = computed(() =>
  props.pageSize > 0 ? Math.max(1, Math.ceil(props.total / props.pageSize)) : 1,
)
const skeletonRowCount = computed(() => (props.paginated ? props.pageSize : props.skeletonRows))
const allPageSelected = computed(
  () =>
    props.selectable &&
    props.rows.length > 0 &&
    props.rows.every((row) => props.selectedIds.includes(rowKeyOf(row))),
)
const showSkeleton = computed(() => props.loading && props.rows.length === 0)
const refreshing = computed(() => props.loading && props.rows.length > 0)

function rowKeyOf(row: T): TId {
  return props.rowKey ? props.rowKey(row) : (row as { id: TId }).id
}

function rowLabelOf(row: T): string {
  return props.rowLabel ? props.rowLabel(row) : String(rowKeyOf(row))
}

function hasCellSlot(columnId: string): boolean {
  return Boolean(slots[`cell-${columnId}`])
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}
</script>

<template>
  <section
    :class="
      fill
        ? 'flex w-full min-w-0 flex-col gap-4 md:min-h-[calc(100svh-12rem)]'
        : 'flex w-full min-w-0 flex-col gap-4'
    "
  >
    <Card v-if="$slots.filters" class="shrink-0">
      <CardContent>
        <slot name="filters" />
      </CardContent>
    </Card>

    <Card :class="fill ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'flex flex-col'">
      <CardHeader
        v-if="$slots.caption || $slots.actions || $slots.toolbar || pageKey"
        class="shrink-0 flex-row items-center justify-between gap-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <slot name="caption" />
          <slot name="actions" />
        </div>
        <CardAction class="flex items-center gap-2">
          <slot name="toolbar" />
          <Button
            v-if="pageKey"
            type="button"
            variant="ghost"
            size="sm"
            aria-label="列设置"
            @click="setDialogOpen(true)"
          >
            <Columns3 data-icon="inline-start" />
            列设置
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <Alert v-if="errorMessage" variant="destructive">
          <AlertDescription class="flex flex-wrap items-center gap-2">
            {{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="emit('retry')">重试</Button>
          </AlertDescription>
        </Alert>

        <div
          :class="
            fill
              ? 'min-h-0 flex-1 overflow-hidden [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:max-h-full [&_[data-slot=table-container]]:min-h-[180px] [&_[data-slot=table-container]]:overflow-y-auto'
              : 'min-w-0'
          "
        >
          <Table>
            <TableHeader
              class="bg-muted sticky top-0 z-10"
            >
              <TableRow
                v-for="headerGroup in table.getHeaderGroups()"
                :key="headerGroup.id"
                class="hover:bg-transparent"
              >
                <TableHead
                  v-for="header in headerGroup.headers"
                  :key="header.id"
                  scope="col"
                  class="text-xs"
                >
                  <Checkbox
                    v-if="header.column.id === 'select'"
                    aria-label="选择当前页"
                    :model-value="allPageSelected"
                    :disabled="rows.length === 0"
                    @update:model-value="emit('toggle-page', Boolean($event))"
                  />
                  <FlexRender v-else :header="header" />
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody
              :aria-busy="loading"
              :class="refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'"
            >
              <template v-if="showSkeleton">
                <TableRow v-for="index in skeletonRowCount" :key="`loading-${index}`">
                  <TableCell
                    v-for="header in table.getVisibleLeafColumns()"
                    :key="`${header.id}-loading-${index}`"
                  >
                    <Skeleton v-if="header.id === 'select'" class="size-4" />
                    <Skeleton v-else-if="header.id === 'actions'" class="h-6 w-20" />
                    <Skeleton v-else-if="header.id === 'enabled'" class="h-5 w-12 rounded-full" />
                    <Skeleton v-else class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>

              <TableEmpty
                v-else-if="rows.length === 0"
                :colspan="table.getVisibleLeafColumns().length"
              >
                <slot name="empty" :error-message="errorMessage">
                  <p class="text-muted-foreground text-sm">
                    {{ errorMessage ? '这次没有加载到数据。' : emptyTitle }}
                  </p>
                </slot>
              </TableEmpty>

              <template v-else>
                <TableRow
                  v-for="row in table.getRowModel().rows"
                  :key="row.id"
                  :class="rowClickable() ? 'cursor-pointer' : undefined"
                  :data-state="
                    selectable && selectedIds.includes(rowKeyOf(row.original))
                      ? 'selected'
                      : undefined
                  "
                  @click="onRowClick(row.original, $event)"
                >
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <Checkbox
                      v-if="cell.column.id === 'select'"
                      :aria-label="`选择 ${rowLabelOf(row.original)}`"
                      :model-value="selectedIds.includes(rowKeyOf(row.original))"
                      @update:model-value="
                        emit('toggle-row', rowKeyOf(row.original), Boolean($event))
                      "
                    />
                    <slot
                      v-else-if="hasCellSlot(cell.column.id)"
                      :name="`cell-${cell.column.id}`"
                      :row="row.original"
                      :cell="cell"
                    />
                    <span
                      v-else
                      :class="cellClass?.(cell.column.id)"
                      :title="String(cell.getValue() ?? '')"
                    >
                      <span v-if="isEmptyValue(cell.getValue())" class="text-muted-foreground"
                        >—</span
                      >
                      <FlexRender v-else :cell="cell" />
                    </span>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter
        class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"
      >
        <p class="flex min-h-5 items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
          <Spinner v-if="refreshing" class="size-3.5" aria-hidden="true" />
          <span aria-live="polite">
            {{
              refreshing
                ? '加载中…'
                : selectedIds.length > 0
                  ? `已选 ${selectedIds.length} ${selectionUnit}`
                  : ''
            }}
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-muted-foreground text-sm tabular-nums" aria-live="polite"
            >共 {{ total }} 条</span
          >
          <template v-if="paginated">
            <Field orientation="horizontal" class="w-auto">
              <FieldLabel :for="pageSizeId" class="font-normal text-muted-foreground"
                >每页</FieldLabel
              >
              <Select
                :model-value="String(pageSize)"
                :disabled="loading"
                @update:model-value="emit('update:pageSize', Number($event))"
              >
                <SelectTrigger :id="pageSizeId" size="sm" class="w-20">
                  <SelectValue>{{ pageSize }}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem v-for="size in pageSizes" :key="size" :value="String(size)">
                      {{ size }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Pagination
              :page="pageIndex + 1"
              :items-per-page="pageSize"
              :total="total"
              :sibling-count="1"
              :disabled="loading"
              :show-edges="pageCount > 7"
              class="mx-0 w-auto justify-end"
              @update:page="emit('update:pageIndex', $event - 1)"
            >
              <PaginationContent v-slot="{ items }" class="gap-1">
                <PaginationPrevious size="sm">
                  <span class="hidden sm:block">上一页</span>
                </PaginationPrevious>
                <template v-for="(item, index) in items" :key="index">
                  <PaginationItem
                    v-if="item.type === 'page'"
                    :value="item.value"
                    :is-active="item.value === pageIndex + 1"
                    size="sm"
                  >
                    {{ item.value }}
                  </PaginationItem>
                  <PaginationEllipsis v-else :index="index" />
                </template>
                <PaginationNext size="sm">
                  <span class="hidden sm:block">下一页</span>
                </PaginationNext>
              </PaginationContent>
            </Pagination>
          </template>
        </div>
      </CardFooter>
    </Card>

    <RayTableColumnSettings
      v-if="pageKey"
      :open="dialogOpen"
      :columns="columns"
      :order="order"
      :visibility="visibility"
      :saving="columnSaving"
      :error="columnError"
      @update:open="setDialogOpen"
      @save="saveColumns"
      @reset="resetColumns"
    />
  </section>
</template>
