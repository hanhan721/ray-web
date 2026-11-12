<script setup lang="ts">
import { Plus, RotateCcw, Search, SlidersHorizontal, Trash2 } from '@lucide/vue'
import { onMounted, shallowRef } from 'vue'
import { deleteParams, getParamPage, type SystemParam } from '@/api/param'
import { ParamTypeOptions, type ParamType } from '@/types/enums'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { usePagedList } from '@/composables/usePagedList'
import { QUIET } from '@/utils/failure'
import RayTable from '@/components/common/RayTable.vue'
import RaySelect from '@/components/common/RaySelect.vue'
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import ParamEditor from './ParamEditor.vue'
import {
  PARAM_BIZ_SELECT_OPTIONS,
  PARAM_DATA_COLUMNS,
  paramBizLabel,
  paramCellClass,
  paramTypeLabel,
  toParamQuery,
} from './param-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const bizType = shallowRef('')
const paramType = shallowRef<ParamType | ''>('')
const editorOpen = shallowRef(false)
const editorId = shallowRef<number | null>(null)

const {
  rows,
  total,
  pageIndex,
  pageSize,
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
} = usePagedList<SystemParam>({
  fetchPage: (input) =>
    getParamPage(
      toParamQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        bizType: bizType.value,
        paramType: paramType.value,
      }),
      QUIET,
    ),
  fallbackMessage: '系统参数加载失败',
})
const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<SystemParam>({
  deleteRows: (ids) => deleteParams(ids, QUIET),
  selectedIds,
  clearSelection,
  rows,
  pageIndex,
  changePage,
  load,
})

const rowLabel = (row: SystemParam) => row.paramKey

function openCreate() {
  editorId.value = null
  editorOpen.value = true
}

function openEdit(row: SystemParam) {
  editorId.value = row.id
  editorOpen.value = true
}

function resetFilters() {
  bizType.value = ''
  paramType.value = ''
  return search()
}

function onSaved() {
  if (editorId.value === null) pageIndex.value = 0
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <RayTable
    fill
    :columns="PARAM_DATA_COLUMNS"
    :rows="rows"
    :total="total"
    :page-index="pageIndex"
    :page-size="pageSize"
    :loading="loading"
    :error-message="errorMessage"
    :selected-ids="selectedIds"
    :row-label="rowLabel"
    :cell-class="paramCellClass"
    @update:page-index="changePage"
    @update:page-size="changePageSize"
    @toggle-row="toggleSelected"
      @row-click="(row) => toggleSelected(row.id, !selectedIds.includes(row.id))"
    @toggle-page="togglePage"
    @retry="load()"
  >
    <template #filters>
      <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="search()">
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel
            for="filter-param-biz"
            class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
            >分类</FieldLabel
          >
          <RaySelect
            id="filter-param-biz"
            :model-value="bizType || null"
            :options="PARAM_BIZ_SELECT_OPTIONS"
            placeholder="全部"
            size="lg"
            searchable
            clearable
            class="w-40"
            @update:model-value="bizType = $event ?? ''"
          />
        </Field>
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel
            for="filter-param-type"
            class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
            >类型</FieldLabel
          >
          <RaySelect
            id="filter-param-type"
            :model-value="paramType || null"
            :options="ParamTypeOptions"
            placeholder="全部"
            size="lg"
            searchable
            clearable
            class="w-36"
            @update:model-value="paramType = $event ?? ''"
          />
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
    </template>

    <template #actions>
      <Button v-if="can('system:param:add')" type="button" @click="openCreate">
        <Plus data-icon="inline-start" />
        新增参数
      </Button>
      <Button
        v-if="can('system:param:remove')"
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
            <SlidersHorizontal />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到系统参数' : '没有符合条件的系统参数' }}
          </EmptyTitle>
          <EmptyDescription>
            {{
              loadError
                ? '稍后重试，或调整筛选条件后再查询。'
                : '换个分类或类型试试，或新增一个参数。'
            }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            v-if="can('system:param:add') && !loadError"
            type="button"
            variant="outline"
            size="sm"
            @click="openCreate"
          >
            新增参数
          </Button>
        </EmptyContent>
      </Empty>
    </template>

    <template #cell-paramType="{ row }">
      <span :class="paramCellClass('paramType')">{{ paramTypeLabel(row.paramType) }}</span>
    </template>

    <template #cell-bizType="{ row }">
      <span :class="paramCellClass('bizType')">{{ paramBizLabel(row.bizType) }}</span>
    </template>

    <template #cell-encrypted="{ row }">
      <span :class="paramCellClass('encrypted')">{{ row.encrypted ? '是' : '否' }}</span>
    </template>

    <template #cell-actions="{ row }">
      <div class="flex min-w-24 flex-nowrap gap-1">
        <Button
          v-if="can('system:param:query') && can('system:param:edit')"
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

  <ParamEditor v-model:open="editorOpen" :param-id="editorId" @saved="onSaved" />

  <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除系统参数</AlertDialogTitle>
        <AlertDialogDescription>
          将删除 {{ selectedIds.length }} 个参数。删除后按键读取会得不到原值。
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
