import type { ColumnSettingItem } from '@/components/common/column-settings'

export const JOB_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'jobName', label: '任务名称' },
  { key: 'jobGroup', label: '分组' },
  { key: 'target', label: '调用目标' },
  { key: 'cronExpression', label: 'Cron' },
  { key: 'enabled', label: '状态' },
]

export const JOB_LOG_COLUMNS: ColumnSettingItem[] = [
  { key: 'startTime', label: '开始时间' },
  { key: 'success', label: '结果' },
  { key: 'costTime', label: '耗时' },
  { key: 'result', label: '说明' },
]

export const JOB_LOG_RESULT_OPTIONS = [
  { value: 'true', label: '成功' },
  { value: 'false', label: '失败' },
] as const

const JOB_CELL_MIN_WIDTH: Record<string, string> = {
  jobName: 'min-w-40',
  jobGroup: 'min-w-24',
  target: 'min-w-48',
  cronExpression: 'min-w-36',
}

/** 单元格文本样式：任务名加重，调用目标与 Cron 用等宽字体。 */
export function jobCellClass(columnId: string): string {
  const minWidth = JOB_CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'jobName') return `block truncate font-medium text-foreground ${minWidth}`
  if (columnId === 'target' || columnId === 'cronExpression') {
    return `block truncate font-mono text-xs text-muted-foreground ${minWidth}`
  }
  return `block truncate ${minWidth}`
}

const JOB_LOG_CELL_MIN_WIDTH: Record<string, string> = {
  startTime: 'min-w-36',
  success: 'min-w-16',
  costTime: 'min-w-20',
  result: 'min-w-48',
}

/** 日志单元格：时间与耗时用等宽数字，说明只做截断。 */
export function jobLogCellClass(columnId: string): string {
  const minWidth = JOB_LOG_CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'startTime') {
    return `block truncate text-muted-foreground tabular-nums ${minWidth}`
  }
  if (columnId === 'costTime') return `block truncate tabular-nums ${minWidth}`
  return `block truncate ${minWidth}`
}
