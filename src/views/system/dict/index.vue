<script setup lang="ts">
import { Database, Library, Plus, RotateCcw, Search, Trash2 } from '@lucide/vue'
import { onMounted, shallowRef, watch } from 'vue'
import {
  deleteDictData,
  deleteDictTypes,
  getDictDataPage,
  getDictTypePage,
  updateDictData,
  updateDictType,
  type DictDataRecord,
  type DictTypeRecord,
} from '@/api/dict'
import { EnabledFilterOptions } from '@/types/enums'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { usePagedList } from '@/composables/usePagedList'
import { useRowStatus } from '@/composables/useRowStatus'
import { QUIET } from '@/utils/failure'
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
import DictDataEditor from './DictDataEditor.vue'
import DictTypeEditor from './DictTypeEditor.vue'
import {
  DICT_DATA_COLUMNS,
  DICT_TYPE_COLUMNS,
  dictCellClass,
  toDataQuery,
  toDictDataWrite,
  toDictTypeWrite,
  toTypeQuery,
} from './dict-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const typeName = shallowRef('')
const typeCode = shallowRef('')
const typeEnabled = shallowRef<'' | 'true' | 'false'>('')
const dataLabel = shallowRef('')
const dataEnabled = shallowRef<'' | 'true' | 'false'>('')
const selectedType = shallowRef<DictTypeRecord | null>(null)
const typeEditorOpen = shallowRef(false)
const typeEditorRow = shallowRef<DictTypeRecord | null>(null)
const dataEditorOpen = shallowRef(false)
const dataEditorRow = shallowRef<DictDataRecord | null>(null)

function emptyPage<T>(pageSize: number): IPage<T> {
  return { current: 1, size: pageSize, total: 0, pages: 0, records: [] }
}

const {
  rows: typeRows,
  total: typeTotal,
  pageIndex: typePageIndex,
  pageSize: typePageSize,
  loading: typeLoading,
  errorMessage: typeError,
  selectedIds: typeSelectedIds,
  clearSelection: clearTypeSelection,
  load: loadTypePage,
  search: searchTypePage,
  changePage: changeTypePage,
  changePageSize: changeTypePageSize,
  toggleSelected: toggleType,
  togglePage: toggleTypes,
  setRowEnabled: setTypeRowEnabled,
} = usePagedList<DictTypeRecord>({
  fetchPage: (input) =>
    getDictTypePage(
      toTypeQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        dictName: typeName.value,
        dictType: typeCode.value,
        enabled: typeEnabled.value,
      }),
      QUIET,
    ),
  fallbackMessage: '字典类型加载失败',
})

const {
  rows: dataRows,
  total: dataTotal,
  pageIndex: dataPageIndex,
  pageSize: dataPageSize,
  loading: dataLoading,
  errorMessage: dataError,
  selectedIds: dataSelectedIds,
  clearSelection: clearDataSelection,
  load: loadDataPage,
  search: searchDataPage,
  changePage: changeDataPage,
  changePageSize: changeDataPageSize,
  toggleSelected: toggleData,
  togglePage: toggleDataPage,
  setRowEnabled: setDataRowEnabled,
} = usePagedList<DictDataRecord>({
  fetchPage: (input) => {
    const dictType = selectedType.value?.dictType
    if (!dictType) return Promise.resolve(emptyPage<DictDataRecord>(input.pageSize))
    return getDictDataPage(
      toDataQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        dictType,
        dictLabel: dataLabel.value,
        enabled: dataEnabled.value,
      }),
      QUIET,
    )
  },
  fallbackMessage: '字典数据加载失败',
})

const {
  open: typeDeleteOpen,
  deleting: typeDeleting,
  error: typeDeleteError,
  openDialog: openTypeDelete,
  setOpen: setTypeDeleteOpen,
  confirm: confirmTypeDelete,
} = useDeleteMany<DictTypeRecord>({
  deleteRows: async (ids) => {
    await deleteDictTypes(ids, QUIET)
    if (selectedType.value && ids.includes(selectedType.value.id)) selectedType.value = null
  },
  selectedIds: typeSelectedIds,
  clearSelection: clearTypeSelection,
  rows: typeRows,
  pageIndex: typePageIndex,
  changePage: changeTypePage,
  load: loadTypes,
})
const {
  open: dataDeleteOpen,
  deleting: dataDeleting,
  error: dataDeleteError,
  openDialog: openDataDelete,
  setOpen: setDataDeleteOpen,
  confirm: confirmDataDelete,
} = useDeleteMany<DictDataRecord>({
  deleteRows: (ids) => deleteDictData(ids, QUIET),
  selectedIds: dataSelectedIds,
  clearSelection: clearDataSelection,
  rows: dataRows,
  pageIndex: dataPageIndex,
  changePage: changeDataPage,
  load: loadDataPage,
})

const { pendingIds: typeStatusPendingIds, change: changeTypeStatus } = useRowStatus({
  update: (id, enabled) => {
    const row = typeRows.value.find((item) => item.id === id)
    return row ? updateDictType(toDictTypeWrite(row, enabled)) : Promise.resolve()
  },
  setRowEnabled: (id, enabled) => {
    setTypeRowEnabled(id, enabled)
    if (selectedType.value?.id === id) selectedType.value = { ...selectedType.value, enabled }
  },
})
const { pendingIds: dataStatusPendingIds, change: changeDataStatus } = useRowStatus({
  update: (id, enabled) => {
    const row = dataRows.value.find((item) => item.id === id)
    return row ? updateDictData(toDictDataWrite(row, enabled)) : Promise.resolve()
  },
  setRowEnabled: setDataRowEnabled,
})

const typeRowLabel = (row: DictTypeRecord) => row.dictName
const dataRowLabel = (row: DictDataRecord) => row.dictLabel

/** 列表刷新后把选中的类型替换成最新行，避免右侧仍显示旧名称。 */
async function loadTypes() {
  await loadTypePage()
  const current = typeRows.value.find((row) => row.id === selectedType.value?.id)
  if (current) selectedType.value = current
}

function setTypeEnabledFilter(value: unknown) {
  typeEnabled.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function setDataEnabledFilter(value: unknown) {
  dataEnabled.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function resetTypeFilters() {
  typeName.value = ''
  typeCode.value = ''
  typeEnabled.value = ''
  return searchTypePage()
}

function resetDataFilters() {
  dataLabel.value = ''
  dataEnabled.value = ''
  return searchDataPage()
}

function selectType(row: DictTypeRecord) {
  selectedType.value = row
}

function openTypeCreate() {
  typeEditorRow.value = null
  typeEditorOpen.value = true
}

function openTypeEdit(row: DictTypeRecord) {
  typeEditorRow.value = row
  typeEditorOpen.value = true
}

function onTypeSaved(row: DictTypeRecord | null) {
  if (row && selectedType.value?.id === row.id) {
    if (selectedType.value.dictType !== row.dictType) dataEditorOpen.value = false
    selectedType.value = row
  }
  void loadTypes()
}

function openDataCreate() {
  dataEditorRow.value = null
  dataEditorOpen.value = true
}

function openDataEdit(row: DictDataRecord) {
  dataEditorRow.value = row
  dataEditorOpen.value = true
}

watch(
  () => selectedType.value?.dictType ?? '',
  (dictType, previous) => {
    if (!dictType) {
      dataRows.value = []
      dataTotal.value = 0
      clearDataSelection()
      return
    }
    if (dictType !== previous) {
      dataLabel.value = ''
      dataEnabled.value = ''
      void searchDataPage()
      return
    }
    void loadDataPage()
  },
)

onMounted(() => {
  void loadTypes()
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <ProTable
      :columns="DICT_TYPE_COLUMNS"
      :rows="typeRows"
      :total="typeTotal"
      :page-index="typePageIndex"
      :page-size="typePageSize"
      :loading="typeLoading"
      :error-message="typeError"
      :selected-ids="typeSelectedIds"
      selection-unit="个"
      :row-label="typeRowLabel"
      :cell-class="dictCellClass"
      @update:page-index="changeTypePage"
      @update:page-size="changeTypePageSize"
      @toggle-row="toggleType"
      @toggle-page="toggleTypes"
      @retry="loadTypes()"
    >
      <template #filters>
        <form
          class="flex flex-wrap items-center gap-x-4 gap-y-3"
          @submit.prevent="searchTypePage()"
        >
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-dict-name"
              class="w-16 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >名称</FieldLabel
            >
            <Input
              id="filter-dict-name"
              v-model="typeName"
              name="dictName"
              placeholder="输入字典名称"
              class="h-9 w-44"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-dict-code"
              class="w-16 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >类型编码</FieldLabel
            >
            <Input
              id="filter-dict-code"
              v-model="typeCode"
              name="dictType"
              placeholder="输入类型编码"
              class="h-9 w-44"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-dict-enabled"
              class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >状态</FieldLabel
            >
            <SingleSelect
              id="filter-dict-enabled"
              :model-value="typeEnabled"
              :options="EnabledFilterOptions"
              placeholder="全部"
              size="lg"
              searchable
              clearable
              class="w-36"
              @update:model-value="setTypeEnabledFilter"
            />
          </Field>
          <div class="flex items-center gap-2">
            <Button type="submit" :disabled="typeLoading">
              <Search data-icon="inline-start" />
              查询
            </Button>
            <Button
              type="button"
              variant="ghost"
              :disabled="typeLoading"
              @click="resetTypeFilters()"
            >
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          </div>
        </form>
      </template>

      <template #actions>
        <Button v-if="can('system:dict-type:add')" type="button" @click="openTypeCreate">
          <Plus data-icon="inline-start" />
          新增类型
        </Button>
        <Button
          v-if="can('system:dict-type:remove')"
          type="button"
          variant="outline"
          :disabled="typeSelectedIds.length === 0 || typeDeleting"
          @click="openTypeDelete"
        >
          <Trash2 data-icon="inline-start" />
          删除所选
          <span v-if="typeSelectedIds.length > 0" class="text-muted-foreground">
            {{ typeSelectedIds.length }}
          </span>
        </Button>
      </template>

      <template #empty="{ errorMessage: loadError }">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Library />
            </EmptyMedia>
            <EmptyTitle>
              {{ loadError ? '这次没有加载到字典类型' : '没有符合条件的字典类型' }}
            </EmptyTitle>
            <EmptyDescription>
              {{
                loadError
                  ? '稍后重试，或调整筛选条件后再查询。'
                  : '换个关键字试试，或新增一个字典类型。'
              }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              v-if="can('system:dict-type:add') && !loadError"
              type="button"
              variant="outline"
              size="sm"
              @click="openTypeCreate"
            >
              新增类型
            </Button>
          </EmptyContent>
        </Empty>
      </template>

      <template #cell-enabled="{ row }">
        <Switch
          v-if="can('system:dict-type:edit')"
          :model-value="row.enabled"
          :disabled="typeStatusPendingIds.has(row.id)"
          :aria-label="`${row.dictName} 的状态`"
          @update:model-value="changeTypeStatus(row.id, Boolean($event))"
        />
        <Badge v-else :variant="row.enabled ? 'default' : 'secondary'" class="font-normal">
          {{ row.enabled ? '启用' : '停用' }}
        </Badge>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex min-w-32 flex-nowrap gap-1">
          <Button
            v-if="can('system:dict-data:list')"
            type="button"
            size="sm"
            :variant="selectedType?.id === row.id ? 'default' : 'outline'"
            :aria-pressed="selectedType?.id === row.id"
            @click="selectType(row)"
          >
            数据
          </Button>
          <Button
            v-if="can('system:dict-type:query')"
            type="button"
            variant="ghost"
            size="sm"
            @click="openTypeEdit(row)"
          >
            编辑
          </Button>
        </div>
      </template>
    </ProTable>

    <div v-if="selectedType" class="flex flex-col gap-3">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 class="text-base font-medium">{{ selectedType.dictName }} 的数据</h2>
        <span class="text-muted-foreground text-sm">类型编码 {{ selectedType.dictType }}</span>
      </div>

      <ProTable
        :columns="DICT_DATA_COLUMNS"
        :rows="dataRows"
        :total="dataTotal"
        :page-index="dataPageIndex"
        :page-size="dataPageSize"
        :loading="dataLoading"
        :error-message="dataError"
        :selected-ids="dataSelectedIds"
        selection-unit="条"
        :row-label="dataRowLabel"
        :cell-class="dictCellClass"
        @update:page-index="changeDataPage"
        @update:page-size="changeDataPageSize"
        @toggle-row="toggleData"
        @toggle-page="toggleDataPage"
        @retry="loadDataPage()"
      >
        <template #filters>
          <form
            class="flex flex-wrap items-center gap-x-4 gap-y-3"
            @submit.prevent="searchDataPage()"
          >
            <Field orientation="horizontal" class="w-auto">
              <FieldLabel
                for="filter-dict-label"
                class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
                >标签</FieldLabel
              >
              <Input
                id="filter-dict-label"
                v-model="dataLabel"
                name="dictLabel"
                placeholder="输入字典标签"
                class="h-9 w-44"
              />
            </Field>
            <Field orientation="horizontal" class="w-auto">
              <FieldLabel
                for="filter-dict-data-enabled"
                class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
                >状态</FieldLabel
              >
              <SingleSelect
                id="filter-dict-data-enabled"
                :model-value="dataEnabled"
                :options="EnabledFilterOptions"
                placeholder="全部"
                size="lg"
                searchable
                clearable
                class="w-36"
                @update:model-value="setDataEnabledFilter"
              />
            </Field>
            <div class="flex items-center gap-2">
              <Button type="submit" :disabled="dataLoading">
                <Search data-icon="inline-start" />
                查询
              </Button>
              <Button
                type="button"
                variant="ghost"
                :disabled="dataLoading"
                @click="resetDataFilters()"
              >
                <RotateCcw data-icon="inline-start" />
                重置
              </Button>
            </div>
          </form>
        </template>

        <template #actions>
          <Button v-if="can('system:dict-data:add')" type="button" @click="openDataCreate">
            <Plus data-icon="inline-start" />
            新增数据
          </Button>
          <Button
            v-if="can('system:dict-data:remove')"
            type="button"
            variant="outline"
            :disabled="dataSelectedIds.length === 0 || dataDeleting"
            @click="openDataDelete"
          >
            <Trash2 data-icon="inline-start" />
            删除所选
            <span v-if="dataSelectedIds.length > 0" class="text-muted-foreground">
              {{ dataSelectedIds.length }}
            </span>
          </Button>
        </template>

        <template #empty="{ errorMessage: loadError }">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Database />
              </EmptyMedia>
              <EmptyTitle>
                {{ loadError ? '这次没有加载到字典数据' : '这个类型下还没有字典数据' }}
              </EmptyTitle>
              <EmptyDescription>
                {{
                  loadError
                    ? '稍后重试，或调整筛选条件后再查询。'
                    : '换个标签试试，或新增一条字典数据。'
                }}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                v-if="can('system:dict-data:add') && !loadError"
                type="button"
                variant="outline"
                size="sm"
                @click="openDataCreate"
              >
                新增数据
              </Button>
            </EmptyContent>
          </Empty>
        </template>

        <template #cell-enabled="{ row }">
          <Switch
            v-if="can('system:dict-data:edit')"
            :model-value="row.enabled !== false"
            :disabled="dataStatusPendingIds.has(row.id)"
            :aria-label="`${row.dictLabel} 的状态`"
            @update:model-value="changeDataStatus(row.id, Boolean($event))"
          />
          <Badge
            v-else
            :variant="row.enabled !== false ? 'default' : 'secondary'"
            class="font-normal"
          >
            {{ row.enabled !== false ? '启用' : '停用' }}
          </Badge>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex min-w-16 flex-nowrap gap-1">
            <Button
              v-if="can('system:dict-data:query')"
              type="button"
              variant="ghost"
              size="sm"
              @click="openDataEdit(row)"
            >
              编辑
            </Button>
          </div>
        </template>
      </ProTable>
    </div>
  </section>

  <DictTypeEditor
    :open="typeEditorOpen"
    :dict-type="typeEditorRow"
    @update:open="typeEditorOpen = $event"
    @saved="onTypeSaved"
  />
  <DictDataEditor
    :open="dataEditorOpen"
    :item="dataEditorRow"
    :dict-type="selectedType?.dictType ?? ''"
    @update:open="dataEditorOpen = $event"
    @saved="loadDataPage()"
  />

  <AlertDialog :open="typeDeleteOpen" @update:open="setTypeDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除所选字典类型</AlertDialogTitle>
        <AlertDialogDescription>
          将删除 {{ typeSelectedIds.length }} 个类型，并删除这些类型下的字典数据。
          <span v-if="typeDeleteError" class="text-destructive mt-2 block">{{
            typeDeleteError
          }}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="typeDeleting">取消</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          :disabled="typeDeleting"
          @click="confirmTypeDelete"
        >
          <Spinner v-if="typeDeleting" />
          删除
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog :open="dataDeleteOpen" @update:open="setDataDeleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>删除所选字典数据</AlertDialogTitle>
        <AlertDialogDescription>
          将删除 {{ dataSelectedIds.length }} 条字典数据。
          <span v-if="dataDeleteError" class="text-destructive mt-2 block">{{
            dataDeleteError
          }}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="dataDeleting">取消</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          :disabled="dataDeleting"
          @click="confirmDataDelete"
        >
          <Spinner v-if="dataDeleting" />
          删除
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
