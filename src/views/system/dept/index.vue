<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { deleteDepts, getDeptTree, updateDept } from '@/api/dept'
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
import DeptEditor from './DeptEditor.vue'
import { filterDeptRows, flattenDepts, toDeptWrite, type DeptRow } from './dept-tree'

const session = useSessionStore()
const rows = shallowRef<DeptRow[]>([])
const name = shallowRef('')
const loading = shallowRef(false)
const errorMessage = shallowRef('')
const selectedIds = shallowRef<number[]>([])
const editorOpen = shallowRef(false)
const editorDept = shallowRef<DeptRow | null>(null)
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
const statusPendingId = shallowRef<number | null>(null)
let generation = 0

const visibleRows = computed(() => filterDeptRows(rows.value, name.value))
const allVisibleSelected = computed(
  () =>
    visibleRows.value.length > 0 &&
    visibleRows.value.every((row) => selectedIds.value.includes(row.id)),
)
const can = (code: string) => session.can(code)

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '部门加载失败'
}

async function load() {
  const requestId = ++generation
  loading.value = true
  errorMessage.value = ''
  try {
    const tree = await getDeptTree({ showErrorMessage: false })
    if (requestId !== generation) return
    rows.value = flattenDepts(tree ?? [])
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

function openDelete() {
  deleteError.value = ''
  deleteOpen.value = true
}

watch(name, () => {
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
  editorDept.value = null
  editorOpen.value = true
}

function openEdit(row: DeptRow) {
  editorDept.value = row
  editorOpen.value = true
}

async function changeStatus(row: DeptRow, enabled: boolean) {
  statusPendingId.value = row.id
  try {
    await updateDept(toDeptWrite(row, enabled))
    rows.value = rows.value.map((item) => (item.id === row.id ? { ...item, enabled } : item))
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
    await deleteDepts(selectedIds.value, { showErrorMessage: false })
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
        <h1 class="text-lg font-medium">部门管理</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          按名称在已加载的部门树里查找。删除上级前要先处理下级和关联用户。
        </p>
      </div>
      <Button v-if="can('system:dept:add')" type="button" @click="openCreate">新增部门</Button>
    </header>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="search()">
      <Field class="w-48">
        <FieldLabel for="filter-dept-name">名称</FieldLabel>
        <Input id="filter-dept-name" v-model="name" name="deptName" />
      </Field>
      <Button type="submit" :disabled="loading">查询</Button>
      <Button type="button" variant="outline" :disabled="loading" @click="load()">刷新</Button>
    </form>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-muted-foreground text-sm">
        {{ loading ? '正在加载' : `共 ${rows.length} 个部门` }}
      </p>
      <Button
        v-if="can('system:dept:remove')"
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
          <TableHead scope="col">负责人</TableHead>
          <TableHead scope="col">电话</TableHead>
          <TableHead scope="col">状态</TableHead>
          <TableHead scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="!loading && visibleRows.length === 0" :colspan="6">
          {{ errorMessage ? '这次没有加载到部门。' : '没有符合条件的部门。' }}
        </TableEmpty>
        <TableRow v-for="row in visibleRows" :key="row.id">
          <TableCell>
            <input
              type="checkbox"
              :aria-label="`选择 ${row.deptName}`"
              :checked="selectedIds.includes(row.id)"
              @change="toggleSelected(row.id, ($event.target as HTMLInputElement).checked)"
            />
          </TableCell>
          <TableCell>
            <span
              class="block max-w-72 truncate"
              :style="{ paddingLeft: `${row.depth * 16}px` }"
              :title="row.deptName"
            >
              {{ row.deptName }}
            </span>
          </TableCell>
          <TableCell>{{ row.leader }}</TableCell>
          <TableCell>{{ row.phone }}</TableCell>
          <TableCell>
            <Switch
              v-if="can('system:dept:edit')"
              :model-value="row.enabled"
              :disabled="statusPendingId === row.id"
              :aria-label="`${row.deptName} 的状态`"
              @update:model-value="changeStatus(row, Boolean($event))"
            />
            <span v-else>{{ row.enabled ? '启用' : '停用' }}</span>
          </TableCell>
          <TableCell>
            <Button
              v-if="can('system:dept:query')"
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

    <DeptEditor
      :open="editorOpen"
      :dept="editorDept"
      :rows="rows"
      @update:open="editorOpen = $event"
      @saved="load()"
    />

    <AlertDialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除所选部门</AlertDialogTitle>
          <AlertDialogDescription>
            将删除 {{ selectedIds.length }} 个部门。仍有下级或关联用户时，后端会拒绝这次删除。
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
