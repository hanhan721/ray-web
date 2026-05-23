<template>
  <div class="job-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestJobPage"
      show-index
    >
      <template #toolbar>
        <NButton type="primary" @click="handleAdd">
          <template #icon>
            <NIcon><AddOutline /></NIcon>
          </template>
          新增
        </NButton>
        <!--        <ConfirmButton-->
        <!--          :disabled="!selectedIds.length"-->
        <!--          type="error"-->
        <!--          confirm-text="确定要删除选中的任务吗？"-->
        <!--          @confirm="handleBatchDelete"-->
        <!--        >-->
        <!--          <template #icon>-->
        <!--            <NIcon><TrashOutline /></NIcon>-->
        <!--          </template>-->
        <!--          批量删除-->
        <!--        </ConfirmButton>-->
      </template>

      <!-- 任务分组列 -->
      <template #cell-jobGroup="{ row }">
        <DictTag type="job_group" :value="(row as JobRow).jobGroup" />
      </template>

      <!-- 启用状态列 -->
      <template #cell-enabled="{ row }">
        <NTag :type="(row as JobRow).enabled ? 'success' : 'default'" size="small">
          {{ (row as JobRow).enabled ? '启用' : '停用' }}
        </NTag>
      </template>

      <!-- 并发列 -->
      <template #cell-concurrent="{ row }">
        <NTag :type="(row as JobRow).concurrent ? 'warning' : 'info'" size="small">
          {{ (row as JobRow).concurrent ? '允许' : '禁止' }}
        </NTag>
      </template>

      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4">
          <NButton text type="primary" @click="handleEdit(row as JobRow)">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            编辑
          </NButton>
          <NButton
            v-if="(row as JobRow).enabled"
            text
            type="warning"
            @click="handlePause(row as JobRow)"
          >
            <template #icon>
              <NIcon><PauseOutline /></NIcon>
            </template>
            暂停
          </NButton>
          <NButton
            v-else
            text
            type="success"
            @click="handleResume(row as JobRow)"
          >
            <template #icon>
              <NIcon><PlayOutline /></NIcon>
            </template>
            恢复
          </NButton>
          <ConfirmButton
            text
            type="info"
            confirm-text="确定要立即执行该任务吗？"
            @confirm="handleTrigger(row as JobRow)"
          >
            <template #icon>
              <NIcon><FlashOutline /></NIcon>
            </template>
            执行
          </ConfirmButton>
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要删除该任务吗？"
            @confirm="handleDelete(row as JobRow)"
          >
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
            删除
          </ConfirmButton>
        </NSpace>
      </template>
    </ProTable>

    <JobForm
      v-model:show="formVisible"
      :data="currentRow"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { NButton, NIcon, NSpace, NTag } from 'naive-ui'
import {
  AddOutline,
  CreateOutline,
  TrashOutline,
  PauseOutline,
  PlayOutline,
  FlashOutline,
} from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import {
  getJobPage,
  deleteJobs,
  pauseJob,
  resumeJob,
  triggerJob,
  type ScheduleJob,
} from '@/api/schedule-job'
import JobForm from './components/JobForm.vue'

defineOptions({
  name: 'ScheduleJobPage',
})

type JobRow = ScheduleJob & Record<string, unknown>

const message = useMessage()

const tableRef = ref<ProTableExpose | null>(null)
const selectedIds = ref<number[]>([])
const formVisible = ref(false)
const currentRow = ref<ScheduleJob | null>(null)

async function requestJobPage(params: ProTableRequestParams) {
  const result = await getJobPage(params)
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

const columns: ProTableColumn[] = [
  {
    key: 'jobName',
    title: '任务名称',
    minWidth: 140,
    ellipsis: true,
    search: true,
  },
  {
    key: 'jobGroup',
    title: '任务分组',
    width: 110,
    align: 'center',
    search: { component: 'dict-select', dictType: 'job_group' },
  },
  {
    key: 'beanName',
    title: 'Bean 名称',
    minWidth: 140,
    ellipsis: true,
    search: true,
  },
  {
    key: 'methodName',
    title: '方法名称',
    width: 130,
    ellipsis: true,
  },
  {
    key: 'cronExpression',
    title: 'Cron 表达式',
    width: 160,
    ellipsis: true,
  },
  {
    key: 'concurrent',
    title: '并发',
    width: 80,
    align: 'center',
  },
  {
    key: 'enabled',
    title: '状态',
    width: 80,
    align: 'center',
    search: {
      component: 'select',
      props: {
        options: [
          { label: '启用', value: true },
          { label: '停用', value: false },
        ],
      },
    },
  },
  {
    key: 'remark',
    title: '备注',
    minWidth: 120,
    ellipsis: true,
  },
  {
    key: 'createTime',
    title: '创建时间',
    width: 180,
    sorter: true,
  },
  {
    key: 'actions',
    title: '操作',
    width: 300,
    fixed: 'right',
    align: 'center',
  },
]

function handleAdd() {
  currentRow.value = null
  formVisible.value = true
}

function handleEdit(row: JobRow) {
  currentRow.value = { ...row } as ScheduleJob
  formVisible.value = true
}

async function handleDelete(row: JobRow) {
  try {
    await deleteJobs([row.id])
    message.success('删除成功')
    tableRef.value?.refresh()
  } catch {
    message.error('删除失败')
  }
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) return
  try {
    await deleteJobs(selectedIds.value)
    message.success('批量删除成功')
    selectedIds.value = []
    tableRef.value?.refresh()
  } catch {
    message.error('批量删除失败')
  }
}

async function handlePause(row: JobRow) {
  try {
    await pauseJob(row.id)
    message.success('任务已暂停')
    tableRef.value?.refresh()
  } catch {
    message.error('暂停失败')
  }
}

async function handleResume(row: JobRow) {
  try {
    await resumeJob(row.id)
    message.success('任务已恢复')
    tableRef.value?.refresh()
  } catch {
    message.error('恢复失败')
  }
}

async function handleTrigger(row: JobRow) {
  try {
    await triggerJob(row.id)
    message.success('任务已触发执行')
  } catch {
    message.error('触发执行失败')
  }
}

function handleFormSuccess() {
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.job-page {
  padding: $spacing-lg;
}
</style>
