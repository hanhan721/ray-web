<script setup lang="ts">
import RaySearchForm from '@/components/common/RaySearchForm.vue'
import { RotateCcw, Search, Trash2, UserRoundPlus, UsersRound } from '@lucide/vue'
import { onMounted, shallowRef } from 'vue'
import { deleteUsers, updateUserStatus, type SysUser } from '@/api/user'
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
import UserEditor from './UserEditor.vue'
import UserPasswordDialog from './UserPasswordDialog.vue'
import { useUserList } from './use-user-list'
import { cellClass, genderText, USER_DATA_COLUMNS } from './user-table'

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
const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<SysUser>({
  deleteRows: (ids) => deleteUsers(ids),
  selectedIds,
  clearSelection,
  rows,
  pageIndex,
  changePage,
  load,
})
const { pendingIds: statusPendingIds, change: changeStatus } = useRowStatus({
  update: (id, nextEnabled) => updateUserStatus(id, nextEnabled),
  setRowEnabled,
})
const editorOpen = shallowRef(false)
const editorId = shallowRef<number | null>(null)
const passwordOpen = shallowRef(false)
const passwordUser = shallowRef<SysUser | null>(null)

const can = (code: string) => session.can(code)
const rowLabel = (row: SysUser) => row.username

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

onMounted(() => {
  void load()
})
</script>

<template>
  <RayTable
    fill
    :columns="USER_DATA_COLUMNS"
    :rows="rows"
    :total="total"
    :page-index="pageIndex"
    :page-size="pageSize"
    :loading="loading"
    :error-message="errorMessage"
    :selected-ids="selectedIds"
    :page-key="PAGE_KEYS.SYS_USER"
    selection-unit="人"
    :row-label="rowLabel"
    :cell-class="cellClass"
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
          <FieldLabel for="filter-username">账号</FieldLabel>
          <Input
            id="filter-username"
            v-model="username"
            name="username"
            placeholder="输入账号关键字"
          />
        </Field>
        <Field orientation="horizontal">
          <FieldLabel for="filter-nickname">昵称</FieldLabel>
          <Input
            id="filter-nickname"
            v-model="nickname"
            name="nickname"
            placeholder="输入昵称关键字"
          />
        </Field>
        <Field orientation="horizontal" class="ray-search-field-short">
          <FieldLabel for="filter-enabled">状态</FieldLabel>
          <RaySelect
            id="filter-enabled"
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
      <Button v-if="can('user:add')" type="button" @click="openCreate">
        <UserRoundPlus data-icon="inline-start" />
        新增用户
      </Button>
      <Button
        v-if="can('system:user:remove')"
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
            <UsersRound />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到用户' : '没有符合条件的用户' }}
          </EmptyTitle>
          <EmptyDescription>
            {{
              loadError ? '稍后重试，或调整筛选条件后再查询。' : '换个关键字试试，或新增一个用户。'
            }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            v-if="can('user:add') && !loadError"
            type="button"
            variant="outline"
            size="sm"
            @click="openCreate"
          >
            新增用户
          </Button>
        </EmptyContent>
      </Empty>
    </template>

    <template #cell-enabled="{ row }">
      <Switch
        v-if="can('system:user:status')"
        :model-value="row.enabled !== false"
        :disabled="statusPendingIds.has(row.id)"
        :aria-label="`${row.username} 的状态`"
        @update:model-value="changeStatus(row.id, Boolean($event))"
      />
      <Badge v-else :variant="row.enabled === false ? 'secondary' : 'default'" class="font-normal">
        {{ row.enabled === false ? '停用' : '启用' }}
      </Badge>
    </template>

    <template #cell-gender="{ row }">
      <span :class="cellClass('gender')">{{ genderText(row.gender) }}</span>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-32 flex-nowrap gap-1">
        <Button
          v-if="can('system:user:query')"
          type="button"
          variant="ghost"
          size="sm"
          @click="openEdit(row)"
        >
          编辑
        </Button>
        <Button
          v-if="can('system:user:password')"
          type="button"
          variant="ghost"
          size="sm"
          @click="openPassword(row)"
        >
          密码
        </Button>
      </div>
    </template>
  </RayTable>

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

  <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
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
</template>
