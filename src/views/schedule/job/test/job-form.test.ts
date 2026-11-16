import { describe, expect, it } from 'vitest'
import {
  jobFormError,
  retainDaysError,
  toJobLogQuery,
  toJobQuery,
  toJobWrite,
} from '@/views/schedule/job/job-form'

describe('job form', () => {
  it('builds queries without empty filters or sort fields', () => {
    expect(
      toJobQuery({
        pageIndex: 0,
        pageSize: 10,
        jobName: ' 清理 ',
        jobGroup: '',
        beanName: '',
        enabled: 'false',
      }),
    ).toEqual({ pageNum: 1, pageSize: 10, jobName: '清理', enabled: false })
    expect(
      toJobLogQuery({ pageIndex: 1, pageSize: 20, jobId: 9001, success: '' }),
    ).toEqual({ pageNum: 2, pageSize: 20, jobId: 9001 })
  })

  it('blocks incomplete jobs and keeps cleared text fields', () => {
    expect(
      jobFormError({
        jobName: '',
        jobGroup: 'DEFAULT',
        beanName: 'bean',
        methodName: 'run',
        methodParams: '',
        cronExpression: '0 0 3 * * *',
        remark: '',
      }),
    ).toBe('请填写任务名称')
    expect(
      jobFormError({
        jobName: '名'.repeat(65),
        jobGroup: 'DEFAULT',
        beanName: 'bean',
        methodName: 'run',
        methodParams: '',
        cronExpression: '0 0 3 * * *',
        remark: '',
      }),
    ).toBe('任务名称不能超过 64 个字符')
    expect(
      toJobWrite({
        id: 3,
        jobName: '清理',
        jobGroup: 'SYSTEM',
        beanName: 'fileCleanupTask',
        methodName: 'execute',
        methodParams: '',
        cronExpression: '0 0 3 * * *',
        concurrent: false,
        enabled: true,
        remark: '',
      }),
    ).toMatchObject({ methodParams: '', remark: '' })
    expect(retainDaysError('0')).toBe('保留天数需要是 1 到 3650 的整数')
    expect(retainDaysError('30')).toBe('')
  })
})
