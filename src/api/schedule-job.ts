import { get, post, put, del } from '@/utils/request'
import type { RequestConfig } from '@/types/request'

/**
 * 定时任务实体
 */
export interface ScheduleJob {
  id: number
  jobName: string
  jobGroup: string
  beanName: string
  methodName: string
  methodParams?: string | null
  cronExpression: string
  concurrent: boolean
  enabled: boolean
  remark?: string | null
  createTime?: string
  updateTime?: string
}

/**
 * 任务表单（新增/修改通用）
 */
export type JobForm = Partial<Pick<ScheduleJob, 'id'>> &
  Omit<ScheduleJob, 'id' | 'createTime' | 'updateTime'>

/**
 * 分页查询参数
 */
export interface JobQuery extends PageQuery {
  jobName?: string
  jobGroup?: string
  beanName?: string
  enabled?: boolean
}

/**
 * Cron 表达式校验结果
 */
export interface CronValidateResult {
  valid: boolean
  nextTimes: string[]
}

/**
 * 分页查询定时任务
 */
export function getJobPage(params: JobQuery, config?: RequestConfig) {
  return get<IPage<ScheduleJob>>('/schedule/job/page', params, config)
}

/**
 * 查询任务详情
 */
export function getJobById(id: number, config?: RequestConfig) {
  return get<ScheduleJob>(`/schedule/job/${id}`, undefined, config)
}

/**
 * 新增任务
 */
export function createJob(data: JobForm, config?: RequestConfig) {
  return post<void>('/schedule/job', data, config)
}

/**
 * 修改任务
 */
export function updateJob(data: JobForm & { id: number }, config?: RequestConfig) {
  return put<void>('/schedule/job', data, config)
}

/**
 * 删除任务
 */
export function deleteJobs(ids: number[], config?: RequestConfig) {
  return del<void>('/schedule/job', ids, config)
}

/**
 * 暂停任务
 */
export function pauseJob(id: number, config?: RequestConfig) {
  return put<void>(`/schedule/job/${id}/pause`, null, config)
}

/**
 * 恢复任务
 */
export function resumeJob(id: number, config?: RequestConfig) {
  return put<void>(`/schedule/job/${id}/resume`, null, config)
}

/**
 * 立即执行任务
 */
export function triggerJob(id: number, config?: RequestConfig) {
  return put<void>(`/schedule/job/${id}/trigger`, null, config)
}

/**
 * 校验 Cron 表达式
 */
export function validateCron(expression: string, config?: RequestConfig) {
  return get<CronValidateResult>('/schedule/job/cron/validate', { expression }, config)
}

export interface ScheduleJobLog {
  id: number
  jobId: number
  jobName: string
  jobGroup: string
  beanName: string
  methodName: string
  methodParams?: string | null
  success: boolean
  result?: string | null
  errorMsg?: string | null
  costTime?: number | null
  startTime?: string
  endTime?: string
}

export interface JobLogQuery extends PageQuery {
  jobId?: number
  jobName?: string
  jobGroup?: string
  success?: boolean
}

export function getJobLogPage(params: JobLogQuery, config?: RequestConfig) {
  return get<IPage<ScheduleJobLog>>('/schedule/job-log/page', params, config)
}

export function getJobLogById(id: number, config?: RequestConfig) {
  return get<ScheduleJobLog>(`/schedule/job-log/${id}`, undefined, config)
}

export function cleanJobLogs(config?: RequestConfig) {
  return del<void>('/schedule/job-log/clean', undefined, config)
}

export function cleanJobLogsBefore(retainDays: number, config?: RequestConfig) {
  return del<number>('/schedule/job-log/clean-by-days', undefined, {
    ...config,
    params: { retainDays },
  })
}
