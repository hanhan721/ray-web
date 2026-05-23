import { defineStore } from 'pinia'
import {
  login as loginApi,
  getUserInfo as getUserInfoApi,
  logout as logoutApi,
  refreshToken as refreshTokenApi,
} from '@/api/auth'
import type { TokenResponse } from '@/api/auth'
import { usePermissionStore } from '@/stores/permission'
import type { PermissionVO } from '@/types/permission'
import type { StorageFile } from '@/api/file'

export interface UserInfo {
  userId: number
  username: string
  nickname: string
  avatar?: StorageFile | null
  roles: string[]
  permissions: string[]
  menus: PermissionVO[]
}

const TOKEN_KEY = 'access_token'
const EXPIRE_KEY = 'access_token_expire_at'

export const useUserStore = defineStore('user', () => {
  // State
  const accessToken = ref<string>('')
  const expireAt = ref<number>(0)
  const userInfo = ref<UserInfo | null>(null)

  // 刷新锁：多个请求共享同一个刷新 Promise
  let refreshPromise: Promise<TokenResponse> | null = null

  // Getters
  const isLoggedIn = computed(() => !!accessToken.value)
  const username = computed(() => userInfo.value?.username ?? '')
  const nickname = computed(() => userInfo.value?.nickname ?? '')
  const roles = computed(() => userInfo.value?.roles ?? [])
  const permissions = computed(() => userInfo.value?.permissions ?? [])

  // Actions
  function setToken(token: string, expireIn?: number) {
    accessToken.value = token
    localStorage.setItem(TOKEN_KEY, token)
    if (expireIn) {
      expireAt.value = Date.now() + expireIn * 1000
      localStorage.setItem(EXPIRE_KEY, String(expireAt.value))
    }
  }

  function isTokenExpiringSoon(bufferMs = 5 * 60 * 1000): boolean {
    if (!expireAt.value) return false
    return Date.now() + bufferMs >= expireAt.value
  }

  async function silentRefresh(): Promise<TokenResponse> {
    if (refreshPromise) return refreshPromise
    refreshPromise = refreshTokenApi()
      .then((res) => {
        setToken(res.accessToken, res.expireIn)
        return res
      })
      .finally(() => {
        refreshPromise = null
      })
    return refreshPromise
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info
  }

  async function login(usernameInput: string, password: string) {
    const response = await loginApi({ username: usernameInput, password })
    setToken(response.accessToken, response.expireIn)
    // 登录成功后获取用户信息
    await fetchUserInfo()
  }

  async function fetchUserInfo() {
    const info = await getUserInfoApi()
    setUserInfo(info)

    // 设置菜单和权限码到权限 Store
    const permissionStore = usePermissionStore()
    permissionStore.setMenus(info.menus ?? [], info.permissions)

    return info
  }

  async function logout() {
    try {
      await logoutApi()
    } finally {
      accessToken.value = ''
      expireAt.value = 0
      userInfo.value = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(EXPIRE_KEY)

      // 重置权限状态
      const permissionStore = usePermissionStore()
      permissionStore.reset()
    }
  }

  function initFromStorage() {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedExpireAt = localStorage.getItem(EXPIRE_KEY)

    if (storedToken && storedExpireAt) {
      const expire = Number(storedExpireAt)
      if (expire > Date.now()) {
        accessToken.value = storedToken
        expireAt.value = expire
      } else {
        // Token 已过期，清除存储
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(EXPIRE_KEY)
      }
    } else if (storedToken) {
      // 兼容旧数据（无 expireAt），仍然恢复 token
      accessToken.value = storedToken
    }
  }

  // 兼容旧的 token getter
  const token = computed(() => accessToken.value)

  return {
    accessToken,
    expireAt,
    token,
    userInfo,
    isLoggedIn,
    username,
    nickname,
    roles,
    permissions,
    setToken,
    setUserInfo,
    login,
    fetchUserInfo,
    logout,
    initFromStorage,
    isTokenExpiringSoon,
    silentRefresh,
  }
})
