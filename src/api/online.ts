import { get, del } from '@/utils/request'
import type { RequestConfig } from '@/types/request'

/**
 * 在线用户实体
 */
export interface OnlineUser {
  sessionId: string
  userId: number
  username: string
  nickname?: string
  loginIp?: string
  browser?: string
  os?: string
  loginTime?: string
}

/**
 * 在线会话查询参数
 */
export interface OnlineSessionQuery extends PageQuery {
  /** 登录时间起点（包含），ISO 本地日期时间 */
  startTime?: string
  /** 登录时间终点（包含），ISO 本地日期时间 */
  endTime?: string
}

/**
 * 分页查询在线会话
 */
export function getOnlineSessionPage(params?: OnlineSessionQuery, config?: RequestConfig) {
  return get<IPage<OnlineUser>>('/sys/online/page', params, config)
}

/**
 * 强制下线（单个会话）
 */
export function kickBySessionId(sessionId: string, config?: RequestConfig) {
  return del<void>(`/sys/online/${sessionId}`, undefined, config)
}

/**
 * 强制下线（用户所有会话）
 */
export function kickByUserId(userId: number, config?: RequestConfig) {
  return del<void>(`/sys/online/user/${userId}`, undefined, config)
}
