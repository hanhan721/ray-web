<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import {
  cleanJobLogs,
  cleanJobLogsBefore,
  deleteJobs,
  getJobLogById,
  getJobLogPage,
  getJobPage,
  pauseJob,
  resumeJob,
  triggerJob,
  type ScheduleJob,
  type ScheduleJobLog,
} from '@/api/schedule-job'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import JobEditor from './JobEditor.vue'
import {
  JOB_PAGE_SIZES,
  formatDateTime,
  pageIndexFromResponse,
  retainDaysError,
  toJobLogQuery,
  toJobQuery,
} from './job-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const rows = shallowRef<ScheduleJob[]>([])
const total = shallowRef(0)
const pageIndex = shallowRef(0)
const pageSize = shallowRef<(typeof JOB_PAGE_SIZES)[number]>(10)
const jobName = shallowRef('')
const jobGroup = shallowRef('')
const beanName = shallowRef('')
const enabled = shallowRef<'' | 'true' | 'false'>('')
const appliedName = shallowRef('')
const appliedGroup = shallowRef('')
const appliedBean = shallowRef('')
const appliedEnabled = shallowRef<'' | 'true' | 'false'>('')
const loading = shallowRef(false)
const loadError = shallowRef('')
const selectedIds = shallowRef<number[]>([])
const statusId = shallowRef<number | null>(null)
const editorOpen = shallowRef(false)
const editorJob = shallowRef<ScheduleJob | null>(null)
const deleteOpen = shallowRef(false)
const deleteError = shallowRef('')
const deleting = shallowRef(false)
const triggerOpen = shallowRef(false)
const triggerJobRow = shallowRef<ScheduleJob | null>(null)
const triggerError = shallowRef('')
const triggering = shallowRef(false)
const selectedLogJob = shallowRef<ScheduleJob | null>(null)
const logRows = shallowRef<ScheduleJobLog[]>([])
const logTotal = shallowRef(0)
const logPageIndex = shallowRef(0)
const logPageSize = shallowRef<(typeof JOB_PAGE_SIZES)[number]>(10)
const logSuccess = shallowRef<'' | 'true' | 'false'>('')
const appliedLogSuccess = shallowRef<'' | 'true' | 'false'>('')
const logLoading = shallowRef(false)
const logError = shallowRef('')
const logNotice = shallowRef('')
const detailOpen = shallowRef(false)
const detail = shallowRef<ScheduleJobLog | null>(null)
const detailError = shallowRef('')
const detailLoading = shallowRef(false)
const cleanOpen = shallowRef(false)
const cleanError = shallowRef('')
const cleaning = shallowRef(false)
const retainOpen = shallowRef(false)
const retainDays = shallowRef('30')
const retainError = shallowRef('')
const retaining = shallowRef(false)
let generation = 0
let logGeneration = 0
let deleteToken = 0
let triggerToken = 0
let detailToken = 0
let cleanToken = 0
let retainToken = 0

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const logPageCount = computed(() => Math.max(1, Math.ceil(logTotal.value / logPageSize.value)))
const allSelected = computed(
  () => rows.value.length > 0 && rows.value.every((row) => selectedIds.value.includes(row.id)),
)

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestError && error.message) return error.message
  return fallback
}

async function load() {
  const requestId = ++generation
  loading.value = true
  loadError.value = ''
  try {
    const page = await getJobPage(
      toJobQuery({
        pageIndex: pageIndex.value,
        pageSize: pageSize.value,
        jobName: appliedName.value,
        jobGroup: appliedGroup.value,
        beanName: appliedBean.value,
        enabled: appliedEnabled.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== generation) return
    rows.value = page.records ?? []
    total.value = page.total ?? 0
    if (typeof page.current === 'number') pageIndex.value = pageIndexFromResponse(page.current)
    if ((JOB_PAGE_SIZES as readonly number[]).includes(page.size)) {
      pageSize.value = page.size as (typeof JOB_PAGE_SIZES)[number]
    }
    selectedIds.value = selectedIds.value.filter((id) => rows.value.some((row) => row.id === id))
    const current = rows.value.find((row) => row.id === selectedLogJob.value?.id)
    if (current) selectedLogJob.value = current
  } catch (error) {
    if (requestId !== generation) return
    rows.value = []
    total.value = 0
    selectedIds.value = []
    loadError.value = failureMessage(error, '定时任务加载失败')
  } finally {
    if (requestId === generation) loading.value = false
  }
}

async function loadLogs() {
  const job = selectedLogJob.value
  if (!job) {
    logRows.value = []
    logTotal.value = 0
    return
  }
  const requestId = ++logGeneration
  logLoading.value = true
  logError.value = ''
  try {
    const page = await getJobLogPage(
      toJobLogQuery({
        pageIndex: logPageIndex.value,
        pageSize: logPageSize.value,
        jobId: job.id,
        success: appliedLogSuccess.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== logGeneration || selectedLogJob.value?.id !== job.id) return
    logRows.value = page.records ?? []
    logTotal.value = page.total ?? 0
    if (typeof page.current === 'number') logPageIndex.value = pageIndexFromResponse(page.current)
    if ((JOB_PAGE_SIZES as readonly number[]).includes(page.size)) {
      logPageSize.value = page.size as (typeof JOB_PAGE_SIZES)[number]
    }
  } catch (error) {
    if (requestId !== logGeneration || selectedLogJob.value?.id !== job.id) return
    logRows.value = []
    logTotal.value = 0
    logError.value = failureMessage(error, '执行日志加载失败')
  } finally {
    if (requestId === logGeneration) logLoading.value = false
  }
}

function search() {
  appliedName.value = jobName.value
  appliedGroup.value = jobGroup.value
  appliedBean.value = beanName.value
  appliedEnabled.value = enabled.value
  pageIndex.value = 0
  selectedIds.value = []
  void load()
}

function changePageSize(event: Event) {
  const value = Number(
    event.target instanceof HTMLSelectElement ? event.target.value : pageSize.value,
  )
  if ((JOB_PAGE_SIZES as readonly number[]).includes(value)) {
    pageSize.value = value as (typeof JOB_PAGE_SIZES)[number]
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

function changeLogPageSize(event: Event) {
  const value = Number(
    event.target instanceof HTMLSelectElement ? event.target.value : logPageSize.value,
  )
  if ((JOB_PAGE_SIZES as readonly number[]).includes(value)) {
    logPageSize.value = value as (typeof JOB_PAGE_SIZES)[number]
  }
  logPageIndex.value = 0
  void loadLogs()
}

function changeLogPage(next: number) {
  logPageIndex.value = next
  void loadLogs()
}

function searchLogs() {
  appliedLogSuccess.value = logSuccess.value
  logNotice.value = ''
  logPageIndex.value = 0
  void loadLogs()
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
  editorJob.value = null
  editorOpen.value = true
}

function openEdit(row: ScheduleJob) {
  editorJob.value = row
  editorOpen.value = true
}

function openLogs(row: ScheduleJob) {
  logSuccess.value = ''
  appliedLogSuccess.value = ''
  logNotice.value = ''
  if (selectedLogJob.value?.id === row.id) {
    logPageIndex.value = 0
    void loadLogs()
    return
  }
  selectedLogJob.value = row
}

function openDelete() {
  if (deleting.value) return
  deleteToken += 1
  deleteError.value = ''
  deleteOpen.value = true
}

function openTrigger(row: ScheduleJob) {
  if (triggering.value) return
  triggerToken += 1
  triggerJobRow.value = row
  triggerError.value = ''
  triggerOpen.value = true
}

function onDeleteOpen(open: boolean) {
  if (open) return
  deleteOpen.value = false
  deleteToken += 1
  deleting.value = false
}

function onTriggerOpen(open: boolean) {
  if (open) return
  triggerOpen.value = false
  triggerToken += 1
  triggering.value = false
}

async function confirmDelete() {
  const token = deleteToken
  const ids = [...selectedIds.value]
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteJobs(ids, { showErrorMessage: false })
    if (token !== deleteToken) {
      await load()
      return
    }
    deleteOpen.value = false
    selectedIds.value = []
    if (selectedLogJob.value && ids.includes(selectedLogJob.value.id)) selectedLogJob.value = null
    await load()
    if (rows.value.length === 0 && pageIndex.value > 0) {
      pageIndex.value -= 1
      await load()
    }
  } catch (error) {
    const message = failureMessage(error, '删除失败，请稍后重试')
    if (token === deleteToken) deleteError.value = message
    else loadError.value = message
  } finally {
    if (token === deleteToken) deleting.value = false
  }
}

async function confirmTrigger() {
  const token = triggerToken
  const row = triggerJobRow.value
  if (!row) return
  triggering.value = true
  triggerError.value = ''
  try {
    await triggerJob(row.id, { showErrorMessage: false })
    if (token !== triggerToken) {
      if (selectedLogJob.value?.id === row.id) await loadLogs()
      return
    }
    triggerOpen.value = false
    if (selectedLogJob.value?.id === row.id) await loadLogs()
  } catch (error) {
    const message = failureMessage(error, '执行失败，请稍后重试')
    if (token === triggerToken) triggerError.value = message
    else loadError.value = message
  } finally {
    if (token === triggerToken) triggering.value = false
  }
}

async function changeStatus(row: ScheduleJob, nextEnabled: boolean) {
  statusId.value = row.id
  try {
    if (nextEnabled) await resumeJob(row.id)
    else await pauseJob(row.id)
    await load()
  } catch {
    // 请求层已经提示后端原因。开关仍绑定原状态。
  } finally {
    statusId.value = null
  }
}

async function openDetail(row: ScheduleJobLog) {
  const token = ++detailToken
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  detailOpen.value = true
  try {
    const log = await getJobLogById(row.id, { showErrorMessage: false })
    if (token !== detailToken || !detailOpen.value) return
    detail.value = log
  } catch (error) {
    if (token !== detailToken || !detailOpen.value) return
    detailError.value = failureMessage(error, '日志详情加载失败')
  } finally {
    if (token === detailToken) detailLoading.value = false
  }
}

function closeDetail() {
  detailToken += 1
  detailOpen.value = false
}

function openClean() {
  if (cleaning.value) return
  cleanToken += 1
  cleanError.value = ''
  cleanOpen.value = true
}

function openRetain() {
  if (retaining.value) return
  retainToken += 1
  retainError.value = ''
  retainOpen.value = true
}

function onCleanOpen(open: boolean) {
  if (open) return
  cleanOpen.value = false
  cleanToken += 1
  cleaning.value = false
}

function onRetainOpen(open: boolean) {
  if (open) return
  retainOpen.value = false
  retainToken += 1
  retaining.value = false
}

async function confirmClean() {
  const token = cleanToken
  cleaning.value = true
  cleanError.value = ''
  try {
    await cleanJobLogs({ showErrorMessage: false })
    if (token !== cleanToken) {
      await loadLogs()
      return
    }
    cleanOpen.value = false
    await loadLogs()
  } catch (error) {
    const message = failureMessage(error, '清空日志失败，请稍后重试')
    if (token === cleanToken) cleanError.value = message
    else logError.value = message
  } finally {
    if (token === cleanToken) cleaning.value = false
  }
}

async function confirmRetain() {
  const message = retainDaysError(retainDays.value)
  if (message) {
    retainError.value = message
    return
  }
  const token = retainToken
  retaining.value = true
  retainError.value = ''
  try {
    const count = await cleanJobLogsBefore(Number(retainDays.value), { showErrorMessage: false })
    if (token !== retainToken) {
      await loadLogs()
      logNotice.value = `已删除 ${count ?? 0} 条较早的日志`
      return
    }
    retainOpen.value = false
    await loadLogs()
    logNotice.value = `已删除 ${count ?? 0} 条较早的日志`
  } catch (error) {
    const failure = failureMessage(error, '清理日志失败，请稍后重试')
    if (token === retainToken) retainError.value = failure
    else logError.value = failure
  } finally {
    if (token === retainToken) retaining.value = false
  }
}

watch(
  () => selectedLogJob.value?.id ?? null,
  (id, previous) => {
    if (id === previous) return
    logPageIndex.value = 0
    void loadLogs()
  },
)

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="flex flex-col gap-8">
    <div class="flex flex-col gap-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-lg font-medium">定时任务</h1>
          <p class="text-muted-foreground mt-1 text-sm">
            按名称、分组和 Bean 查找。分组按完整名称匹配。停用后不会按 Cron 执行。
          </p>
        </div>
        <Button v-if="can('schedule:job:add')" type="button" @click="openCreate">新增任务</Button>
      </header>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="search">
        <Field class="w-40">
          <FieldLabel for="filter-job-name">任务名称</FieldLabel>
          <Input id="filter-job-name" v-model="jobName" name="jobName" />
        </Field>
        <Field class="w-36">
          <FieldLabel for="filter-job-group">任务分组</FieldLabel>
          <Input id="filter-job-group" v-model="jobGroup" name="jobGroup" />
        </Field>
        <Field class="w-40">
          <FieldLabel for="filter-job-bean">Bean 名称</FieldLabel>
          <Input id="filter-job-bean" v-model="beanName" name="beanName" />
        </Field>
        <Field class="w-32">
          <FieldLabel for="filter-job-enabled">状态</FieldLabel>
          <select
            id="filter-job-enabled"
            v-model="enabled"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">全部</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </select>
        </Field>
        <Button type="submit" :disabled="loading">查询</Button>
      </form>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-muted-foreground text-sm">
          {{ loading ? '正在加载' : `共 ${total} 个任务` }}
        </p>
        <Button
          v-if="can('schedule:job:remove')"
          type="button"
          variant="destructive"
          :disabled="selectedIds.length === 0 || deleting"
          @click="openDelete"
        >
          删除所选
        </Button>
      </div>

      <p v-if="loadError" role="alert" class="text-destructive text-sm">
        {{ loadError }}
        <Button type="button" variant="outline" size="sm" class="ml-2" @click="load()">重试</Button>
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              <input
                type="checkbox"
                aria-label="选择当前页任务"
                :checked="allSelected"
                :disabled="rows.length === 0"
                @change="togglePage"
              />
            </TableHead>
            <TableHead scope="col">任务名称</TableHead>
            <TableHead scope="col">分组</TableHead>
            <TableHead scope="col">调用目标</TableHead>
            <TableHead scope="col">Cron</TableHead>
            <TableHead scope="col">状态</TableHead>
            <TableHead scope="col">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="!loading && rows.length === 0" :colspan="7">
            {{ loadError ? '这次没有加载到定时任务。' : '没有符合条件的定时任务。' }}
          </TableEmpty>
          <TableRow v-for="row in rows" :key="row.id">
            <TableCell>
              <input
                type="checkbox"
                :aria-label="`选择 ${row.jobName}`"
                :checked="selectedIds.includes(row.id)"
                @change="toggleRow(row.id, $event)"
              />
            </TableCell>
            <TableCell>{{ row.jobName }}</TableCell>
            <TableCell>{{ row.jobGroup }}</TableCell>
            <TableCell class="max-w-48 truncate">{{ row.beanName }}.{{ row.methodName }}</TableCell>
            <TableCell class="max-w-40 truncate">{{ row.cronExpression }}</TableCell>
            <TableCell>
              <Switch
                v-if="can('schedule:job:status')"
                :model-value="row.enabled"
                :disabled="statusId === row.id"
                :aria-label="`${row.jobName} 的状态`"
                @update:model-value="changeStatus(row, Boolean($event))"
              />
              <span v-else>{{ row.enabled ? '启用' : '停用' }}</span>
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-2">
                <Button
                  v-if="can('schedule:job:edit')"
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="openEdit(row)"
                >
                  编辑
                </Button>
                <Button
                  v-if="can('schedule:job:trigger')"
                  type="button"
                  variant="outline"
                  size="sm"
                  :disabled="triggering"
                  @click="openTrigger(row)"
                >
                  执行
                </Button>
                <Button
                  v-if="can('schedule:job-log:list')"
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="openLogs(row)"
                >
                  日志
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <Field class="w-28">
          <FieldLabel for="job-page-size">每页</FieldLabel>
          <select
            id="job-page-size"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            :value="pageSize"
            @change="changePageSize"
          >
            <option v-for="size in JOB_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
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
    </div>

    <div v-if="selectedLogJob" class="flex flex-col gap-4">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-base font-medium">{{ selectedLogJob.jobName }} 的执行日志</h2>
          <p class="text-muted-foreground mt-1 text-sm">
            只显示这个任务的记录。清空会删除全部任务的日志。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="can('schedule:job-log:clean')"
            type="button"
            variant="outline"
            :disabled="retaining"
            @click="openRetain"
          >
            清理较早日志
          </Button>
          <Button
            v-if="can('schedule:job-log:clean')"
            type="button"
            variant="destructive"
            :disabled="cleaning"
            @click="openClean"
          >
            清空全部日志
          </Button>
        </div>
      </header>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="searchLogs">
        <Field class="w-32">
          <FieldLabel for="filter-log-success">结果</FieldLabel>
          <select
            id="filter-log-success"
            v-model="logSuccess"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          >
            <option value="">全部</option>
            <option value="true">成功</option>
            <option value="false">失败</option>
          </select>
        </Field>
        <Button type="submit" :disabled="logLoading">查询</Button>
      </form>

      <p class="text-muted-foreground text-sm">
        {{ logLoading ? '正在加载' : `共 ${logTotal} 条日志` }}
      </p>
      <p v-if="logNotice" class="text-muted-foreground text-sm">{{ logNotice }}</p>
      <p v-if="logError" role="alert" class="text-destructive text-sm">
        {{ logError }}
        <Button type="button" variant="outline" size="sm" class="ml-2" @click="loadLogs()"
          >重试</Button
        >
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">开始时间</TableHead>
            <TableHead scope="col">结果</TableHead>
            <TableHead scope="col">耗时</TableHead>
            <TableHead scope="col">说明</TableHead>
            <TableHead scope="col">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableEmpty v-if="!logLoading && logRows.length === 0" :colspan="5">
            {{ logError ? '这次没有加载到执行日志。' : '没有符合条件的执行日志。' }}
          </TableEmpty>
          <TableRow v-for="log in logRows" :key="log.id">
            <TableCell>{{ formatDateTime(log.startTime) }}</TableCell>
            <TableCell>{{ log.success ? '成功' : '失败' }}</TableCell>
            <TableCell>{{ log.costTime ?? 0 }} 毫秒</TableCell>
            <TableCell class="max-w-64 truncate">{{
              log.success ? log.result : log.errorMsg
            }}</TableCell>
            <TableCell>
              <Button
                v-if="can('schedule:job-log:query')"
                type="button"
                variant="outline"
                size="sm"
                @click="openDetail(log)"
              >
                详情
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <Field class="w-28">
          <FieldLabel for="log-page-size">每页</FieldLabel>
          <select
            id="log-page-size"
            class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
            :value="logPageSize"
            @change="changeLogPageSize"
          >
            <option v-for="size in JOB_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
        </Field>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            :disabled="logPageIndex <= 0 || logLoading"
            @click="changeLogPage(logPageIndex - 1)"
          >
            上一页
          </Button>
          <span class="text-sm">{{ logPageIndex + 1 }} / {{ logPageCount }}</span>
          <Button
            type="button"
            variant="outline"
            :disabled="logPageIndex + 1 >= logPageCount || logLoading"
            @click="changeLogPage(logPageIndex + 1)"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>

    <JobEditor
      v-model:open="editorOpen"
      :job="editorJob"
      :can-validate="can('schedule:job:query')"
      @saved="load()"
    />

    <AlertDialog :open="deleteOpen" @update:open="onDeleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除定时任务</AlertDialogTitle>
          <AlertDialogDescription
            >将删除 {{ selectedIds.length }} 个任务，并停止它们的后续调度。</AlertDialogDescription
          >
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

    <AlertDialog :open="triggerOpen" @update:open="onTriggerOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>立即执行</AlertDialogTitle>
          <AlertDialogDescription>
            将立即执行 {{ triggerJobRow?.jobName }}。停用的任务也可以手动执行。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p v-if="triggerError" role="alert" class="text-destructive text-sm">{{ triggerError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="triggering">取消</AlertDialogCancel>
          <Button type="button" :disabled="triggering" @click="confirmTrigger">
            <Spinner v-if="triggering" />
            {{ triggering ? '正在执行' : '执行' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="cleanOpen" @update:open="onCleanOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空全部日志</AlertDialogTitle>
          <AlertDialogDescription
            >将删除所有任务的执行日志，不能只清空当前任务。</AlertDialogDescription
          >
        </AlertDialogHeader>
        <p v-if="cleanError" role="alert" class="text-destructive text-sm">{{ cleanError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cleaning">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="cleaning" @click="confirmClean">
            <Spinner v-if="cleaning" />
            {{ cleaning ? '正在清空' : '清空' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="retainOpen" @update:open="onRetainOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清理较早日志</AlertDialogTitle>
          <AlertDialogDescription>将删除全部任务里早于保留天数的执行日志。</AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel for="job-retain-days">保留天数</FieldLabel>
          <Input
            id="job-retain-days"
            v-model="retainDays"
            inputmode="numeric"
            :disabled="retaining"
          />
        </Field>
        <p v-if="retainError" role="alert" class="text-destructive text-sm">{{ retainError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="retaining">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="retaining" @click="confirmRetain">
            <Spinner v-if="retaining" />
            {{ retaining ? '正在清理' : '清理' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog :open="detailOpen" @update:open="detailOpen = $event">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>执行详情</DialogTitle>
          <DialogDescription>
            {{ detail ? `${detail.beanName}.${detail.methodName}` : '正在读取这条日志' }}
          </DialogDescription>
        </DialogHeader>
        <p v-if="detailLoading" class="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          正在读取
        </p>
        <div v-else-if="detail" class="flex flex-col gap-2 text-sm">
          <p>结果 {{ detail.success ? '成功' : '失败' }}，耗时 {{ detail.costTime ?? 0 }} 毫秒</p>
          <p>开始 {{ formatDateTime(detail.startTime) }}</p>
          <p class="break-words">
            {{
              detail.success ? detail.result || '没有返回内容' : detail.errorMsg || '没有错误说明'
            }}
          </p>
        </div>
        <p v-if="detailError" role="alert" class="text-destructive text-sm">{{ detailError }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" @click="closeDetail">关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
