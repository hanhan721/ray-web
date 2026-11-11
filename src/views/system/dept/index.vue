<script setup lang="ts">
import { Building, Plus, RefreshCw, RotateCcw, Trash2 } from '@lucide/vue'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { deleteDepts, getDeptTree, updateDept } from '@/api/dept'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { useRowStatus } from '@/composables/useRowStatus'
import { useSelection } from '@/composables/useSelection'
import { QUIET, failureMessage } from '@/utils/failure'
import RayTable from '@/components/common/RayTable.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import DeptEditor from './DeptEditor.vue'
import {
  DEPT_DATA_COLUMNS,
  deptCellClass,
  filterDeptRows,
  flattenDepts,
  toDeptWrite,
  type DeptRow,
} from './dept-tree'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const rows = shallowRef<DeptRow[]>([])
const name = shallowRef('')
const loading = shallowRef(false)
const errorMessage = shallowRef('')
const editorOpen = shallowRef(false)
const editorDept = shallowRef<DeptRow | null>(null)
let generation = 0

const { selectedIds, clearSelection, toggleSelected, toggleAll } = useSelection<DeptRow>()
const visibleRows = computed(() => filterDeptRows(rows.value, name.value))
const rowLabel = (row: DeptRow) => row.deptName

const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<DeptRow>({
  deleteRows: (ids) => deleteDepts(ids, QUIET),
  selectedIds,
  clearSelection,
  load,
})

const { pendingIds: statusPendingIds, change: changeStatus } = useRowStatus({
  update: (id, enabled) => {
    const row = rows.value.find((item) => item.id === id)
    return row ? updateDept(toDeptWrite(row, enabled)) : Promise.resolve()
  },
  setRowEnabled: (id, enabled) => {
    rows.value = rows.value.map((item) => (item.id === id ? { ...item, enabled } : item))
  },
})

async function load() {
  const requestId = ++generation
  loading.value = true
  errorMessage.value = ''
  try {
    const tree = await getDeptTree(QUIET)
    if (requestId !== generation) return
    rows.value = flattenDepts(tree ?? [])
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.id === id))
  } catch (error) {
    if (requestId !== generation) return
    rows.value = []
    errorMessage.value = failureMessage(error, '部门加载失败')
  } finally {
    if (requestId === generation) loading.value = false
  }
}

function resetFilters() {
  name.value = ''
  clearSelection()
}

function openCreate() {
  editorDept.value = null
  editorOpen.value = true
}

function openEdit(row: DeptRow) {
  editorDept.value = row
  editorOpen.value = true
}

watch(name, () => {
  clearSelection()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <RayTable
    :paginated="false"
    :columns="DEPT_DATA_COLUMNS"
    :rows="visibleRows"
    :total="visibleRows.length"
    :page-index="0"
    :page-size="visibleRows.length"
    :loading="loading"
    :error-message="errorMessage"
    :selected-ids="selectedIds"
    selection-unit="个"
    :row-label="rowLabel"
    :cell-class="deptCellClass"
    @toggle-row="toggleSelected"
    @toggle-page="toggleAll(visibleRows, $event)"
    @retry="load()"
  >
    <template #filters>
      <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="load()">
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel
            for="filter-dept-name"
            class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
            >名称</FieldLabel
          >
          <Input
            id="filter-dept-name"
            v-model="name"
            name="deptName"
            placeholder="输入部门名称"
            class="h-9 w-48"
          />
        </Field>
        <div class="flex items-center gap-2">
          <Button type="submit" :disabled="loading">
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
          <Button type="button" variant="ghost" :disabled="loading" @click="resetFilters()">
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
        </div>
        <p class="text-muted-foreground w-full text-xs">
          按名称在已加载的部门树里筛选；删除上级前要先处理下级和关联用户。
        </p>
      </form>
    </template>

    <template #actions>
      <Button v-if="can('system:dept:add')" type="button" @click="openCreate">
        <Plus data-icon="inline-start" />
        新增部门
      </Button>
      <Button
        v-if="can('system:dept:remove')"
        type="button"
        variant="outline"
        :disabled="selectedIds.length === 0 || deleting"
        @click="openDelete"
      >
        <Trash2 data-icon="inline-start" />
        删除所选
        <span v-if="selectedIds.length > 0" class="text-muted-foreground">
          {{ selectedIds.length }}
        </span>
      </Button>
    </template>

    <template #empty="{ errorMessage: loadError }">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到部门' : '没有符合条件的部门' }}
          </EmptyTitle>
          <EmptyDescription>
            {{ loadError ? '稍后重试。' : '换个名称试试，或新增一个部门。' }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            v-if="can('system:dept:add') && !loadError"
            type="button"
            variant="outline"
            size="sm"
            @click="openCreate"
          >
            新增部门
          </Button>
        </EmptyContent>
      </Empty>
    </template>

    <template #cell-deptName="{ row }">
      <span
        class="block max-w-72 truncate font-medium text-foreground"
        :style="{ paddingLeft: `${row.depth * 16}px` }"
        :title="row.deptName"
      >
        {{ row.deptName }}
      </span>
    </template>

    <template #cell-enabled="{ row }">
      <Switch
        v-if="can('system:dept:edit')"
        :model-value="row.enabled"
        :disabled="statusPendingIds.has(row.id)"
        :aria-label="`${row.deptName} 的状态`"
        @update:model-value="changeStatus(row.id, Boolean($event))"
      />
      <Badge v-else :variant="row.enabled ? 'default' : 'secondary'" class="font-normal">
        {{ row.enabled ? '启用' : '停用' }}
      </Badge>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-16 flex-nowrap gap-1">
        <Button
          v-if="can('system:dept:query')"
          type="button"
          variant="ghost"
          size="sm"
          @click="openEdit(row)"
        >
          编辑
        </Button>
      </div>
    </template>
  </RayTable>

  <DeptEditor
    :open="editorOpen"
    :dept="editorDept"
    :rows="rows"
    @update:open="editorOpen = $event"
    @saved="load()"
  />

  <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
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
</template>
