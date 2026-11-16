import { writeFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getUserInfo, login, logout } from '@/api/auth'
import { installMemorySessionStorage } from './memory-session'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setApiBaseUrl,
  RequestError,
} from '@/utils/request'

const proxyBaseUrl = process.env.RAY_API_PROXY ?? 'http://127.0.0.1:5173/api'
const liveEnabled = process.env.RAY_LIVE_API === '1'

describe.skipIf(!liveEnabled)('request live proxy', () => {
  beforeAll(() => {
    installMemorySessionStorage()
    setApiBaseUrl(proxyBaseUrl)
    clearAccessToken()
  })

  afterAll(() => {
    clearAccessToken()
    setApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api')
  })

  it('logs in through the dev proxy and loads the current user', async () => {
    await expect(getUserInfo()).rejects.toBeInstanceOf(RequestError)
    expect(getAccessToken()).toBeNull()

    const token = await login({ username: 'admin', password: 'admin123' })
    expect(typeof token.accessToken).toBe('string')
    expect(token.accessToken.length).toBeGreaterThan(0)
    expect(token.expireIn).toBeGreaterThan(0)
    const accessToken = token.accessToken
    setAccessToken(accessToken)

    try {
      const info = await getUserInfo()
      expect(info.username).toBe('admin')
      const record = info as unknown as Record<string, unknown>
      const avatar = record.avatarFileId ?? record.avatar
      const evidence = {
        expireIn: token.expireIn,
        username: info.username,
        userInfoKeys: Object.keys(info),
        avatarKeys: avatar && typeof avatar === 'object' ? Object.keys(avatar) : null,
      }
      const evidencePath = process.env.RAY_LIVE_EVIDENCE
      if (evidencePath) writeFileSync(evidencePath, JSON.stringify(evidence))
    } finally {
      setAccessToken(accessToken)
      await logout()
      clearAccessToken()
    }
  }, 20_000)
})
