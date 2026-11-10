<script setup lang="ts">
import { ListTree, Plus, RefreshCw, RotateCcw, Trash2 } from '@lucide/vue'
import { computed, onMounted, shallowRef, watch } from 'vue'
import { deletePermissions, getPermissionTree, updatePermission } from '@/api/permission'
import { PermissionTypeLabel, PermissionTypeOptions, type PermissionType } from '@/types/enums'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { useRowStatus } from '@/composables/useRowStatus'
import { useSelection } from '@/composables/useSelection'
import { QUIET, failureMessage } from '@/utils/failure'
import ProTable from '@/components/common/ProTable.vue'
import SingleSelect from '@/components/common/SingleSelect.vue'
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
import MenuEditor from './MenuEditor.vue'
import {
  MENU_DATA_COLUMNS,
  filterMenuRows,
  flattenMenus,
  menuCellClass,
  toMenuWrite,
  type MenuRow,
} from './menu-tree'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const rows = shallowRef<MenuRow[]>([])
const name = shallowRef('')
const typeFilter = shallowRef<PermissionType | ''>('')
const loading = shallowRef(false)
const errorMessage = shallowRef('')
const editorOpen = shallowRef(false)
const editorMenu = shallowRef<MenuRow | null>(null)
let generation = 0

const { selectedIds, clearSelection, toggleSelected, toggleAll } = useSelection<MenuRow>()
const visibleRows = computed(() => filterMenuRows(rows.value, name.value, typeFilter.value))
const rowLabel = (row: MenuRow) => row.name

const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<MenuRow>({
  deleteRows: (ids) => deletePermissions(ids, QUIET),
  selectedIds,
  clearSelection,
  load,
})

const { pendingIds: statusPendingIds, change: changeStatus } = useRowStatus({
  update: (id, enabled) => {
    const row = rows.value.find((item) => item.id === id)
    return row ? updatePermission(toMenuWrite(row, enabled)) : Promise.resolve()
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
    const tree = await getPermissionTree(QUIET, { reload: true })
    if (requestId !== generation) return
    rows.value = flattenMenus(tree ?? [])
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.id === id))
  } catch (error) {
    if (requestId !== generation) return
    rows.value = []
    errorMessage.value = failureMessage(error, '菜单加载失败')
  } finally {
    if (requestId === generation) loading.value = false
  }
}

function setTypeFilter(value: unknown) {
  typeFilter.value = value === 'DIRECTORY' || value === 'MENU' || value === 'BUTTON' ? value : ''
}

function resetFilters() {
  name.value = ''
  typeFilter.value = ''
  clearSelection()
}

function openCreate() {
  editorMenu.value = null
  editorOpen.value = true
}

function openEdit(row: MenuRow) {
  editorMenu.value = row
  editorOpen.value = true
}

watch([name, typeFilter], () => {
  clearSelection()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <ProTable
    :paginated="false"
    :columns="MENU_DATA_COLUMNS"
    :rows="visibleRows"
    :total="visibleRows.length"
    :page-index="0"
    :page-size="visibleRows.length"
    :loading="loading"
    :error-message="errorMessage"
    :selected-ids="selectedIds"
    selection-unit="个"
    :row-label="rowLabel"
    :cell-class="menuCellClass"
    @toggle-row="toggleSelected"
    @toggle-page="toggleAll(visibleRows, $event)"
    @retry="load()"
  >
    <template #filters>
      <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="load()">
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel
            for="filter-menu-name"
            class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
            >名称</FieldLabel
          >
          <Input
            id="filter-menu-name"
            v-model="name"
            name="name"
            placeholder="输入菜单名称"
            class="h-9 w-48"
          />
        </Field>
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel
            for="filter-menu-type"
            class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
            >类型</FieldLabel
          >
          <SingleSelect
            id="filter-menu-type"
            :model-value="typeFilter"
            :options="PermissionTypeOptions"
            placeholder="全部"
            size="lg"
            searchable
            clearable
            class="w-32"
            @update:model-value="setTypeFilter"
          />
        </Field>
        <div class="flex items-center gap-2">
          <Button type="button" variant="ghost" :disabled="loading" @click="resetFilters()">
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
          <Button type="submit" variant="outline" :disabled="loading">
            <RefreshCw data-icon="inline-start" />
            刷新
          </Button>
        </div>
        <p class="text-muted-foreground w-full text-xs">
          按名称和类型在已加载的权限树里筛选；改权限标识或启用状态后需要重新登录。
        </p>
      </form>
    </template>

    <template #actions>
      <Button v-if="can('system:permission:add')" type="button" @click="openCreate">
        <Plus data-icon="inline-start" />
        新增菜单
      </Button>
      <Button
        v-if="can('system:permission:remove')"
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
            <ListTree />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到菜单' : '没有符合条件的菜单' }}
          </EmptyTitle>
          <EmptyDescription>
            {{ loadError ? '稍后重试。' : '换个名称或类型试试，或新增一个菜单。' }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            v-if="can('system:permission:add') && !loadError"
            type="button"
            variant="outline"
            size="sm"
            @click="openCreate"
          >
            新增菜单
          </Button>
        </EmptyContent>
      </Empty>
    </template>

    <template #cell-name="{ row }">
      <span
        class="block max-w-72 truncate font-medium text-foreground"
        :style="{ paddingLeft: `${row.depth * 16}px` }"
        :title="row.name"
      >
        {{ row.name }}
      </span>
    </template>

    <template #cell-type="{ row }">
      {{ PermissionTypeLabel[row.type] }}
    </template>

    <template #cell-enabled="{ row }">
      <Switch
        v-if="can('system:permission:edit')"
        :model-value="row.enabled"
        :disabled="statusPendingIds.has(row.id)"
        :aria-label="`${row.name} 的状态`"
        @update:model-value="changeStatus(row.id, Boolean($event))"
      />
      <Badge v-else :variant="row.enabled ? 'default' : 'secondary'" class="font-normal">
        {{ row.enabled ? '启用' : '停用' }}
      </Badge>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-16 flex-nowrap gap-1">
        <Button
          v-if="can('system:permission:query')"
          type="button"
          variant="ghost"
          size="sm"
          @click="openEdit(row)"
        >
          编辑
        </Button>
      </div>
    </template>
  </ProTable>

  <MenuEditor
    :open="editorOpen"
    :menu="editorMenu"
    :rows="rows"
    @update:open="editorOpen = $event"
    @saved="load()"
  />

  <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
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
</template>
