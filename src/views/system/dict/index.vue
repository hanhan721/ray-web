<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
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
import DictDataEditor from './DictDataEditor.vue'
import DictTypeEditor from './DictTypeEditor.vue'
import {
  DICT_PAGE_SIZES,
  pageIndexFromResponse,
  toDataQuery,
  toDictDataWrite,
  toDictTypeWrite,
  toTypeQuery,
} from './dict-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const typeRows = shallowRef<DictTypeRecord[]>([])
const typeName = shallowRef('')
const typeCode = shallowRef('')
const typeEnabled = shallowRef<'' | 'true' | 'false'>('')
const typePageIndex = shallowRef(0)
const typePageSize = shallowRef(10)
const typeTotal = shallowRef(0)
const typeLoading = shallowRef(false)
const typeError = shallowRef('')
const typeSelectedIds = shallowRef<number[]>([])
const selectedType = shallowRef<DictTypeRecord | null>(null)
const typeEditorOpen = shallowRef(false)
const typeEditorRow = shallowRef<DictTypeRecord | null>(null)
const typeDeleteOpen = shallowRef(false)
const typeDeleteError = shallowRef('')
const typeDeleting = shallowRef(false)
const typeStatusId = shallowRef<number | null>(null)
let typeGeneration = 0

const dataRows = shallowRef<DictDataRecord[]>([])
const dataLabel = shallowRef('')
const dataEnabled = shallowRef<'' | 'true' | 'false'>('')
const dataPageIndex = shallowRef(0)
const dataPageSize = shallowRef(10)
const dataTotal = shallowRef(0)
const dataLoading = shallowRef(false)
const dataError = shallowRef('')
const dataSelectedIds = shallowRef<number[]>([])
const dataEditorOpen = shallowRef(false)
const dataEditorRow = shallowRef<DictDataRecord | null>(null)
const dataDeleteOpen = shallowRef(false)
const dataDeleteError = shallowRef('')
const dataDeleting = shallowRef(false)
const dataStatusId = shallowRef<number | null>(null)
let dataGeneration = 0

const typePageCount = computed(() => Math.max(1, Math.ceil(typeTotal.value / typePageSize.value)))
const dataPageCount = computed(() => Math.max(1, Math.ceil(dataTotal.value / dataPageSize.value)))
const allTypesSelected = computed(
  () =>
    typeRows.value.length > 0 &&
    typeRows.value.every((row) => typeSelectedIds.value.includes(row.id)),
)
const allDataSelected = computed(
  () =>
    dataRows.value.length > 0 &&
    dataRows.value.every((row) => dataSelectedIds.value.includes(row.id)),
)

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestError && error.message) return error.message
  return fallback
}

async function loadTypes() {
  const requestId = ++typeGeneration
  typeLoading.value = true
  typeError.value = ''
  try {
    const page = await getDictTypePage(
      toTypeQuery({
        pageIndex: typePageIndex.value,
        pageSize: typePageSize.value,
        dictName: typeName.value,
        dictType: typeCode.value,
        enabled: typeEnabled.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== typeGeneration) return
    typeRows.value = page.records ?? []
    typeTotal.value = page.total ?? 0
    if (typeof page.current === 'number') typePageIndex.value = pageIndexFromResponse(page.current)
    if ((DICT_PAGE_SIZES as readonly number[]).includes(page.size)) typePageSize.value = page.size
    typeSelectedIds.value = typeSelectedIds.value.filter((id) =>
      typeRows.value.some((row) => row.id === id),
    )
    const current = typeRows.value.find((row) => row.id === selectedType.value?.id)
    if (current) selectedType.value = current
  } catch (error) {
    if (requestId !== typeGeneration) return
    typeRows.value = []
    typeTotal.value = 0
    typeSelectedIds.value = []
    typeError.value = failureMessage(error, '字典类型加载失败')
  } finally {
    if (requestId === typeGeneration) typeLoading.value = false
  }
}

async function loadData() {
  const dictType = selectedType.value?.dictType
  if (!dictType) {
    dataRows.value = []
    dataTotal.value = 0
    return
  }
  const requestId = ++dataGeneration
  dataLoading.value = true
  dataError.value = ''
  try {
    const page = await getDictDataPage(
      toDataQuery({
        pageIndex: dataPageIndex.value,
        pageSize: dataPageSize.value,
        dictType,
        dictLabel: dataLabel.value,
        enabled: dataEnabled.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== dataGeneration) return
    dataRows.value = page.records ?? []
    dataTotal.value = page.total ?? 0
    if (typeof page.current === 'number') dataPageIndex.value = pageIndexFromResponse(page.current)
    if ((DICT_PAGE_SIZES as readonly number[]).includes(page.size)) dataPageSize.value = page.size
    dataSelectedIds.value = dataSelectedIds.value.filter((id) =>
      dataRows.value.some((row) => row.id === id),
    )
  } catch (error) {
    if (requestId !== dataGeneration) return
    dataRows.value = []
    dataTotal.value = 0
    dataSelectedIds.value = []
    dataError.value = failureMessage(error, '字典数据加载失败')
  } finally {
    if (requestId === dataGeneration) dataLoading.value = false
  }
}

function onTypeSaved(row: DictTypeRecord | null) {
  if (row && selectedType.value?.id === row.id) {
    if (selectedType.value.dictType !== row.dictType) dataEditorOpen.value = false
    selectedType.value = row
  }
  void loadTypes()
}

function searchTypes() {
  typePageIndex.value = 0
  typeSelectedIds.value = []
  void loadTypes()
}

function changeTypePageSize(event: Event) {
  typePageSize.value = Number((event.target as HTMLSelectElement).value)
  typePageIndex.value = 0
  void loadTypes()
}

function changeTypePage(next: number) {
  typePageIndex.value = next
  void loadTypes()
}

function changeDataPageSize(event: Event) {
  dataPageSize.value = Number((event.target as HTMLSelectElement).value)
  dataPageIndex.value = 0
  void loadData()
}

function changeDataPage(next: number) {
  dataPageIndex.value = next
  void loadData()
}

function searchData() {
  dataPageIndex.value = 0
  dataSelectedIds.value = []
  void loadData()
}

watch(
  () => selectedType.value?.dictType ?? '',
  (dictType, previous) => {
    if (!dictType) {
      dataRows.value = []
      dataTotal.value = 0
      dataSelectedIds.value = []
      return
    }
    if (dictType !== previous) {
      dataPageIndex.value = 0
      dataLabel.value = ''
      dataEnabled.value = ''
      dataSelectedIds.value = []
    }
    void loadData()
  },
)

function toggleType(id: number, checked: boolean) {
  const next = new Set(typeSelectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  typeSelectedIds.value = [...next]
}

function toggleTypes(checked: boolean) {
  typeSelectedIds.value = checked ? typeRows.value.map((row) => row.id) : []
}

function toggleData(id: number, checked: boolean) {
  const next = new Set(dataSelectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  dataSelectedIds.value = [...next]
}

function toggleDataPage(checked: boolean) {
  dataSelectedIds.value = checked ? dataRows.value.map((row) => row.id) : []
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

function openTypeDelete() {
  typeDeleteError.value = ''
  typeDeleteOpen.value = true
}

function openDataCreate() {
  dataEditorRow.value = null
  dataEditorOpen.value = true
}

function openDataEdit(row: DictDataRecord) {
  dataEditorRow.value = row
  dataEditorOpen.value = true
}

function openDataDelete() {
  dataDeleteError.value = ''
  dataDeleteOpen.value = true
}

async function changeTypeStatus(row: DictTypeRecord, enabled: boolean) {
  typeStatusId.value = row.id
  try {
    await updateDictType(toDictTypeWrite(row, enabled))
    await loadTypes()
  } catch {
    // 请求层已经提示后端原因。开关仍绑定原状态。
  } finally {
    typeStatusId.value = null
  }
}

async function changeDataStatus(row: DictDataRecord, enabled: boolean) {
  dataStatusId.value = row.id
  try {
    await updateDictData(toDictDataWrite(row, enabled))
    await loadData()
  } catch {
    // 请求层已经提示后端原因。开关仍绑定原状态。
  } finally {
    dataStatusId.value = null
  }
}

async function confirmTypeDelete() {
  typeDeleting.value = true
  typeDeleteError.value = ''
  const ids = [...typeSelectedIds.value]
  try {
    await deleteDictTypes(ids, { showErrorMessage: false })
    typeDeleteOpen.value = false
    typeSelectedIds.value = []
    if (selectedType.value && ids.includes(selectedType.value.id)) selectedType.value = null
    await loadTypes()
    if (typeRows.value.length === 0 && typePageIndex.value > 0) {
      typePageIndex.value -= 1
      await loadTypes()
    }
  } catch (error) {
    typeDeleteError.value = failureMessage(error, '删除失败，请稍后重试')
  } finally {
    typeDeleting.value = false
  }
}

async function confirmDataDelete() {
  dataDeleting.value = true
  dataDeleteError.value = ''
  try {
    await deleteDictData(dataSelectedIds.value, { showErrorMessage: false })
    dataDeleteOpen.value = false
    dataSelectedIds.value = []
    await loadData()
    if (dataRows.value.length === 0 && dataPageIndex.value > 0) {
      dataPageIndex.value -= 1
      await loadData()
    }
  } catch (error) {
    dataDeleteError.value = failureMessage(error, '删除失败，请稍后重试')
  } finally {
    dataDeleting.value = false
  }
}

onMounted(() => {
  void loadTypes()
})
</script>

<template>
  <section class="flex flex-col gap-8">
    <div class="flex flex-col gap-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-lg font-medium">字典管理</h1>
          <p class="text-muted-foreground mt-1 text-sm">
            先查找字典类型，再维护它下面的数据。删除类型时会一并删除这些数据。
          </p>
        </div>
        <Button v-if="can('system:dict-type:add')" type="button" @click="openTypeCreate">
          新增类型
        </Button>
      </header>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="searchTypes">
        <Field class="w-40">
          <FieldLabel for="filter-dict-name">名称</FieldLabel>
          <Input id="filter-dict-name" v-model="typeName" name="dictName" />
        </Field>
        <Field class="w-40">
          <FieldLabel for="filter-dict-code">类型编码</FieldLabel>
          <Input id="filter-dict-code" v-model="typeCode" name="dictType" />
        </Field>
        <Field class="w-32">
          <FieldLabel for="filter-dict-enabled">状态</FieldLabel>
          <select
            id="filter-dict-enabled"
            v-model="typeEnabled"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">全部</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </Field>
        <Button type="submit" :disabled="typeLoading">查询</Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-muted-foreground text-sm">
          {{ typeLoading ? '正在加载' : `共 ${typeTotal} 个类型` }}
        </p>
        <Button
          v-if="can('system:dict-type:remove')"
          type="button"
          variant="destructive"
          :disabled="typeSelectedIds.length === 0 || typeDeleting"
          @click="openTypeDelete"
        >
          删除所选
        </Button>
      </div>

      <p v-if="typeError" role="alert" class="text-destructive text-sm">
        {{ typeError }}
        <Button type="button" variant="outline" size="sm" class="ml-2" @click="loadTypes()">
          重试
        </Button>
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <input
                type="checkbox"
                aria-label="选择当前页类型"
                :checked="allTypesSelected"
                :disabled="typeRows.length === 0"
                @change="toggleTypes(($event.target as HTMLInputElement).checked)"
              />
            </TableHead>
            <TableHead scope="col">名称</TableHead>
            <TableHead scope="col">类型编码</TableHead>
            <TableHead scope="col">状态</TableHead>
            <TableHead scope="col">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="!typeLoading && typeRows.length === 0" :colspan="5">
            {{ typeError ? '这次没有加载到字典类型。' : '没有符合条件的字典类型。' }}
          </TableEmpty>
          <TableRow v-for="row in typeRows" :key="row.id">
            <TableCell>
              <input
                type="checkbox"
                :aria-label="`选择 ${row.dictName}`"
                :checked="typeSelectedIds.includes(row.id)"
                @change="toggleType(row.id, ($event.target as HTMLInputElement).checked)"
              />
            </TableCell>
            <TableCell>{{ row.dictName }}</TableCell>
            <TableCell>{{ row.dictType }}</TableCell>
            <TableCell>
              <Switch
                v-if="can('system:dict-type:edit')"
                :model-value="row.enabled"
                :disabled="typeStatusId === row.id"
                :aria-label="`${row.dictName} 的状态`"
                @update:model-value="changeTypeStatus(row, Boolean($event))"
              />
              <span v-else>{{ row.enabled ? '启用' : '停用' }}</span>
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1">
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
                  variant="outline"
                  size="sm"
                  @click="openTypeEdit(row)"
                >
                  编辑
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel for="dict-type-page-size">每页</FieldLabel>
          <select
            id="dict-type-page-size"
            class="border-input bg-input/20 h-7 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            :value="typePageSize"
            @change="changeTypePageSize"
          >
            <option v-for="size in DICT_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
        </Field>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            :disabled="typePageIndex <= 0 || typeLoading"
            @click="changeTypePage(typePageIndex - 1)"
          >
            上一页
          </Button>
          <span class="text-sm">{{ typePageIndex + 1 }} / {{ typePageCount }}</span>
          <Button
            type="button"
            variant="outline"
            :disabled="typePageIndex + 1 >= typePageCount || typeLoading"
            @click="changeTypePage(typePageIndex + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

    <div v-if="selectedType" class="flex flex-col gap-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-base font-medium">{{ selectedType.dictName }} 的数据</h2>
          <p class="text-muted-foreground mt-1 text-sm">类型编码 {{ selectedType.dictType }}</p>
        </div>
        <Button v-if="can('system:dict-data:add')" type="button" @click="openDataCreate">
          新增数据
        </Button>
      </header>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="searchData">
        <Field class="w-40">
          <FieldLabel for="filter-dict-label">标签</FieldLabel>
          <Input id="filter-dict-label" v-model="dataLabel" name="dictLabel" />
        </Field>
        <Field class="w-32">
          <FieldLabel for="filter-dict-data-enabled">状态</FieldLabel>
          <select
            id="filter-dict-data-enabled"
            v-model="dataEnabled"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">全部</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </Field>
        <Button type="submit" :disabled="dataLoading">查询</Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-muted-foreground text-sm">
          {{ dataLoading ? '正在加载' : `共 ${dataTotal} 条数据` }}
        </p>
        <Button
          v-if="can('system:dict-data:remove')"
          type="button"
          variant="destructive"
          :disabled="dataSelectedIds.length === 0 || dataDeleting"
          @click="openDataDelete"
        >
          删除所选
        </Button>
      </div>

      <p v-if="dataError" role="alert" class="text-destructive text-sm">
        {{ dataError }}
        <Button type="button" variant="outline" size="sm" class="ml-2" @click="loadData()">
          重试
        </Button>
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <input
                type="checkbox"
                aria-label="选择当前页数据"
                :checked="allDataSelected"
                :disabled="dataRows.length === 0"
                @change="toggleDataPage(($event.target as HTMLInputElement).checked)"
              />
            </TableHead>
            <TableHead scope="col">标签</TableHead>
            <TableHead scope="col">字典值</TableHead>
            <TableHead scope="col">顺序</TableHead>
            <TableHead scope="col">状态</TableHead>
            <TableHead scope="col">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="!dataLoading && dataRows.length === 0" :colspan="6">
            {{ dataError ? '这次没有加载到字典数据。' : '这个类型下没有符合条件的数据。' }}
          </TableEmpty>
          <TableRow v-for="row in dataRows" :key="row.id">
            <TableCell>
              <input
                type="checkbox"
                :aria-label="`选择 ${row.dictLabel}`"
                :checked="dataSelectedIds.includes(row.id)"
                @change="toggleData(row.id, ($event.target as HTMLInputElement).checked)"
              />
            </TableCell>
            <TableCell>{{ row.dictLabel }}</TableCell>
            <TableCell>{{ row.dictValue }}</TableCell>
            <TableCell>{{ row.sort }}</TableCell>
            <TableCell>
              <Switch
                v-if="can('system:dict-data:edit')"
                :model-value="row.enabled !== false"
                :disabled="dataStatusId === row.id"
                :aria-label="`${row.dictLabel} 的状态`"
                @update:model-value="changeDataStatus(row, Boolean($event))"
              />
              <span v-else>{{ row.enabled !== false ? '启用' : '停用' }}</span>
            </TableCell>
            <TableCell>
              <Button
                v-if="can('system:dict-data:query')"
                type="button"
                variant="outline"
                size="sm"
                @click="openDataEdit(row)"
              >
                编辑
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <Field orientation="horizontal" class="w-auto">
          <FieldLabel for="dict-data-page-size">每页</FieldLabel>
          <select
            id="dict-data-page-size"
            class="border-input bg-input/20 h-7 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            :value="dataPageSize"
            @change="changeDataPageSize"
          >
            <option v-for="size in DICT_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
        </Field>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            :disabled="dataPageIndex <= 0 || dataLoading"
            @click="changeDataPage(dataPageIndex - 1)"
          >
            上一页
          </Button>
          <span class="text-sm">{{ dataPageIndex + 1 }} / {{ dataPageCount }}</span>
          <Button
            type="button"
            variant="outline"
            :disabled="dataPageIndex + 1 >= dataPageCount || dataLoading"
            @click="changeDataPage(dataPageIndex + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

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
      @saved="loadData()"
    />

    <AlertDialog :open="typeDeleteOpen" @update:open="typeDeleteOpen = $event">
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

    <AlertDialog :open="dataDeleteOpen" @update:open="dataDeleteOpen = $event">
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
  </section>
</template>
