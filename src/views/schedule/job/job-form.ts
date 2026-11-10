import type { JobForm, JobLogQuery, JobQuery } from '@/api/schedule-job'

export function toJobQuery(input: {
  pageIndex: number
  pageSize: number
  jobName: string
  jobGroup: string
  beanName: string
  enabled: '' | 'true' | 'false'
}): JobQuery {
  const query: JobQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
  }
  const jobName = input.jobName.trim()
  const jobGroup = input.jobGroup.trim()
  const beanName = input.beanName.trim()
  if (jobName) query.jobName = jobName
  if (jobGroup) query.jobGroup = jobGroup
  if (beanName) query.beanName = beanName
  if (input.enabled === 'true') query.enabled = true
  if (input.enabled === 'false') query.enabled = false
  return query
}

export function toJobLogQuery(input: {
  pageIndex: number
  pageSize: number
  jobId: number
  success: '' | 'true' | 'false'
}): JobLogQuery {
  const query: JobLogQuery = {
    pageNum: input.pageIndex + 1,
    pageSize: input.pageSize,
    jobId: input.jobId,
  }
  if (input.success === 'true') query.success = true
  if (input.success === 'false') query.success = false
  return query
}

export function jobFormError(input: {
  jobName: string
  jobGroup: string
  beanName: string
  methodName: string
  methodParams: string
  cronExpression: string
  remark: string
}): string {
  if (!input.jobName) return '请填写任务名称'
  if (input.jobName.length > 64) return '任务名称不能超过 64 个字符'
  if (!input.jobGroup) return '请填写任务分组'
  if (input.jobGroup.length > 64) return '任务分组不能超过 64 个字符'
  if (!input.beanName) return '请填写 Bean 名称'
  if (input.beanName.length > 200) return 'Bean 名称不能超过 200 个字符'
  if (!input.methodName) return '请填写方法名称'
  if (input.methodName.length > 200) return '方法名称不能超过 200 个字符'
  if (input.methodParams.length > 500) return '方法参数不能超过 500 个字符'
  if (!input.cronExpression) return '请填写 Cron 表达式'
  if (input.cronExpression.length > 255) return 'Cron 表达式不能超过 255 个字符'
  if (input.remark.length > 500) return '备注不能超过 500 个字符'
  return ''
}

export function toJobWrite(input: {
  id?: number
  jobName: string
  jobGroup: string
  beanName: string
  methodName: string
  methodParams: string
  cronExpression: string
  concurrent: boolean
  enabled: boolean
  remark: string
}): JobForm & { id?: number } {
  return {
    id: input.id,
    jobName: input.jobName,
    jobGroup: input.jobGroup,
    beanName: input.beanName,
    methodName: input.methodName,
    methodParams: input.methodParams,
    cronExpression: input.cronExpression,
    concurrent: input.concurrent,
    enabled: input.enabled,
    remark: input.remark,
  }
}

export function retainDaysError(value: string): string {
  if (!/^\d+$/.test(value.trim())) return '保留天数需要是 1 到 3650 的整数'
  const days = Number(value)
  if (days < 1 || days > 3650) return '保留天数需要是 1 到 3650 的整数'
  return ''
}

export function formatDateTime(value: unknown): string {
  if (typeof value === 'string') return value.replace('T', ' ')
  if (!Array.isArray(value) || value.length < 3) return ''
  const [year, month, day, hour = 0, minute = 0, second = 0] = value
  const pad = (part: unknown) => String(part).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}
