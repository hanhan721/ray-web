import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { getUserInfo, login as loginRequest, logout as logoutRequest } from '@/api/auth'
import type { UserInfo } from '@/types/auth'
import { buildNavigation, firstMenuPath, type NavNode } from '@/router/menu-routes'
import { viewLoaders } from '@/router/views'
import {
  clearAccessToken,
  getAccessToken,
  getSessionEpoch,
  RequestError,
  setAccessToken,
} from '@/utils/request'

export type SessionRestore = 'ready' | 'anonymous' | 'unavailable'

function sessionEnded(error: unknown): boolean {
  return error instanceof RequestError && (error.status === 401 || error.code === 401)
}

function normalizeUser(value: UserInfo): UserInfo {
  return {
    userId: value.userId,
    username: value.username,
    nickname: value.nickname,
    avatarFileId: typeof value.avatarFileId === 'number' ? value.avatarFileId : null,
    roles: value.roles ?? [],
    permissions: value.permissions ?? [],
    menus: value.menus ?? [],
  }
}

export const useSessionStore = defineStore('session', () => {
  const profile = shallowRef<UserInfo | null>(null)
  const routesReady = shallowRef(false)
  const routeNames = shallowRef<string[]>([])
  let unavailableToken: string | null = null

  const displayName = computed(() => profile.value?.nickname || profile.value?.username || '')
  const navigation = computed<NavNode[]>(() =>
    profile.value ? buildNavigation(profile.value.menus, viewLoaders) : [],
  )
  const entryPath = computed(() =>
    profile.value ? (firstMenuPath(profile.value.menus, viewLoaders) ?? '/') : '/',
  )

  function can(code: string): boolean {
    if (!code) return false
    return profile.value?.permissions.includes(code) ?? false
  }

  function markRoutes(names: string[]) {
    routeNames.value = names
    routesReady.value = true
  }

  function discard(): string[] {
    const names = routeNames.value
    routeNames.value = []
    routesReady.value = false
    profile.value = null
    unavailableToken = null
    return names
  }

  async function login(username: string, password: string): Promise<boolean> {
    const token = await loginRequest({ username, password })
    setAccessToken(token.accessToken)
    const epoch = getSessionEpoch()
    try {
      const info = await getUserInfo({ showErrorMessage: false })
      if (getSessionEpoch() !== epoch) return false
      profile.value = normalizeUser(info)
      routesReady.value = false
      return true
    } catch (error) {
      if (getSessionEpoch() === epoch) {
        clearAccessToken()
        profile.value = null
      }
      throw error
    }
  }

  async function restore(): Promise<SessionRestore> {
    const token = getAccessToken()
    if (!token) return 'anonymous'
    if (profile.value) return 'ready'
    if (unavailableToken === token) return 'unavailable'
    const epoch = getSessionEpoch()
    try {
      const info = await getUserInfo()
      if (getSessionEpoch() !== epoch) return 'anonymous'
      profile.value = normalizeUser(info)
      unavailableToken = null
      return 'ready'
    } catch (error) {
      if (getSessionEpoch() !== epoch || !getAccessToken()) return 'anonymous'
      if (sessionEnded(error)) {
        clearAccessToken()
        profile.value = null
        unavailableToken = null
        return 'anonymous'
      }
      unavailableToken = getAccessToken()
      return 'unavailable'
    }
  }

  async function logout(): Promise<string[]> {
    try {
      if (getAccessToken()) await logoutRequest()
    } catch {
      // 请求层已经提示失败。本地会话仍要结束，避免停在半退出状态。
    } finally {
      clearAccessToken()
    }
    return discard()
  }

  return {
    profile,
    routesReady,
    routeNames,
    displayName,
    navigation,
    entryPath,
    can,
    markRoutes,
    discard,
    login,
    restore,
    logout,
  }
})
