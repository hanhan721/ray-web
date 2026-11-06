<script setup lang="ts">
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
import { Button } from '@/components/ui/button'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
  <section class="flex flex-col gap-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-medium">用户管理</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          按账号或昵称查找。列表按编号倒序，翻页后重新选择。
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" @click="setColumnDialog(true)">列</Button>
        <Button v-if="can('user:add')" type="button" @click="openCreate">新增用户</Button>
      </div>
    </header>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="search()">
      <Field class="w-40">
        <FieldLabel for="filter-username">账号</FieldLabel>
        <Input id="filter-username" v-model="username" name="username" />
      </Field>
      <Field class="w-40">
        <FieldLabel for="filter-nickname">昵称</FieldLabel>
        <Input id="filter-nickname" v-model="nickname" name="nickname" />
      </Field>
      <Field class="w-32">
        <FieldLabel for="filter-enabled">状态</FieldLabel>
        <select
          id="filter-enabled"
          v-model="enabled"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        >
          <option value="">全部</option>
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
      </Field>
      <Button type="submit" :disabled="loading">查询</Button>
    </form>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-muted-foreground text-sm">
        {{ loading ? '正在加载' : `共 ${total} 人` }}
      </p>
      <Button
        v-if="can('system:user:remove')"
        type="button"
        variant="destructive"
        :disabled="selectedIds.length === 0 || deleting"
        @click="deleteOpen = true"
      >
        删除所选
      </Button>
    </div>

    <p v-if="errorMessage" role="alert" class="text-destructive text-sm">
      {{ errorMessage }}
      <Button type="button" variant="outline" size="sm" class="ml-2" @click="load()">重试</Button>
    </p>

    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id" scope="col">
            <input
              v-if="header.column.id === 'select'"
              type="checkbox"
              aria-label="选择当前页"
              :checked="allPageSelected"
              :disabled="rows.length === 0"
              @change="togglePage(($event.target as HTMLInputElement).checked)"
            />
            <FlexRender v-else :header="header" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty
          v-if="!loading && rows.length === 0"
          :colspan="table.getVisibleLeafColumns().length"
        >
          {{ errorMessage ? '这次没有加载到用户。' : '没有符合条件的用户。' }}
        </TableEmpty>
        <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
            <input
              v-if="cell.column.id === 'select'"
              type="checkbox"
              :aria-label="`选择 ${row.original.username}`"
              :checked="selectedIds.includes(row.original.id)"
              @change="toggleSelected(row.original.id, ($event.target as HTMLInputElement).checked)"
            />
            <Switch
              v-else-if="cell.column.id === 'enabled' && can('system:user:status')"
              :model-value="row.original.enabled !== false"
              :disabled="statusPendingId === row.original.id"
              :aria-label="`${row.original.username} 的状态`"
              @update:model-value="changeStatus(row.original, Boolean($event))"
            />
            <span v-else-if="cell.column.id === 'enabled'">
              {{ row.original.enabled === false ? '停用' : '启用' }}
            </span>
            <span v-else-if="cell.column.id === 'gender'">{{
              genderText(row.original.gender)
            }}</span>
            <div v-else-if="cell.column.id === 'actions'" class="flex flex-wrap gap-1">
              <Button
                v-if="can('system:user:query')"
                type="button"
                variant="outline"
                size="sm"
                @click="openEdit(row.original)"
              >
                编辑
              </Button>
              <Button
                v-if="can('system:user:password')"
                type="button"
                variant="outline"
                size="sm"
                @click="openPassword(row.original)"
              >
                密码
              </Button>
            </div>
            <span v-else class="block max-w-56 truncate" :title="String(cell.getValue() ?? '')">
              <FlexRender :cell="cell" />
            </span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <Field orientation="horizontal" class="w-auto">
        <FieldLabel for="page-size">每页</FieldLabel>
        <select
          id="page-size"
          class="border-input bg-input/20 h-7 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          :value="pageSize"
          @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="size in USER_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
      </Field>
      <div class="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex <= 0 || loading"
          @click="changePage(pageIndex - 1)"
        >
          上一页
        </Button>
        <span class="text-sm">{{ pageIndex + 1 }} / {{ pageCount }}</span>
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex + 1 >= pageCount || loading"
          @click="changePage(pageIndex + 1)"
        >
          下一页
        </Button>
      </div>
    </div>

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
        <FieldGroup>
          <Field v-for="column in USER_DATA_COLUMNS" :key="column.key" orientation="horizontal">
            <input
              :id="`column-${column.key}`"
              type="checkbox"
              :checked="columnVisibility[column.key] !== false"
              @change="setColumnVisible(column.key, ($event.target as HTMLInputElement).checked)"
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
