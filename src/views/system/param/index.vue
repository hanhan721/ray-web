<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { deleteParams, getParamPage, type SystemParam } from '@/api/param'
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
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ParamTypeOptions } from '@/types/enums'
import ParamEditor from './ParamEditor.vue'
import {
  PARAM_BIZ_OPTIONS,
  PARAM_PAGE_SIZES,
  pageIndexFromResponse,
  paramBizLabel,
  paramTypeLabel,
  toParamQuery,
} from './param-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const rows = shallowRef<SystemParam[]>([])
const total = shallowRef(0)
const pageIndex = shallowRef(0)
const pageSize = shallowRef<(typeof PARAM_PAGE_SIZES)[number]>(10)
const bizType = shallowRef('')
const paramType = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
const selectedIds = shallowRef<number[]>([])
const editorOpen = shallowRef(false)
const editorId = shallowRef<number | null>(null)
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
let generation = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const allSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.id)),
)

function failureMessage(errorValue: unknown, fallback: string): string {
  if (errorValue instanceof RequestError && errorValue.message) return errorValue.message
  return fallback
}

async function load() {
  const requestId = ++generation
  loading.value = true
  error.value = ''
  try {
    const page = await getParamPage(
      toParamQuery({
        pageIndex: pageIndex.value,
        pageSize: pageSize.value,
        bizType: bizType.value,
        paramType: paramType.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== generation) return
    rows.value = page.records ?? []
    total.value = page.total ?? 0
    if (typeof page.current === 'number') pageIndex.value = pageIndexFromResponse(page.current)
    if ((PARAM_PAGE_SIZES as readonly number[]).includes(page.size)) {
      pageSize.value = page.size as (typeof PARAM_PAGE_SIZES)[number]
    }
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.id === id))
  } catch (loadError) {
    if (requestId !== generation) return
    rows.value = []
    total.value = 0
    selectedIds.value = []
    error.value = failureMessage(loadError, '系统参数加载失败')
  } finally {
    if (requestId === generation) loading.value = false
  }
}

function search() {
  pageIndex.value = 0
  selectedIds.value = []
  void load()
}

function changePageSize(event: Event) {
  const value = Number(
    event.target instanceof HTMLSelectElement ? event.target.value : pageSize.value,
  )
  if ((PARAM_PAGE_SIZES as readonly number[]).includes(value)) {
    pageSize.value = value as (typeof PARAM_PAGE_SIZES)[number]
  }
  pageIndex.value = 0
  selectedIds.value = []
  void load()
}

function changePage(next: number) {
  pageIndex.value = next
  selectedIds.value = []
  void load()
}

function toggleRow(id: number, event: Event) {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = [...next]
}

function togglePage(event: Event) {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  selectedIds.value = checked ? rows.value.map((row) => row.id) : []
}

function openCreate() {
  editorId.value = null
  editorOpen.value = true
}

function openEdit(row: SystemParam) {
  editorId.value = row.id
  editorOpen.value = true
}

function openDelete() {
  deleteError.value = ''
  deleteOpen.value = true
}

function onSaved() {
  if (editorId.value === null) pageIndex.value = 0
  void load()
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteParams(selectedIds.value, { showErrorMessage: false })
    deleteOpen.value = false
    selectedIds.value = []
    await load()
    if (rows.value.length === 0 && pageIndex.value > 0) {
      pageIndex.value -= 1
      await load()
    }
  } catch (deleteFailure) {
    deleteError.value = failureMessage(deleteFailure, '删除失败，请稍后重试')
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
        <h1 class="text-lg font-medium">系统参数</h1>
        <p class="text-muted-foreground mt-1 text-sm">
          按分类和类型查找。加密参数在列表中显示为 ****。
        </p>
      </div>
      <Button v-if="can('system:param:add')" type="button" @click="openCreate">新增参数</Button>
    </header>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="search">
      <Field class="w-40">
        <FieldLabel for="filter-param-biz">分类</FieldLabel>
        <select
          id="filter-param-biz"
          v-model="bizType"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        >
          <option value="">全部</option>
          <option v-for="item in PARAM_BIZ_OPTIONS" :key="item.value" :value="String(item.value)">
            {{ item.label }}
          </option>
        </select>
      </Field>
      <Field class="w-40">
        <FieldLabel for="filter-param-type">类型</FieldLabel>
        <select
          id="filter-param-type"
          v-model="paramType"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        >
          <option value="">全部</option>
          <option v-for="item in ParamTypeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </Field>
      <Button type="submit" :disabled="loading">查询</Button>
    </form>

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-muted-foreground text-sm">
        {{ loading ? '正在加载' : `共 ${total} 个参数` }}
      </p>
      <Button
        v-if="can('system:param:remove')"
        type="button"
        variant="destructive"
        :disabled="selectedIds.length === 0 || deleting"
        @click="openDelete"
      >
        删除所选
      </Button>
    </div>

    <p v-if="error" role="alert" class="text-destructive text-sm">
      {{ error }}
      <Button type="button" variant="outline" size="sm" class="ml-2" @click="load()">重试</Button>
    </p>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">
            <input
              type="checkbox"
              aria-label="选择当前页参数"
              :checked="allSelected"
              :disabled="rows.length === 0"
              @change="togglePage"
            />
          </TableHead>
          <TableHead scope="col">参数键</TableHead>
          <TableHead scope="col">参数值</TableHead>
          <TableHead scope="col">类型</TableHead>
          <TableHead scope="col">分类</TableHead>
          <TableHead scope="col">加密</TableHead>
          <TableHead scope="col">描述</TableHead>
          <TableHead scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="!loading && rows.length === 0" :colspan="8">
          {{ error ? '这次没有加载到系统参数。' : '没有符合条件的系统参数。' }}
        </TableEmpty>
        <TableRow v-for="row in rows" :key="row.id">
          <TableCell>
            <input
              type="checkbox"
              :aria-label="`选择 ${row.paramKey}`"
              :checked="selectedIds.includes(row.id)"
              @change="toggleRow(row.id, $event)"
            />
          </TableCell>
          <TableCell>{{ row.paramKey }}</TableCell>
          <TableCell class="max-w-48 truncate">{{ row.paramValue }}</TableCell>
          <TableCell>{{ paramTypeLabel(row.paramType) }}</TableCell>
          <TableCell>{{ paramBizLabel(row.bizType) }}</TableCell>
          <TableCell>{{ row.encrypted ? '是' : '否' }}</TableCell>
          <TableCell class="max-w-48 truncate">{{ row.description }}</TableCell>
          <TableCell>
            <Button
              v-if="can('system:param:query') && can('system:param:edit')"
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

    <div class="flex flex-wrap items-center justify-between gap-3">
      <Field class="w-28">
        <FieldLabel for="param-page-size">每页</FieldLabel>
        <select
          id="param-page-size"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          :value="pageSize"
          @change="changePageSize"
        >
          <option v-for="size in PARAM_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
      </Field>
      <div class="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex <= 0 || loading"
          @click="changePage(pageIndex - 1)"
        >
          上一页
        </Button>
        <span class="text-sm">{{ pageIndex + 1 }} / {{ pageCount }}</span>
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex + 1 >= pageCount || loading"
          @click="changePage(pageIndex + 1)"
        >
          下一页
        </Button>
      </div>
    </div>

    <ParamEditor v-model:open="editorOpen" :param-id="editorId" @saved="onSaved" />

    <AlertDialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除系统参数</AlertDialogTitle>
          <AlertDialogDescription>
            将删除 {{ selectedIds.length }} 个参数。删除后按键读取会得不到原值。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p v-if="deleteError" role="alert" class="text-destructive text-sm">{{ deleteError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="deleting" @click="confirmDelete">
            <Spinner v-if="deleting" />
            {{ deleting ? '正在删除' : '删除' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
