import { get, post, put, del } from '@/utils/request'

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
export function getJobPage(params: JobQuery) {
  return get<IPage<ScheduleJob>>('/schedule/job/page', params)
}

/**
 * 查询任务详情
 */
export function getJobById(id: number) {
  return get<ScheduleJob>(`/schedule/job/${id}`)
}

/**
 * 新增任务
 */
export function createJob(data: JobForm) {
  return post<void>('/schedule/job', data)
}

/**
 * 修改任务
 */
export function updateJob(data: JobForm & { id: number }) {
  return put<void>('/schedule/job', data)
}

/**
 * 删除任务
 */
export function deleteJobs(ids: number[]) {
  return del<void>('/schedule/job', ids)
}

/**
 * 暂停任务
 */
export function pauseJob(id: number) {
  return put<void>(`/schedule/job/${id}/pause`)
}

/**
 * 恢复任务
 */
export function resumeJob(id: number) {
  return put<void>(`/schedule/job/${id}/resume`)
}

/**
 * 立即执行任务
 */
export function triggerJob(id: number) {
  return put<void>(`/schedule/job/${id}/trigger`)
}

/**
 * 校验 Cron 表达式
 */
export function validateCron(expression: string) {
  return get<CronValidateResult>('/schedule/job/cron/validate', { expression })
}
