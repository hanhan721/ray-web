import { get, del } from '@/utils/request'

/**
 * 在线用户实体
 */
export interface OnlineUser {
  tokenId: string
  userId: number
  username: string
  nickname?: string
  loginIp?: string
  browser?: string
  os?: string
  loginTime?: string
}

/**
 * 查询在线用户列表
 */
export function getOnlineList(params?: { username?: string; loginIp?: string }) {
  return get<OnlineUser[]>('/sys/online/list', params)
}

/**
 * 强制下线（单个会话）
 */
export function kickByTokenId(tokenId: string) {
  return del<void>(`/sys/online/${tokenId}`)
}

/**
 * 强制下线（用户所有会话）
 */
export function kickByUserId(userId: number) {
  return del<void>(`/sys/online/user/${userId}`)
}
