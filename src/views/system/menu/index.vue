<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { deletePermissions, getPermissionTree, updatePermission } from '@/api/permission'
import { PermissionTypeLabel, type PermissionType } from '@/types/enums'
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
import { Field, FieldLabel } from '@/components/ui/field'
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
import MenuEditor from './MenuEditor.vue'
import { filterMenuRows, flattenMenus, toMenuWrite, type MenuRow } from './menu-tree'

const session = useSessionStore()
const rows = shallowRef<MenuRow[]>([])
const name = shallowRef('')
const typeFilter = shallowRef<PermissionType | ''>('')
const loading = shallowRef(false)
const errorMessage = shallowRef('')
const selectedIds = shallowRef<number[]>([])
const editorOpen = shallowRef(false)
const editorMenu = shallowRef<MenuRow | null>(null)
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
const statusPendingId = shallowRef<number | null>(null)
let generation = 0

const visibleRows = computed(() => filterMenuRows(rows.value, name.value, typeFilter.value))
const allVisibleSelected = computed(
  () =>
    visibleRows.value.length > 0 &&
    visibleRows.value.every((row) => selectedIds.value.includes(row.id)),
)
const can = (code: string) => session.can(code)

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '菜单加载失败'
}

async function load() {
  const requestId = ++generation
  loading.value = true
  errorMessage.value = ''
  try {
    const tree = await getPermissionTree({ showErrorMessage: false }, { reload: true })
    if (requestId !== generation) return
    rows.value = flattenMenus(tree ?? [])
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.id === id))
  } catch (error) {
    if (requestId !== generation) return
    rows.value = []
    errorMessage.value = failureMessage(error)
  } finally {
    if (requestId === generation) loading.value = false
  }
}

function search() {
  selectedIds.value = []
}

watch([name, typeFilter], () => {
  selectedIds.value = []
})

function toggleSelected(id: number, checked: boolean) {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = [...next]
}

function toggleVisible(checked: boolean) {
  selectedIds.value = checked ? visibleRows.value.map((row) => row.id) : []
}

function openCreate() {
  editorMenu.value = null
  editorOpen.value = true
}

function openEdit(row: MenuRow) {
  editorMenu.value = row
  editorOpen.value = true
}

function openDelete() {
  deleteError.value = ''
  deleteOpen.value = true
}

async function changeStatus(row: MenuRow, enabled: boolean) {
  statusPendingId.value = row.id
  try {
    await updatePermission(toMenuWrite(row, enabled))
    await load()
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
    await deletePermissions(selectedIds.value, { showErrorMessage: false })
    deleteOpen.value = false
    selectedIds.value = []
    await load()
  } catch (error) {
    deleteError.value =
      error instanceof RequestError && error.message ? error.message : '删除失败，请稍后重试'
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-lg font-medium">菜单管理</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          按名称和类型在已加载的权限树里查找。删除上级前要先处理下级。编辑按钮，或更改启用状态、权限标识后，需要重新登录。
        </p>
      </div>
      <Button v-if="can('system:permission:add')" type="button" @click="openCreate">
        新增菜单
      </Button>
    </header>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="search()">
      <Field class="w-48">
        <FieldLabel for="filter-menu-name">名称</FieldLabel>
        <Input id="filter-menu-name" v-model="name" name="name" />
      </Field>
      <Field class="w-36">
        <FieldLabel for="filter-menu-type">类型</FieldLabel>
        <select
          id="filter-menu-type"
          v-model="typeFilter"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        >
          <option value="">全部</option>
          <option value="DIRECTORY">目录</option>
          <option value="MENU">菜单</option>
          <option value="BUTTON">按钮</option>
        </select>
      </Field>
      <Button type="submit" :disabled="loading">查询</Button>
      <Button type="button" variant="outline" :disabled="loading" @click="load()">刷新</Button>
    </form>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-muted-foreground text-sm">
        {{ loading ? '正在加载' : `共 ${rows.length} 个权限` }}
      </p>
      <Button
        v-if="can('system:permission:remove')"
        type="button"
        variant="destructive"
        :disabled="selectedIds.length === 0 || deleting"
        @click="openDelete"
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
        <TableRow>
          <TableHead scope="col">
            <input
              type="checkbox"
              aria-label="选择当前结果"
              :checked="allVisibleSelected"
              :disabled="visibleRows.length === 0"
              @change="toggleVisible(($event.target as HTMLInputElement).checked)"
            />
          </TableHead>
          <TableHead scope="col">名称</TableHead>
          <TableHead scope="col">类型</TableHead>
          <TableHead scope="col">标识</TableHead>
          <TableHead scope="col">路由</TableHead>
          <TableHead scope="col">状态</TableHead>
          <TableHead scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="!loading && visibleRows.length === 0" :colspan="7">
          {{ errorMessage ? '这次没有加载到菜单。' : '没有符合条件的菜单。' }}
        </TableEmpty>
        <TableRow v-for="row in visibleRows" :key="row.id">
          <TableCell>
            <input
              type="checkbox"
              :aria-label="`选择 ${row.name}`"
              :checked="selectedIds.includes(row.id)"
              @change="toggleSelected(row.id, ($event.target as HTMLInputElement).checked)"
            />
          </TableCell>
          <TableCell>
            <span
              class="block max-w-72 truncate"
              :style="{ paddingLeft: `${row.depth * 16}px` }"
              :title="row.name"
            >
              {{ row.name }}
            </span>
          </TableCell>
          <TableCell>{{ PermissionTypeLabel[row.type] }}</TableCell>
          <TableCell>{{ row.code }}</TableCell>
          <TableCell>{{ row.url }}</TableCell>
          <TableCell>
            <Switch
              v-if="can('system:permission:edit')"
              :model-value="row.enabled"
              :disabled="statusPendingId === row.id"
              :aria-label="`${row.name} 的状态`"
              @update:model-value="changeStatus(row, Boolean($event))"
            />
            <span v-else>{{ row.enabled ? '启用' : '停用' }}</span>
          </TableCell>
          <TableCell>
            <Button
              v-if="can('system:permission:query')"
              type="button"
              variant="outline"
              size="sm"
              @click="openEdit(row)"
            >
              编辑
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <MenuEditor
      :open="editorOpen"
      :menu="editorMenu"
      :rows="rows"
      @update:open="editorOpen = $event"
      @saved="load()"
    />

    <AlertDialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除所选菜单</AlertDialogTitle>
          <AlertDialogDescription>
            将删除 {{ selectedIds.length }} 个权限。仍有下级时，后端会拒绝这次删除。
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
  </section>
</template>
