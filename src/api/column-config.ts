import type { RequestConfig } from '@/types/request'
import { get, put, del } from '@/utils/request'

/**
 * 获取当前用户在指定页面的列配置
 * @returns 配置数组；用户从未保存时返回 null
 */
export function getColumnConfig(pageKey: string, config?: RequestConfig) {
  return get<ColumnConfigItem[] | null>(`/sys/user-column-config/${pageKey}`, undefined, config)
}

/**
 * 保存列配置（upsert 语义，提交全部列包括隐藏列）
 */
export function saveColumnConfig(
  pageKey: string,
  columns: ColumnConfigItem[],
  config?: RequestConfig,
) {
  return put<void>(`/sys/user-column-config/${pageKey}`, columns, config)
}

/**
 * 恢复默认（物理删除配置记录，之后 GET 返回 null）
 */
export function resetColumnConfig(pageKey: string, config?: RequestConfig) {
  return del<void>(`/sys/user-column-config/${pageKey}`, undefined, config)
}
