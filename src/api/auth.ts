import { post, get, getAccessToken, getSessionEpoch, setAccessToken } from '@/utils/request'
import type { UserInfo } from '@/types/auth'
import type { RequestConfig } from '@/types/request'

// 登录参数
export interface LoginParams {
  username: string
  password: string
}

// Token 响应
export interface TokenResponse {
  accessToken: string
  expireIn: number
}

// 登录。失败提示留在登录页，不走全局 Toast。
export function login(data: LoginParams) {
  return post<TokenResponse>('/auth/login', data, { showErrorMessage: false })
}

// 获取当前用户信息
export function getUserInfo(config?: RequestConfig) {
  return get<UserInfo>('/auth/userinfo', undefined, config)
}

// 退出登录
export function logout() {
  return post('/auth/logout')
}

// 刷新 Token。自动刷新走请求层的单飞流程；直接调用时只在会话未切换的情况下轮换本地令牌。
export async function refreshToken() {
  const epoch = getSessionEpoch()
  const previous = getAccessToken()
  const token = await post<TokenResponse>('/auth/refresh')
  if (
    getSessionEpoch() === epoch &&
    getAccessToken() === previous &&
    token.accessToken.length > 0
  ) {
    setAccessToken(token.accessToken, { rotate: true })
  }
  return token
}
