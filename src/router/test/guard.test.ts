import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PermissionVO } from '@/types/permission'
import type { UserInfo } from '@/types/auth'
import { createAppRouter } from '@/router'
import { readRedirect } from '@/router/guard'
import { useSessionStore } from '@/stores/session'
import { installMemorySessionStorage } from '@/utils/test/memory-session'
import { clearAccessToken, getAccessToken, RequestError, setAccessToken } from '@/utils/request'

const auth = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getUserInfo: auth.getUserInfo,
}))

function menu(): PermissionVO {
  return {
    id: 1,
    parentId: 0,
    name: '系统管理',
    type: 'DIRECTORY',
    url: '/system',
    component: null,
    redirect: '/system/user',
    sort: 1,
    hidden: false,
    keepAlive: false,
    enabled: true,
    children: [
      {
        id: 2,
        parentId: 1,
        name: '用户管理',
        type: 'MENU',
        url: 'user',
        component: 'system/user/index',
        routeName: 'UserPage',
        sort: 1,
        hidden: false,
        keepAlive: false,
        enabled: true,
        children: [],
      },
    ],
  }
}

function profile(): UserInfo {
  return {
    userId: 1,
    username: 'admin',
    nickname: '管理员',
    avatarFileId: null,
    roles: ['admin'],
    permissions: ['system:user:query'],
    menus: [menu()],
  }
}

beforeEach(() => {
  installMemorySessionStorage()
  setActivePinia(createPinia())
  clearAccessToken()
  auth.getUserInfo.mockReset()
})

afterEach(() => {
  clearAccessToken()
})

describe('route guard', () => {
  it('rejects unsafe return paths', () => {
    expect(readRedirect('/system/user')).toBe('/system/user')
    expect(readRedirect('//evil.example')).toBeNull()
    expect(readRedirect('/login')).toBeNull()
    expect(readRedirect('https://evil.example')).toBeNull()
  })

  it('sends an anonymous visit to login and keeps the return path', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/system/user')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/system/user')
  })

  it('does not redirect a public page or the login page itself', async () => {
    const router = createAppRouter(createMemoryHistory())
    await router.push('/style-guide')
    expect(router.currentRoute.value.name).toBe('style-guide')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('installs the menu and blocks a permission the account does not have', async () => {
    const router = createAppRouter(createMemoryHistory())
    const session = useSessionStore()
    setAccessToken('token-a')
    session.profile = profile()
    await router.push('/system/user')
    expect(router.currentRoute.value.name).toBe('UserPage')
    await router.push('/denied')
    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('leaves login when a session is already present', async () => {
    const router = createAppRouter(createMemoryHistory())
    const session = useSessionStore()
    setAccessToken('token-a')
    session.profile = profile()
    await router.push({ name: 'login', query: { redirect: '/system/user' } })
    expect(router.currentRoute.value.name).toBe('UserPage')
  })

  it('keeps a valid token when profile loading fails for a reason other than expiry', async () => {
    auth.getUserInfo.mockRejectedValue(new RequestError('服务暂时不可用', { status: 500 }))
    setAccessToken('token-a')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/system/user')
    expect(getAccessToken()).toBe('token-a')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('sends an unauthorized profile load back to login', async () => {
    auth.getUserInfo.mockRejectedValue(
      new RequestError('未登录或登录已过期', { status: 401, code: 401 }),
    )
    setAccessToken('token-a')
    const router = createAppRouter(createMemoryHistory())
    await router.push('/system/user')
    expect(getAccessToken()).toBeNull()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/system/user')
  })

  it('enters the app when restore rotates the access token', async () => {
    setAccessToken('token-a')
    auth.getUserInfo.mockImplementation(async () => {
      setAccessToken('token-b', { rotate: true })
      return profile()
    })
    const router = createAppRouter(createMemoryHistory())
    await router.push('/login')
    expect(getAccessToken()).toBe('token-b')
    expect(router.currentRoute.value.name).toBe('UserPage')
  })
})
