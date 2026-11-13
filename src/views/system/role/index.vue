<script setup lang="ts">
import RaySearchForm from '@/components/common/RaySearchForm.vue'
import { RotateCcw, Search, ShieldCheck, ShieldPlus, Trash2 } from '@lucide/vue'
import { onMounted, shallowRef } from 'vue'
import { deleteRoles, updateRoleStatus, type Role } from '@/api/role'
import { EnabledFilterOptions, PAGE_KEYS } from '@/types/enums'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { useRowStatus } from '@/composables/useRowStatus'
import RayTable from '@/components/common/RayTable.vue'
import RaySelect from '@/components/common/RaySelect.vue'
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
import RoleEditor from './RoleEditor.vue'
import { useRoleList } from './use-role-list'
import { ROLE_DATA_COLUMNS, roleCellClass } from './role-table'

const session = useSessionStore()
const {
  rows,
  total,
  pageIndex,
  pageSize,
  roleName,
  roleKey,
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
} = useRoleList()
const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<Role>({
  deleteRows: (ids) => deleteRoles(ids),
  selectedIds,
  clearSelection,
  rows,
  pageIndex,
  changePage,
  load,
})
const { pendingIds: statusPendingIds, change: changeStatus } = useRowStatus({
  update: updateRoleStatus,
  setRowEnabled,
})
const editorOpen = shallowRef(false)
const editorId = shallowRef<number | null>(null)

const can = (code: string) => session.can(code)
const rowLabel = (row: Role) => row.roleName

function openCreate() {
  editorId.value = null
  editorOpen.value = true
}

function openEdit(row: Role) {
  editorId.value = row.id
  editorOpen.value = true
}

function setEnabledFilter(value: unknown) {
  enabled.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function resetFilters() {
  roleName.value = ''
  roleKey.value = ''
  enabled.value = ''
  return search()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <RayTable
    fill
    :columns="ROLE_DATA_COLUMNS"
    :rows="rows"
    :total="total"
    :page-index="pageIndex"
    :page-size="pageSize"
    :loading="loading"
    :error-message="errorMessage"
    :selected-ids="selectedIds"
    :page-key="PAGE_KEYS.SYS_ROLE"
    selection-unit="个"
    :row-label="rowLabel"
    :cell-class="roleCellClass"
    @update:page-index="changePage"
    @update:page-size="changePageSize"
    @toggle-row="toggleSelected"
    @row-click="(row) => toggleSelected(row.id, !selectedIds.includes(row.id))"
    @toggle-page="togglePage"
    @retry="load()"
  >
    <template #filters>
      <RaySearchForm @submit="search()">
        <Field orientation="horizontal">
          <FieldLabel for="filter-role-name">名称</FieldLabel>
          <Input
            id="filter-role-name"
            v-model="roleName"
            name="roleName"
            placeholder="输入角色名称"
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel for="filter-role-key">标识</FieldLabel>
          <Input id="filter-role-key" v-model="roleKey" name="roleKey" placeholder="输入角色标识" />
        </Field>
        <Field orientation="horizontal" class="ray-search-field-short">
          <FieldLabel for="filter-role-enabled">状态</FieldLabel>
          <RaySelect
            id="filter-role-enabled"
            :model-value="enabled || null"
            :options="EnabledFilterOptions"
            placeholder="全部"
            size="lg"
            searchable
            clearable
            @update:model-value="setEnabledFilter"
          />
        </Field>
        <template #actions>
          <Button type="submit" :disabled="loading">
            <Search data-icon="inline-start" />
            查询
          </Button>
          <Button type="button" variant="ghost" :disabled="loading" @click="resetFilters()">
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
        </template>
      </RaySearchForm>
    </template>

    <template #actions>
      <Button v-if="can('system:role:add')" type="button" @click="openCreate">
        <ShieldPlus data-icon="inline-start" />
        新增角色
      </Button>
      <Button
        v-if="can('system:role:remove')"
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
            <ShieldCheck />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到角色' : '没有符合条件的角色' }}
          </EmptyTitle>
          <EmptyDescription>
            {{
              loadError ? '稍后重试，或调整筛选条件后再查询。' : '换个关键字试试，或新增一个角色。'
            }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            v-if="can('system:role:add') && !loadError"
            type="button"
            variant="outline"
            size="sm"
            @click="openCreate"
          >
            新增角色
          </Button>
        </EmptyContent>
      </Empty>
    </template>

    <template #cell-enabled="{ row }">
      <Switch
        v-if="can('system:role:status')"
        :model-value="row.enabled !== false"
        :disabled="statusPendingIds.has(row.id)"
        :aria-label="`${row.roleName} 的状态`"
        @update:model-value="changeStatus(row.id, Boolean($event))"
      />
      <Badge v-else :variant="row.enabled === false ? 'secondary' : 'default'" class="font-normal">
        {{ row.enabled === false ? '停用' : '启用' }}
      </Badge>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-24 flex-nowrap gap-1">
        <Button
          v-if="can('system:role:query')"
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

  <RoleEditor
    :open="editorOpen"
    :role-id="editorId"
    :can-assign-permissions="can('system:role:permission') && can('system:permission:list')"
    @update:open="editorOpen = $event"
    @saved="load()"
  />

  <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除所选角色</AlertDialogTitle>
        <AlertDialogDescription>
          将删除 {{ selectedIds.length }} 个角色。这个操作不能从当前页面撤销。
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
