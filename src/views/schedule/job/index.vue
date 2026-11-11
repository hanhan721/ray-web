<script setup lang="ts">
import { CalendarClock, Plus, RotateCcw, Search, ScrollText, Trash2 } from '@lucide/vue'
import { onMounted, shallowRef, watch } from 'vue'
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
import { EnabledFilterOptions } from '@/types/enums'
import { useSessionStore } from '@/stores/session'
import { useDeleteMany } from '@/composables/useDeleteMany'
import { usePagedList } from '@/composables/usePagedList'
import { useRowStatus } from '@/composables/useRowStatus'
import { QUIET, failureMessage } from '@/utils/failure'
import FormDialog from '@/components/common/FormDialog.vue'
import ProTable from '@/components/common/ProTable.vue'
import SingleSelect from '@/components/common/SingleSelect.vue'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import JobEditor from './JobEditor.vue'
import {
  JOB_DATA_COLUMNS,
  JOB_LOG_COLUMNS,
  JOB_LOG_RESULT_OPTIONS,
  jobCellClass,
  jobLogCellClass,
} from './job-table'
import { formatDateTime, retainDaysError, toJobLogQuery, toJobQuery } from './job-form'

const session = useSessionStore()
const can = (code: string) => session.can(code)

const jobName = shallowRef('')
const jobGroup = shallowRef('')
const beanName = shallowRef('')
const enabled = shallowRef<'' | 'true' | 'false'>('')
const appliedName = shallowRef('')
const appliedGroup = shallowRef('')
const appliedBean = shallowRef('')
const appliedEnabled = shallowRef<'' | 'true' | 'false'>('')

const editorOpen = shallowRef(false)
const editorJob = shallowRef<ScheduleJob | null>(null)

const selectedLogJob = shallowRef<ScheduleJob | null>(null)
const logSuccess = shallowRef<'' | 'true' | 'false'>('')
const appliedLogSuccess = shallowRef<'' | 'true' | 'false'>('')
const logNotice = shallowRef('')

const triggerOpen = shallowRef(false)
const triggerJobRow = shallowRef<ScheduleJob | null>(null)
const triggerError = shallowRef('')
const triggering = shallowRef(false)
const detailOpen = shallowRef(false)
const detail = shallowRef<ScheduleJobLog | null>(null)
const detailTarget = shallowRef<ScheduleJobLog | null>(null)
const detailError = shallowRef('')
const detailLoading = shallowRef(false)
const cleanOpen = shallowRef(false)
const cleanError = shallowRef('')
const cleaning = shallowRef(false)
const retainOpen = shallowRef(false)
const retainDays = shallowRef('30')
const retainError = shallowRef('')
const retaining = shallowRef(false)
let triggerToken = 0
let detailToken = 0
let cleanToken = 0
let retainToken = 0

function emptyLogPage<T>(pageSize: number): IPage<T> {
  return { current: 1, size: pageSize, total: 0, pages: 0, records: [] }
}

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
  setRowEnabled,
} = usePagedList<ScheduleJob>({
  fetchPage: (input) =>
    getJobPage(
      toJobQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        jobName: appliedName.value,
        jobGroup: appliedGroup.value,
        beanName: appliedBean.value,
        enabled: appliedEnabled.value,
      }),
      QUIET,
    ),
  fallbackMessage: '定时任务加载失败',
})

const {
  open: deleteOpen,
  deleting,
  error: deleteError,
  openDialog: openDelete,
  setOpen: setDeleteOpen,
  confirm: confirmDelete,
} = useDeleteMany<ScheduleJob>({
  deleteRows: async (ids) => {
    await deleteJobs(ids, QUIET)
    if (selectedLogJob.value && ids.includes(selectedLogJob.value.id)) {
      selectedLogJob.value = null
    }
  },
  selectedIds,
  clearSelection,
  rows,
  pageIndex,
  changePage,
  load,
  fallbackMessage: '删除失败，请稍后重试',
})

const { pendingIds: statusPendingIds, change: changeStatus } = useRowStatus({
  update: (id, nextEnabled) => (nextEnabled ? resumeJob(id, QUIET) : pauseJob(id, QUIET)),
  setRowEnabled,
})

const {
  rows: logRows,
  total: logTotal,
  pageIndex: logPageIndex,
  pageSize: logPageSize,
  loading: logLoading,
  errorMessage: logError,
  load: loadLogPage,
  search: searchLogPage,
  changePage: changeLogPage,
  changePageSize: changeLogPageSize,
} = usePagedList<ScheduleJobLog>({
  fetchPage: (input) => {
    const job = selectedLogJob.value
    if (!job) return Promise.resolve(emptyLogPage<ScheduleJobLog>(input.pageSize))
    return getJobLogPage(
      toJobLogQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        jobId: job.id,
        success: appliedLogSuccess.value,
      }),
      QUIET,
    )
  },
  fallbackMessage: '执行日志加载失败',
})

const rowLabel = (row: ScheduleJob) => row.jobName
const logRowLabel = (row: ScheduleJobLog) => formatDateTime(row.startTime) || `日志 ${row.id}`

function setEnabledFilter(value: unknown) {
  enabled.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function setLogSuccessFilter(value: unknown) {
  logSuccess.value = value === 'true' ? 'true' : value === 'false' ? 'false' : ''
}

function searchJobs() {
  appliedName.value = jobName.value
  appliedGroup.value = jobGroup.value
  appliedBean.value = beanName.value
  appliedEnabled.value = enabled.value
  void search()
}

function resetJobFilters() {
  jobName.value = ''
  jobGroup.value = ''
  beanName.value = ''
  enabled.value = ''
  appliedName.value = ''
  appliedGroup.value = ''
  appliedBean.value = ''
  appliedEnabled.value = ''
  void search()
}

function searchLogs() {
  appliedLogSuccess.value = logSuccess.value
  logNotice.value = ''
  void searchLogPage()
}

function resetLogFilters() {
  logSuccess.value = ''
  appliedLogSuccess.value = ''
  logNotice.value = ''
  void searchLogPage()
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
  if (selectedLogJob.value?.id === row.id) {
    void loadLogPage()
    return
  }
  selectedLogJob.value = row
}

function openTrigger(row: ScheduleJob) {
  if (triggering.value) return
  triggerToken += 1
  triggerJobRow.value = row
  triggerError.value = ''
  triggerOpen.value = true
}

function onTriggerOpen(open: boolean) {
  if (open) return
  triggerOpen.value = false
  triggerToken += 1
  triggering.value = false
}

async function confirmTrigger() {
  const token = triggerToken
  const row = triggerJobRow.value
  if (!row) return
  triggering.value = true
  triggerError.value = ''
  try {
    await triggerJob(row.id, QUIET)
    if (token !== triggerToken) {
      if (selectedLogJob.value?.id === row.id) await loadLogPage()
      return
    }
    triggerOpen.value = false
    if (selectedLogJob.value?.id === row.id) await loadLogPage()
  } catch (error) {
    const message = failureMessage(error, '执行失败，请稍后重试')
    if (token === triggerToken) triggerError.value = message
  } finally {
    if (token === triggerToken) triggering.value = false
  }
}

async function openDetail(row: ScheduleJobLog) {
  const token = ++detailToken
  detailTarget.value = row
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  detailOpen.value = true
  try {
    const log = await getJobLogById(row.id, QUIET)
    if (token !== detailToken || !detailOpen.value) return
    detail.value = log
  } catch (error) {
    if (token !== detailToken || !detailOpen.value) return
    detailError.value = failureMessage(error, '日志详情加载失败')
  } finally {
    if (token === detailToken) detailLoading.value = false
  }
}

function onDetailOpen(open: boolean) {
  if (open) return
  closeDetail()
}

function closeDetail() {
  detailToken += 1
  detailOpen.value = false
}

function retryDetail() {
  const row = detailTarget.value
  if (row) void openDetail(row)
}

function openClean() {
  if (cleaning.value) return
  cleanToken += 1
  cleanError.value = ''
  cleanOpen.value = true
}

function onCleanOpen(open: boolean) {
  if (open) return
  cleanOpen.value = false
  cleanToken += 1
  cleaning.value = false
}

async function confirmClean() {
  const token = cleanToken
  cleaning.value = true
  cleanError.value = ''
  try {
    await cleanJobLogs(QUIET)
    if (token !== cleanToken) {
      await loadLogPage()
      return
    }
    cleanOpen.value = false
    await loadLogPage()
  } catch (error) {
    const message = failureMessage(error, '清空日志失败，请稍后重试')
    if (token === cleanToken) cleanError.value = message
  } finally {
    if (token === cleanToken) cleaning.value = false
  }
}

function openRetain() {
  if (retaining.value) return
  retainToken += 1
  retainError.value = ''
  retainOpen.value = true
}

function onRetainOpen(open: boolean) {
  if (open) return
  retainOpen.value = false
  retainToken += 1
  retaining.value = false
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
    const count = await cleanJobLogsBefore(Number(retainDays.value), QUIET)
    if (token !== retainToken) {
      await loadLogPage()
      logNotice.value = `已删除 ${count ?? 0} 条较早的日志`
      return
    }
    retainOpen.value = false
    await loadLogPage()
    logNotice.value = `已删除 ${count ?? 0} 条较早的日志`
  } catch (error) {
    const failure = failureMessage(error, '清理日志失败，请稍后重试')
    if (token === retainToken) retainError.value = failure
  } finally {
    if (token === retainToken) retaining.value = false
  }
}

watch(rows, (items) => {
  const current = selectedLogJob.value
  if (!current) return
  const next = items.find((row) => row.id === current.id)
  if (next) selectedLogJob.value = next
})

watch(
  () => selectedLogJob.value?.id ?? null,
  (id, previous) => {
    if (id === previous) return
    logSuccess.value = ''
    appliedLogSuccess.value = ''
    logNotice.value = ''
    if (!id) {
      logRows.value = []
      logTotal.value = 0
      return
    }
    void searchLogPage()
  },
)

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="flex flex-col gap-6">
    <ProTable
      :columns="JOB_DATA_COLUMNS"
      :rows="rows"
      :total="total"
      :page-index="pageIndex"
      :page-size="pageSize"
      :loading="loading"
      :error-message="errorMessage"
      :selected-ids="selectedIds"
      selection-unit="个"
      :row-label="rowLabel"
      :cell-class="jobCellClass"
      @update:page-index="changePage"
      @update:page-size="changePageSize"
      @toggle-row="toggleSelected"
      @toggle-page="togglePage"
      @retry="load()"
    >
      <template #filters>
        <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="searchJobs()">
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-job-name"
              class="w-20 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >任务名称</FieldLabel
            >
            <Input
              id="filter-job-name"
              v-model="jobName"
              name="jobName"
              placeholder="输入任务名称"
              class="h-9 w-40"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-job-group"
              class="w-20 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >任务分组</FieldLabel
            >
            <Input
              id="filter-job-group"
              v-model="jobGroup"
              name="jobGroup"
              placeholder="输入任务分组"
              class="h-9 w-32"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-job-bean"
              class="w-20 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >Bean 名称</FieldLabel
            >
            <Input
              id="filter-job-bean"
              v-model="beanName"
              name="beanName"
              placeholder="输入 Bean 名称"
              class="h-9 w-40"
            />
          </Field>
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-job-enabled"
              class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >状态</FieldLabel
            >
            <SingleSelect
              id="filter-job-enabled"
              :model-value="enabled"
              :options="EnabledFilterOptions"
              placeholder="全部"
              size="lg"
              searchable
              clearable
              class="w-36"
              @update:model-value="setEnabledFilter"
            />
          </Field>
          <div class="flex items-center gap-2">
            <Button type="submit" :disabled="loading">
              <Search data-icon="inline-start" />
              查询
            </Button>
            <Button type="button" variant="ghost" :disabled="loading" @click="resetJobFilters()">
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          </div>
        </form>
      </template>

      <template #actions>
        <Button v-if="can('schedule:job:add')" type="button" @click="openCreate">
          <Plus data-icon="inline-start" />
          新增任务
        </Button>
        <Button
          v-if="can('schedule:job:remove')"
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
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>
              {{ loadError ? '这次没有加载到定时任务' : '没有符合条件的定时任务' }}
            </EmptyTitle>
            <EmptyDescription>
              {{
                loadError
                  ? '稍后重试，或调整筛选条件后再查询。'
                  : '换个关键字试试，或新增一个任务。'
              }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              v-if="can('schedule:job:add') && !loadError"
              type="button"
              variant="outline"
              size="sm"
              @click="openCreate"
            >
              新增任务
            </Button>
          </EmptyContent>
        </Empty>
      </template>

      <template #cell-target="{ row }">
        <span :class="jobCellClass('target')" :title="`${row.beanName}.${row.methodName}`">
          {{ row.beanName }}.{{ row.methodName }}
        </span>
      </template>

      <template #cell-cronExpression="{ row }">
        <span :class="jobCellClass('cronExpression')" :title="row.cronExpression">
          {{ row.cronExpression }}
        </span>
      </template>

      <template #cell-enabled="{ row }">
        <Switch
          v-if="can('schedule:job:status')"
          :model-value="row.enabled"
          :disabled="statusPendingIds.has(row.id)"
          :aria-label="`${row.jobName} 的状态`"
          @update:model-value="changeStatus(row.id, Boolean($event))"
        />
        <Badge v-else :variant="row.enabled ? 'default' : 'secondary'" class="font-normal">
          {{ row.enabled ? '启用' : '停用' }}
        </Badge>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex min-w-40 flex-nowrap gap-1">
          <Button
            v-if="can('schedule:job:edit')"
            type="button"
            variant="ghost"
            size="sm"
            @click="openEdit(row)"
          >
            编辑
          </Button>
          <Button
            v-if="can('schedule:job:trigger')"
            type="button"
            variant="ghost"
            size="sm"
            :disabled="triggering"
            @click="openTrigger(row)"
          >
            执行
          </Button>
          <Button
            v-if="can('schedule:job-log:list')"
            type="button"
            variant="ghost"
            size="sm"
            @click="openLogs(row)"
          >
            日志
          </Button>
        </div>
      </template>
    </ProTable>

    <ProTable
      v-if="selectedLogJob"
      :columns="JOB_LOG_COLUMNS"
      :rows="logRows"
      :total="logTotal"
      :page-index="logPageIndex"
      :page-size="logPageSize"
      :loading="logLoading"
      :error-message="logError"
      :selectable="false"
      :row-label="logRowLabel"
      :cell-class="jobLogCellClass"
      @update:page-index="changeLogPage"
      @update:page-size="changeLogPageSize"
      @retry="loadLogPage()"
    >
      <template #caption>
        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ selectedLogJob.jobName }} 的执行日志</span>
          <span class="text-muted-foreground text-xs">
            只显示这个任务的记录；清空会删除全部任务的日志。
          </span>
        </div>
      </template>

      <template #filters>
        <form class="flex flex-wrap items-center gap-x-4 gap-y-3" @submit.prevent="searchLogs()">
          <Field orientation="horizontal" class="w-auto">
            <FieldLabel
              for="filter-log-success"
              class="w-8 shrink-0 whitespace-nowrap font-normal text-muted-foreground"
              >结果</FieldLabel
            >
            <SingleSelect
              id="filter-log-success"
              :model-value="logSuccess"
              :options="JOB_LOG_RESULT_OPTIONS"
              placeholder="全部"
              size="lg"
              searchable
              clearable
              class="w-36"
              @update:model-value="setLogSuccessFilter"
            />
          </Field>
          <div class="flex items-center gap-2">
            <Button type="submit" :disabled="logLoading">
              <Search data-icon="inline-start" />
              查询
            </Button>
            <Button type="button" variant="ghost" :disabled="logLoading" @click="resetLogFilters()">
              <RotateCcw data-icon="inline-start" />
              重置
            </Button>
          </div>
          <p v-if="logNotice" class="text-muted-foreground w-full text-sm">{{ logNotice }}</p>
        </form>
      </template>

      <template #actions>
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
      </template>

      <template #empty="{ errorMessage: loadError }">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ScrollText />
            </EmptyMedia>
            <EmptyTitle>
              {{ loadError ? '这次没有加载到执行日志' : '这个任务还没有执行日志' }}
            </EmptyTitle>
            <EmptyDescription>
              {{ loadError ? '稍后重试，或调整筛选条件后再查询。' : '执行一次任务后再回来看。' }}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </template>

      <template #cell-startTime="{ row }">
        <span :class="jobLogCellClass('startTime')">{{ formatDateTime(row.startTime) }}</span>
      </template>

      <template #cell-success="{ row }">
        <Badge :variant="row.success ? 'default' : 'destructive'" class="font-normal">
          {{ row.success ? '成功' : '失败' }}
        </Badge>
      </template>

      <template #cell-costTime="{ row }">
        <span :class="jobLogCellClass('costTime')">{{ row.costTime ?? 0 }} 毫秒</span>
      </template>

      <template #cell-result="{ row }">
        <span
          :class="jobLogCellClass('result')"
          :title="row.success ? (row.result ?? '') : (row.errorMsg ?? '')"
        >
          {{ row.success ? row.result || '没有返回内容' : row.errorMsg || '没有错误说明' }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex min-w-16 flex-nowrap gap-1">
          <Button
            v-if="can('schedule:job-log:query')"
            type="button"
            variant="ghost"
            size="sm"
            @click="openDetail(row)"
          >
            详情
          </Button>
        </div>
      </template>
    </ProTable>

    <JobEditor
      v-model:open="editorOpen"
      :job="editorJob"
      :can-validate="can('schedule:job:query')"
      @saved="load()"
    />

    <AlertDialog :open="deleteOpen" @update:open="setDeleteOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除定时任务</AlertDialogTitle>
          <AlertDialogDescription>
            将删除 {{ selectedIds.length }} 个任务，并停止它们的后续调度。
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

    <AlertDialog :open="triggerOpen" @update:open="onTriggerOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>立即执行</AlertDialogTitle>
          <AlertDialogDescription>
            将立即执行 {{ triggerJobRow?.jobName }}。停用的任务也可以手动执行。
            <span v-if="triggerError" class="text-destructive mt-2 block">{{ triggerError }}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="triggering">取消</AlertDialogCancel>
          <Button type="button" :disabled="triggering" @click="confirmTrigger">
            <Spinner v-if="triggering" />
            执行
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="cleanOpen" @update:open="onCleanOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空全部日志</AlertDialogTitle>
          <AlertDialogDescription>
            将删除所有任务的执行日志，不能只清空当前任务。
            <span v-if="cleanError" class="text-destructive mt-2 block">{{ cleanError }}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="cleaning">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="cleaning" @click="confirmClean">
            <Spinner v-if="cleaning" />
            清空
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="retainOpen" @update:open="onRetainOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清理较早日志</AlertDialogTitle>
          <AlertDialogDescription>
            将删除全部任务里早于保留天数的执行日志。
            <span v-if="retainError" class="text-destructive mt-2 block">{{ retainError }}</span>
          </AlertDialogDescription>
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
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="retaining">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="retaining" @click="confirmRetain">
            <Spinner v-if="retaining" />
            清理
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <FormDialog
      :open="detailOpen"
      title="执行详情"
      :description="detail ? `${detail.beanName}.${detail.methodName}` : '正在读取这条日志'"
      size="lg"
      :error="detailError"
      @update:open="onDetailOpen"
      @submit="closeDetail"
    >
      <p
        v-if="detailLoading"
        class="text-muted-foreground flex min-h-32 items-center justify-center gap-2 text-sm"
      >
        <Spinner />
        正在读取
      </p>
      <div v-else-if="detail" class="flex flex-col gap-4 text-sm">
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="text-muted-foreground text-xs">结果</p>
            <p>{{ detail.success ? '成功' : '失败' }}</p>
          </div>
          <div>
            <p class="text-muted-foreground text-xs">耗时</p>
            <p class="tabular-nums">{{ detail.costTime ?? 0 }} 毫秒</p>
          </div>
          <div class="sm:col-span-2">
            <p class="text-muted-foreground text-xs">开始时间</p>
            <p class="tabular-nums">{{ formatDateTime(detail.startTime) }}</p>
          </div>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">说明</p>
          <p class="break-words whitespace-pre-wrap">
            {{
              detail.success ? detail.result || '没有返回内容' : detail.errorMsg || '没有错误说明'
            }}
          </p>
        </div>
      </div>
      <div v-else class="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
        <p class="text-sm font-medium">没有读取到日志详情</p>
        <Button type="button" variant="outline" size="sm" @click="retryDetail">重试</Button>
      </div>

      <template #footer>
        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="closeDetail">
          关闭
        </Button>
      </template>
    </FormDialog>
  </section>
</template>
