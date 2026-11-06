import { post, get } from '@/utils/request'
import type { UserInfo } from '@/types/auth'

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

// 登录
export function login(data: LoginParams) {
  return post<TokenResponse>('/auth/login', data)
}

// 获取当前用户信息
export function getUserInfo() {
  return get<UserInfo>('/auth/userinfo')
}

// 退出登录
export function logout() {
  return post('/auth/logout')
}

// 刷新 Token
export function refreshToken() {
  return post<TokenResponse>('/auth/refresh')
}
