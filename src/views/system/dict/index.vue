<script setup lang="ts">
import RaySearchForm from '@/components/common/RaySearchForm.vue'
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
import RayTable from '@/components/common/RayTable.vue'
import RaySelect from '@/components/common/RaySelect.vue'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
const dataDrawerOpen = shallowRef(false)
const singleTypeDelete = shallowRef<DictTypeRecord | null>(null)
const typeHasFilters = shallowRef(false)
const dataHasFilters = shallowRef(false)
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
    const targetIds = singleTypeDelete.value ? [singleTypeDelete.value.id] : ids
    await deleteDictTypes(targetIds)
    if (selectedType.value && targetIds.includes(selectedType.value.id)) {
      selectedType.value = null
      dataDrawerOpen.value = false
    }
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
  deleteRows: (ids) => deleteDictData(ids),
  selectedIds: dataSelectedIds,
  clearSelection: clearDataSelection,
  rows: dataRows,
  pageIndex: dataPageIndex,
  changePage: changeDataPage,
  load: loadDataPage,
})

const { pendingIds: typeStatusPendingIds, change: changeTypeStatus } = useRowStatus({
  update: (id, enabled) => {
    const row =
      typeRows.value.find((item) => item.id === id) ??
      (selectedType.value?.id === id ? selectedType.value : undefined)
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
  return searchTypes()
}

function searchTypes() {
  typeHasFilters.value = Boolean(
    typeName.value.trim() || typeCode.value.trim() || typeEnabled.value,
  )
  return searchTypePage()
}

function searchData() {
  dataHasFilters.value = Boolean(dataLabel.value.trim() || dataEnabled.value)
  return searchDataPage()
}

function resetDataFilters() {
  dataLabel.value = ''
  dataEnabled.value = ''
  return searchData()
}

function requestTypeDelete(row: DictTypeRecord | null = null) {
  singleTypeDelete.value = row
  openTypeDelete()
}

function selectType(row: DictTypeRecord) {
  if (selectedType.value?.id !== row.id) {
    dataEditorOpen.value = false
    dataRows.value = []
    dataTotal.value = 0
    clearDataSelection()
  }
  if (selectedType.value?.id === row.id) {
    dataLabel.value = ''
    dataEnabled.value = ''
    dataHasFilters.value = false
    void searchDataPage()
  }
  selectedType.value = row
  dataDrawerOpen.value = true
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
      void loadDataPage()
      return
    }
    if (dictType !== previous) {
      dataLabel.value = ''
      dataEnabled.value = ''
      dataHasFilters.value = false
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
  <section class="flex flex-col gap-5">
    <RayTable
      fill
      :columns="DICT_TYPE_COLUMNS"
      :rows="typeRows"
      :total="typeTotal"
      :page-index="typePageIndex"
      :page-size="typePageSize"
      :loading="typeLoading"
      :error-message="typeError"
      :selectable="can('system:dict-type:remove')"
      :selected-ids="typeSelectedIds"
      :row-label="typeRowLabel"
      :cell-class="dictCellClass"
      selection-unit="个"
      @update:page-index="changeTypePage"
      @update:page-size="changeTypePageSize"
      @toggle-row="toggleType"
      @toggle-page="toggleTypes"
      @retry="loadTypes()"
    >
      <template #filters>
        <RaySearchForm @submit="searchTypes()">
          <Field orientation="horizontal">
            <FieldLabel for="filter-dict-name">类型名称</FieldLabel>
            <Input id="filter-dict-name" v-model="typeName" placeholder="搜索类型名称" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="filter-dict-code">类型编码</FieldLabel>
            <Input id="filter-dict-code" v-model="typeCode" placeholder="搜索类型编码" />
          </Field>
          <Field orientation="horizontal" class="ray-search-field-short">
            <FieldLabel for="filter-dict-enabled">状态</FieldLabel>
            <RaySelect
              id="filter-dict-enabled"
              :model-value="typeEnabled || null"
              :options="EnabledFilterOptions"
              placeholder="全部状态"
              size="lg"
              clearable
              @update:model-value="setTypeEnabledFilter"
            />
          </Field>
          <template #actions>
            <Button type="submit" :disabled="typeLoading"
              ><Search data-icon="inline-start" />查询</Button
            >
            <Button
              type="button"
              variant="ghost"
              :disabled="typeLoading"
              @click="resetTypeFilters()"
              ><RotateCcw data-icon="inline-start" />重置</Button
            >
          </template>
        </RaySearchForm>
      </template>

      <template #actions>
        <Button v-if="can('system:dict-type:add')" @click="openTypeCreate"
          ><Plus data-icon="inline-start" />新增类型</Button
        >
        <Button
          v-if="can('system:dict-type:remove')"
          variant="outline"
          :disabled="!typeSelectedIds.length || typeDeleting"
          @click="requestTypeDelete()"
        >
          <Trash2 data-icon="inline-start" />删除所选<span v-if="typeSelectedIds.length">{{
            typeSelectedIds.length
          }}</span>
        </Button>
      </template>
      <template #empty="{ errorMessage: loadError }">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Library /></EmptyMedia>
            <EmptyTitle>{{
              loadError
                ? '字典类型加载失败'
                : typeHasFilters
                  ? '没有符合条件的类型'
                  : '还没有字典类型'
            }}</EmptyTitle>
            <EmptyDescription>{{
              loadError
                ? '请重试加载。'
                : typeHasFilters
                  ? '调整筛选条件后重试。'
                  : '新增类型，开始管理字典。'
            }}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent v-if="can('system:dict-type:add') && !loadError && !typeHasFilters">
            <Button variant="outline" size="sm" @click="openTypeCreate">新增类型</Button>
          </EmptyContent>
        </Empty>
      </template>
      <template #cell-enabled="{ row }">
        <Switch
          v-if="can('system:dict-type:edit')"
          :model-value="row.enabled"
          :disabled="typeStatusPendingIds.has(row.id)"
          :aria-label="row.dictName + ' 的状态'"
          @update:model-value="changeTypeStatus(row.id, Boolean($event))"
        />
        <Badge v-else :variant="row.enabled ? 'outline' : 'secondary'">{{
          row.enabled ? '启用' : '停用'
        }}</Badge>
      </template>
      <template #cell-actions="{ row }">
        <div class="flex min-w-48 flex-nowrap items-center gap-1">
          <Button
            v-if="can('system:dict-data:list')"
            variant="outline"
            size="sm"
            @click="selectType(row)"
            >字段数据</Button
          >
          <Button
            v-if="can('system:dict-type:query')"
            variant="ghost"
            size="sm"
            @click="openTypeEdit(row)"
            >编辑</Button
          >
          <Button
            v-if="can('system:dict-type:remove')"
            variant="ghost"
            size="sm"
            @click="requestTypeDelete(row)"
            >删除</Button
          >
        </div>
      </template>
    </RayTable>
  </section>

  <Dialog :open="dataDrawerOpen" @update:open="dataDrawerOpen = $event">
    <DialogContent
      class="bg-background fixed inset-y-0 right-0 left-auto top-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 text-sm data-open:zoom-in-100 data-closed:zoom-out-100 data-open:slide-in-from-right data-closed:slide-out-to-right sm:max-w-[min(56rem,90vw)]"
    >
      <DialogHeader class="shrink-0 border-b px-6 py-5 pr-14 text-left">
        <DialogTitle class="text-lg font-semibold">编辑字典值</DialogTitle>
        <DialogDescription class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="text-foreground font-medium">{{ selectedType?.dictName }}</span>
          <span aria-hidden="true">·</span>
          <span class="font-mono">{{ selectedType?.dictType }}</span>
        </DialogDescription>
      </DialogHeader>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
        <RayTable
          fill
          class="min-h-0 flex-1"
          :columns="DICT_DATA_COLUMNS"
          :rows="dataRows"
          :total="dataTotal"
          :page-index="dataPageIndex"
          :page-size="dataPageSize"
          :loading="dataLoading"
          :error-message="dataError"
          :selectable="can('system:dict-data:remove')"
          :selected-ids="dataSelectedIds"
          :row-label="dataRowLabel"
          :cell-class="dictCellClass"
          selection-unit="条"
          @update:page-index="changeDataPage"
          @update:page-size="changeDataPageSize"
          @toggle-row="toggleData"
          @toggle-page="toggleDataPage"
          @retry="loadDataPage()"
        >
          <template #filters>
            <RaySearchForm @submit="searchData()">
              <Field orientation="horizontal">
                <FieldLabel for="filter-dict-label">标签</FieldLabel>
                <Input id="filter-dict-label" v-model="dataLabel" placeholder="搜索字典标签" />
              </Field>
              <Field orientation="horizontal" class="ray-search-field-short">
                <FieldLabel for="filter-dict-data-enabled">状态</FieldLabel>
                <RaySelect
                  id="filter-dict-data-enabled"
                  :model-value="dataEnabled || null"
                  :options="EnabledFilterOptions"
                  placeholder="全部状态"
                  size="lg"
                  clearable
                  @update:model-value="setDataEnabledFilter"
                />
              </Field>
              <template #actions>
                <Button type="submit" variant="outline" :disabled="dataLoading"
                  ><Search data-icon="inline-start" />查询</Button
                >
                <Button
                  type="button"
                  variant="ghost"
                  :disabled="dataLoading"
                  @click="resetDataFilters()"
                  >重置</Button
                >
              </template>
            </RaySearchForm>
          </template>

          <template #actions>
            <Button
              v-if="can('system:dict-data:remove')"
              type="button"
              variant="outline"
              :disabled="!dataSelectedIds.length || dataDeleting"
              @click="openDataDelete"
            >
              <Trash2 data-icon="inline-start" />
              删除所选
            </Button>
            <Button v-if="can('system:dict-data:add')" type="button" @click="openDataCreate">
              <Plus data-icon="inline-start" />
              新增字典项
            </Button>
          </template>

          <template #empty="{ errorMessage: loadError }">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Database /></EmptyMedia>
                <EmptyTitle>{{
                  loadError
                    ? '字典项加载失败'
                    : dataHasFilters
                      ? '没有符合条件的字典项'
                      : '这个类型下还没有字典项'
                }}</EmptyTitle>
                <EmptyDescription>{{
                  loadError
                    ? '请重试加载。'
                    : dataHasFilters
                      ? '调整筛选条件后重试。'
                      : '新增字典项，开始维护这个类型。'
                }}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent v-if="can('system:dict-data:add') && !loadError && !dataHasFilters">
                <Button variant="outline" size="sm" @click="openDataCreate">新增字典项</Button>
              </EmptyContent>
            </Empty>
          </template>

          <template #cell-dictLabel="{ row }">
            <span :class="[dictCellClass('dictLabel'), 'max-w-56']" :title="row.dictLabel">
              {{ row.dictLabel }}
            </span>
          </template>
          <template #cell-dictValue="{ row }">
            <span
              :class="[dictCellClass('dictValue'), 'max-w-48 font-mono']"
              :title="row.dictValue"
            >
              {{ row.dictValue }}
            </span>
          </template>
          <template #cell-sort="{ row }">
            <span class="tabular-nums">{{ row.sort ?? 0 }}</span>
          </template>
          <template #cell-enabled="{ row }">
            <Switch
              v-if="can('system:dict-data:edit')"
              :model-value="row.enabled !== false"
              :disabled="dataStatusPendingIds.has(row.id)"
              :aria-label="row.dictLabel + ' 的状态'"
              @update:model-value="changeDataStatus(row.id, Boolean($event))"
            />
            <Badge v-else :variant="row.enabled !== false ? 'outline' : 'secondary'">{{
              row.enabled !== false ? '启用' : '停用'
            }}</Badge>
          </template>
          <template #cell-actions="{ row }">
            <Button
              v-if="can('system:dict-data:query')"
              variant="ghost"
              size="sm"
              @click="openDataEdit(row)"
              >编辑</Button
            >
          </template>
        </RayTable>
      </div>
    </DialogContent>
  </Dialog>

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
        <AlertDialogTitle>{{
          singleTypeDelete ? '删除字典类型' : '删除所选字典类型'
        }}</AlertDialogTitle>
        <AlertDialogDescription>
          将删除
          {{
            singleTypeDelete
              ? '“' + singleTypeDelete.dictName + '”'
              : typeSelectedIds.length + ' 个类型'
          }}，并删除这些类型下的字典项。
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
        <AlertDialogTitle>删除所选字典项</AlertDialogTitle>
        <AlertDialogDescription>
          将删除 {{ dataSelectedIds.length }} 条字典项。
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
