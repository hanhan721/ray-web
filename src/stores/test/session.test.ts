import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserInfo } from '@/types/auth'
import { useSessionStore } from '@/stores/session'
import { installMemorySessionStorage } from '@/utils/test/memory-session'
import { clearAccessToken, getAccessToken, setAccessToken, RequestError } from '@/utils/request'

const auth = vi.hoisted(() => ({
  login: vi.fn(),
  getUserInfo: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/auth', () => auth)

function profile(): UserInfo {
  return {
    userId: 1,
    username: 'admin',
    nickname: '管理员',
    avatarFileId: null,
    roles: ['admin'],
    permissions: ['system:user:query'],
    menus: [],
  }
}

beforeEach(() => {
  installMemorySessionStorage()
  setActivePinia(createPinia())
  clearAccessToken()
  auth.login.mockReset()
  auth.getUserInfo.mockReset()
  auth.logout.mockReset()
})

afterEach(() => {
  clearAccessToken()
})

describe('session store', () => {
  it('stores the profile after login and checks permission codes', async () => {
    auth.login.mockResolvedValue({ accessToken: 'token-a', expireIn: 1800 })
    auth.getUserInfo.mockResolvedValue(profile())
    const session = useSessionStore()
    await expect(session.login('admin', 'secret')).resolves.toBe(true)
    expect(getAccessToken()).toBe('token-a')
    expect(session.profile?.nickname).toBe('管理员')
    expect(session.can('system:user:query')).toBe(true)
    expect(session.can('stage4:missing')).toBe(false)
  })

  it('ignores a user profile that arrives after the session has changed', async () => {
    auth.login.mockResolvedValue({ accessToken: 'token-a', expireIn: 1800 })
    let resolveInfo: (value: UserInfo) => void = () => {}
    auth.getUserInfo.mockImplementation(
      () =>
        new Promise<UserInfo>((resolve) => {
          resolveInfo = resolve
        }),
    )
    const session = useSessionStore()
    const pending = session.login('admin', 'secret')
    await vi.waitUntil(() => auth.getUserInfo.mock.calls.length === 1)
    clearAccessToken()
    setAccessToken('token-b')
    resolveInfo(profile())
    await expect(pending).resolves.toBe(false)
    expect(session.profile).toBeNull()
    expect(getAccessToken()).toBe('token-b')
  })

  it('clears the local session when logout fails', async () => {
    setAccessToken('token-a')
    const session = useSessionStore()
    session.profile = profile()
    session.markRoutes(['UserPage'])
    auth.logout.mockRejectedValue(new Error('网络连接失败，请稍后重试'))
    await expect(session.logout()).resolves.toEqual(['UserPage'])
    expect(getAccessToken()).toBeNull()
    expect(session.profile).toBeNull()
    expect(session.routesReady).toBe(false)
  })

  it('keeps the access token when restoring the profile fails for a reason other than expiry', async () => {
    setAccessToken('token-a')
    auth.getUserInfo.mockRejectedValue(new RequestError('服务暂时不可用', { status: 500 }))
    const session = useSessionStore()
    await expect(session.restore()).resolves.toBe('unavailable')
    expect(getAccessToken()).toBe('token-a')
    expect(session.profile).toBeNull()
  })

  it('drops the access token when restoring the profile is unauthorized', async () => {
    setAccessToken('token-a')
    auth.getUserInfo.mockRejectedValue(
      new RequestError('未登录或登录已过期', { status: 401, code: 401 }),
    )
    const session = useSessionStore()
    await expect(session.restore()).resolves.toBe('anonymous')
    expect(getAccessToken()).toBeNull()
    expect(session.profile).toBeNull()
  })

  it('accepts a profile when refresh rotates the access token during restore', async () => {
    setAccessToken('token-a')
    auth.getUserInfo.mockImplementation(async () => {
      setAccessToken('token-b', { rotate: true })
      return profile()
    })
    const session = useSessionStore()
    await expect(session.restore()).resolves.toBe('ready')
    expect(getAccessToken()).toBe('token-b')
    expect(session.profile?.username).toBe('admin')
  })
})
