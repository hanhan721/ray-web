<script setup lang="ts">
import { Columns3, RotateCcw, Search, Trash2, UserRoundPlus, UsersRound } from '@lucide/vue'
import { computed, onMounted, shallowRef } from 'vue'
import {
  columnOrderingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  FlexRender,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from '@tanstack/vue-table'
import { getColumnConfig, resetColumnConfig, saveColumnConfig } from '@/api/column-config'
import { deleteUsers, updateUserStatus, type SysUser } from '@/api/user'
import { GenderLabel, PAGE_KEYS, type Gender } from '@/types/enums'
import { RequestError } from '@/utils/request'
import { useSessionStore } from '@/stores/session'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import UserEditor from './UserEditor.vue'
import UserPasswordDialog from './UserPasswordDialog.vue'
import { useUserList } from './use-user-list'
import {
  applyColumnConfig,
  tableColumnOrder,
  toColumnConfig,
  USER_DATA_COLUMNS,
  USER_PAGE_SIZES,
} from './user-table'

const session = useSessionStore()
const {
  rows,
  total,
  pageIndex,
  pageSize,
  username,
  nickname,
  enabled,
  loading,
  errorMessage,
  selectedIds,
  clearSelection,
  load,
  search,
  changePage,
  changePageSize,
  toggleSelected,
  togglePage,
  setRowEnabled,
} = useUserList()
const features = tableFeatures({
  rowPaginationFeature,
  columnVisibilityFeature,
  columnOrderingFeature,
})
const helper = createColumnHelper<typeof features, SysUser>()
const columns = [
  helper.display({ id: 'select', header: '选择' }),
  ...USER_DATA_COLUMNS.map((column) =>
    helper.accessor((row: SysUser): unknown => row[column.key as keyof SysUser], {
      id: column.key,
      header: column.label,
    }),
  ),
  helper.display({ id: 'actions', header: '操作' }),
]
const columnOrder = shallowRef<string[]>(USER_DATA_COLUMNS.map((column) => column.key))
const columnVisibility = shallowRef<Record<string, boolean>>(
  Object.fromEntries(USER_DATA_COLUMNS.map((column) => [column.key, true])),
)
const columnDialogOpen = shallowRef(false)
const columnSaving = shallowRef(false)
const columnError = shallowRef('')
const editorOpen = shallowRef(false)
const editorId = shallowRef<number | null>(null)
const passwordOpen = shallowRef(false)
const passwordUser = shallowRef<SysUser | null>(null)
const quiet = { showErrorMessage: false } as const
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
const statusPendingId = shallowRef<number | null>(null)

const can = (code: string) => session.can(code)
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const allPageSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.id)),
)
const showSkeleton = computed(() => loading.value && rows.value.length === 0)
const refreshing = computed(() => loading.value && rows.value.length > 0)

const table = useTable({
  features,
  columns,
  data: rows,
  getRowId: (row: SysUser) => String(row.id),
  manualPagination: true,
  rowCount: total,
  autoResetPageIndex: false,
  state: computed(() => ({
    pagination: { pageIndex: pageIndex.value, pageSize: pageSize.value },
    columnVisibility: {
      ...columnVisibility.value,
      select: true,
      actions: true,
    },
    columnOrder: tableColumnOrder(columnOrder.value),
  })),
  onPaginationChange: (updater) => {
    const current = { pageIndex: pageIndex.value, pageSize: pageSize.value }
    const next = typeof updater === 'function' ? updater(current) : updater
    if (next.pageSize !== current.pageSize) void changePageSize(next.pageSize)
    else if (next.pageIndex !== current.pageIndex) void changePage(next.pageIndex)
  },
})

function genderText(value: Gender | null | undefined): string {
  if (!value) return ''
  return GenderLabel[value] ?? value
}

const CELL_MIN_WIDTH: Record<string, string> = {
  username: 'min-w-28',
  nickname: 'min-w-28',
  email: 'min-w-48',
  phone: 'min-w-28',
  createTime: 'min-w-40',
}

function cellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  return `block truncate ${minWidth}`
}

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '操作失败，请稍后重试'
}

async function loadColumns() {
  try {
    const saved = await getColumnConfig(PAGE_KEYS.SYS_USER, quiet)
    const applied = applyColumnConfig(saved)
    columnOrder.value = applied.order
    columnVisibility.value = applied.visibility
  } catch {
    const applied = applyColumnConfig(null)
    columnOrder.value = applied.order
    columnVisibility.value = applied.visibility
  }
}

function openCreate() {
  editorId.value = null
  editorOpen.value = true
}

function resetFilters() {
  username.value = ''
  nickname.value = ''
  enabled.value = ''
  return search()
}

function setEnabledFilter(value: unknown) {
  enabled.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function openEdit(row: SysUser) {
  editorId.value = row.id
  editorOpen.value = true
}

function openPassword(row: SysUser) {
  passwordUser.value = row
  passwordOpen.value = true
}

async function changeStatus(row: SysUser, enabled: boolean) {
  statusPendingId.value = row.id
  try {
    await updateUserStatus(row.id, enabled)
    setRowEnabled(row.id, enabled)
  } catch {
    // 请求层已经提示后端原因。开关仍绑定原状态。
  } finally {
    statusPendingId.value = null
  }
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteUsers(selectedIds.value, quiet)
    deleteOpen.value = false
    clearSelection()
    await load()
    if (rows.value.length === 0 && pageIndex.value > 0) {
      await changePage(pageIndex.value - 1)
    }
  } catch (error) {
    deleteError.value = failureMessage(error)
  } finally {
    deleting.value = false
  }
}

function setColumnVisible(key: string, visible: boolean) {
  columnVisibility.value = { ...columnVisibility.value, [key]: visible }
}

function setColumnDialog(open: boolean) {
  if (open) columnError.value = ''
  columnDialogOpen.value = open
}

async function saveColumns() {
  columnSaving.value = true
  columnError.value = ''
  try {
    await saveColumnConfig(
      PAGE_KEYS.SYS_USER,
      toColumnConfig(columnOrder.value, columnVisibility.value),
      quiet,
    )
    columnDialogOpen.value = false
  } catch (error) {
    columnError.value = failureMessage(error)
  } finally {
    columnSaving.value = false
  }
}

async function resetColumns() {
  columnSaving.value = true
  columnError.value = ''
  try {
    await resetColumnConfig(PAGE_KEYS.SYS_USER, quiet)
    const applied = applyColumnConfig(null)
    columnOrder.value = applied.order
    columnVisibility.value = applied.visibility
    columnDialogOpen.value = false
  } catch (error) {
    columnError.value = failureMessage(error)
  } finally {
    columnSaving.value = false
  }
}

onMounted(() => {
  void load()
  void loadColumns()
})
</script>

<template>
  <section class="flex w-full min-w-0 flex-col gap-4 md:h-[calc(100svh-5rem)]">
    <Card class="shrink-0">
      <CardContent class="pt-4">
        <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="search()">
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel for="filter-username" class="w-8 shrink-0 whitespace-nowrap"
              >账号</FieldLabel
            >
            <Input
              id="filter-username"
              v-model="username"
              name="username"
              placeholder="输入账号关键字"
              class="w-44"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel for="filter-nickname" class="w-8 shrink-0 whitespace-nowrap"
              >昵称</FieldLabel
            >
            <Input
              id="filter-nickname"
              v-model="nickname"
              name="nickname"
              placeholder="输入昵称关键字"
              class="w-44"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel for="filter-enabled" class="w-8 shrink-0 whitespace-nowrap"
              >状态</FieldLabel
            >
            <Select
              :model-value="enabled === '' ? 'all' : enabled"
              @update:model-value="setEnabledFilter"
            >
              <SelectTrigger id="filter-enabled" class="w-36">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">启用</SelectItem>
                  <SelectItem value="false">停用</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <div class="flex items-center gap-2">
            <Button type="submit" :disabled="loading">
              <Search data-icon="inline-start" />
              查询
            </Button>
            <Button type="button" variant="ghost" :disabled="loading" @click="resetFilters()">
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader class="shrink-0 flex-row items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <Button v-if="can('user:add')" type="button" @click="openCreate">
            <UserRoundPlus data-icon="inline-start" />
            新增用户
          </Button>
          <Button
            v-if="can('system:user:remove')"
            type="button"
            variant="outline"
            :disabled="selectedIds.length === 0 || deleting"
            @click="deleteOpen = true"
          >
            <Trash2 data-icon="inline-start" />
            删除所选
            <span v-if="selectedIds.length > 0" class="text-muted-foreground">
              {{ selectedIds.length }}
            </span>
          </Button>
        </div>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="列设置"
            @click="setColumnDialog(true)"
          >
            <Columns3 data-icon="inline-start" />
            列
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <Alert v-if="errorMessage" variant="destructive">
          <AlertDescription class="flex flex-wrap items-center gap-2">
            {{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="load()">重试</Button>
          </AlertDescription>
        </Alert>

        <div
          class="min-h-[180px] min-h-0 flex-1 overflow-hidden [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:max-h-full [&_[data-slot=table-container]]:min-h-[180px] [&_[data-slot=table-container]]:overflow-y-auto"
        >
          <Table>
            <TableHeader class="bg-card sticky top-0 z-10">
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id" scope="col">
                  <Checkbox
                    v-if="header.column.id === 'select'"
                    aria-label="选择当前页"
                    :model-value="allPageSelected"
                    :disabled="rows.length === 0"
                    @update:model-value="togglePage(Boolean($event))"
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
                <TableRow v-for="index in pageSize" :key="`loading-${index}`">
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
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersRound />
                    </EmptyMedia>
                    <EmptyTitle>
                      {{ errorMessage ? '这次没有加载到用户' : '没有符合条件的用户' }}
                    </EmptyTitle>
                    <EmptyDescription>
                      {{
                        errorMessage
                          ? '稍后重试，或调整筛选条件后再查询。'
                          : '换个关键字试试，或新增一个用户。'
                      }}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      v-if="can('user:add') && !errorMessage"
                      type="button"
                      variant="outline"
                      size="sm"
                      @click="openCreate"
                    >
                      新增用户
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableEmpty>
              <template v-else>
                <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <Checkbox
                      v-if="cell.column.id === 'select'"
                      :aria-label="`选择 ${row.original.username}`"
                      :model-value="selectedIds.includes(row.original.id)"
                      @update:model-value="toggleSelected(row.original.id, Boolean($event))"
                    />
                    <Switch
                      v-else-if="cell.column.id === 'enabled' && can('system:user:status')"
                      :model-value="row.original.enabled !== false"
                      :disabled="statusPendingId === row.original.id"
                      :aria-label="`${row.original.username} 的状态`"
                      @update:model-value="changeStatus(row.original, Boolean($event))"
                    />
                    <Badge
                      v-else-if="cell.column.id === 'enabled'"
                      :variant="row.original.enabled === false ? 'secondary' : 'default'"
                    >
                      {{ row.original.enabled === false ? '停用' : '启用' }}
                    </Badge>
                    <span v-else-if="cell.column.id === 'gender'">{{
                      genderText(row.original.gender)
                    }}</span>
                    <div v-else-if="cell.column.id === 'actions'" class="flex flex-wrap gap-1">
                      <Button
                        v-if="can('system:user:query')"
                        type="button"
                        variant="ghost"
                        size="sm"
                        @click="openEdit(row.original)"
                      >
                        编辑
                      </Button>
                      <Button
                        v-if="can('system:user:password')"
                        type="button"
                        variant="ghost"
                        size="sm"
                        @click="openPassword(row.original)"
                      >
                        密码
                      </Button>
                    </div>
                    <span
                      v-else
                      :class="cellClass(cell.column.id)"
                      :title="String(cell.getValue() ?? '')"
                    >
                      <FlexRender :cell="cell" />
                    </span>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p class="flex min-h-5 items-center gap-1.5 text-muted-foreground text-sm">
          <Spinner v-if="refreshing" class="size-3.5" aria-hidden="true" />
          <span aria-live="polite">
            {{
              refreshing ? '加载中…' : selectedIds.length > 0 ? `已选 ${selectedIds.length} 人` : ''
            }}
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span class="text-muted-foreground text-sm" aria-live="polite">共 {{ total }} 条</span>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel for="page-size">每页</FieldLabel>
            <Select
              :model-value="String(pageSize)"
              :disabled="loading"
              @update:model-value="changePageSize(Number($event))"
            >
              <SelectTrigger id="page-size" size="sm" class="w-20">
                <SelectValue>{{ pageSize }}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="size in USER_PAGE_SIZES" :key="size" :value="String(size)">
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
            @update:page="changePage($event - 1)"
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
        </div>
      </CardFooter>
    </Card>

    <UserEditor
      :open="editorOpen"
      :user-id="editorId"
      :can-assign-roles="can('system:user:roles') && can('system:role:list')"
      :can-assign-depts="can('system:user:depts') && can('system:dept:list')"
      @update:open="editorOpen = $event"
      @saved="load()"
    />
    <UserPasswordDialog
      :open="passwordOpen"
      :user-id="passwordUser?.id ?? null"
      :username="passwordUser?.username ?? ''"
      @update:open="passwordOpen = $event"
    />

    <AlertDialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除所选用户</AlertDialogTitle>
          <AlertDialogDescription>
            将删除 {{ selectedIds.length }} 个用户。这个操作不能从当前页面撤销。
            <span v-if="deleteError" class="text-destructive mt-2 block">{{ deleteError }}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Spinner v-if="deleting" />
            删除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="columnDialogOpen" @update:open="setColumnDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>显示列</DialogTitle>
          <DialogDescription>隐藏的列也会保存。恢复默认会删除这份个人配置。</DialogDescription>
        </DialogHeader>
        <FieldGroup class="gap-1">
          <Field v-for="column in USER_DATA_COLUMNS" :key="column.key" orientation="horizontal">
            <Checkbox
              :id="`column-${column.key}`"
              :model-value="columnVisibility[column.key] !== false"
              @update:model-value="setColumnVisible(column.key, Boolean($event))"
            />
            <FieldLabel :for="`column-${column.key}`">{{ column.label }}</FieldLabel>
          </Field>
        </FieldGroup>
        <p v-if="columnError" role="alert" class="text-destructive text-sm">{{ columnError }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="columnSaving" @click="resetColumns"
            >恢复默认</Button
          >
          <Button type="button" :disabled="columnSaving" @click="saveColumns">
            <Spinner v-if="columnSaving" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
