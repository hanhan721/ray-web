import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { AxiosError, AxiosHeaders, isCancel } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { refreshToken } from '@/api/auth'
import { installMemorySessionStorage } from './memory-session'
import {
  RequestError,
  clearAccessToken,
  del,
  get,
  getAccessToken,
  post,
  put,
  setAccessToken,
  setApiBaseUrl,
  setErrorNotifier,
  setUnauthorizedHandler,
} from '@/utils/request'

interface CapturedRequest {
  method: string
  url: string
  authorization?: string
  contentType?: string
  body: string
}

const captured: CapturedRequest[] = []
let origin = ''
let closeServer: (() => Promise<void>) | undefined
let refreshMode: 'reject' | 'grant' | 'rotate' | 'hang' = 'reject'
let releaseRefresh: (() => void) | null = null
let releaseHold: (() => void) | null = null
let holdStatus: 'pending' | 'unauthorized' = 'pending'
let hangUsed = false
let refreshAborted = false
let refreshCookieWrites = 0
let refreshGeneration = 0

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk))
    })
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(payload)
}

beforeAll(async () => {
  installMemorySessionStorage()
  const server = createServer(async (request, response) => {
    const body = (await readBody(request)).toString('utf8')
    const url = request.url ?? ''
    captured.push({
      method: request.method ?? '',
      url,
      authorization: request.headers.authorization,
      contentType: request.headers['content-type'],
      body,
    })
    const pathname = new URL(url, 'http://127.0.0.1').pathname
    if (pathname === '/slow') return
    if (pathname === '/hold') {
      await new Promise<void>((resolve) => {
        releaseHold = resolve
      })
      if (holdStatus === 'unauthorized') {
        sendJson(response, 401, { code: 401, msg: '未登录或登录已过期', data: null })
        return
      }
      sendJson(response, 200, { code: 200, msg: '操作成功', data: { ok: true } })
      return
    }
    if (pathname === '/auth/login') {
      sendJson(response, 200, { code: 401, msg: '用户名或密码错误', data: null })
      return
    }
    if (pathname === '/auth/refresh') {
      if (refreshMode === 'hang' && !hangUsed) {
        hangUsed = true
        const generation = refreshGeneration
        const closed = new Promise<'closed'>((resolve) => {
          const finish = () => resolve('closed')
          response.on('close', () => {
            if (!response.writableEnded) finish()
          })
          request.on('aborted', finish)
          request.socket?.on('close', finish)
        })
        const released = new Promise<'released'>((resolve) => {
          releaseRefresh = () => resolve('released')
        })
        const outcome = await Promise.race([closed, released])
        if (generation !== refreshGeneration) return
        if (outcome === 'closed' || response.writableEnded) {
          refreshAborted = true
          return
        }
        refreshCookieWrites += 1
        response.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'set-cookie': 'refresh_token=old-session; Path=/api/auth; HttpOnly',
        })
        response.end(
          JSON.stringify({
            code: 200,
            msg: '操作成功',
            data: { accessToken: 'stale-renewed', expireIn: 1800 },
          }),
        )
        return
      }
      if (refreshMode === 'hang') {
        sendJson(response, 200, {
          code: 200,
          msg: '操作成功',
          data: { accessToken: 'user-b-renewed', expireIn: 1800 },
        })
        return
      }
      if (refreshMode === 'grant' || refreshMode === 'rotate') {
        sendJson(response, 200, {
          code: 200,
          msg: '操作成功',
          data: { accessToken: 'renewed-token', expireIn: 1800 },
        })
        return
      }
      sendJson(response, 401, { code: 401, msg: '刷新失败', data: null })
      return
    }
    if (pathname === '/secure') {
      const authorization = request.headers.authorization
      if (
        (refreshMode === 'grant' && authorization === 'Bearer renewed-token') ||
        authorization === 'Bearer user-b-renewed'
      ) {
        sendJson(response, 200, { code: 200, msg: '操作成功', data: { ok: true } })
        return
      }
      sendJson(response, 401, { code: 401, msg: '未登录或登录已过期', data: null })
      return
    }
    if (pathname === '/expired') {
      if (refreshMode === 'grant' && request.headers.authorization === 'Bearer renewed-token') {
        sendJson(response, 200, { code: 200, msg: '操作成功', data: { ok: true } })
        return
      }
      sendJson(response, 200, { code: 401, msg: '未登录或登录已过期', data: null })
      return
    }
    if (pathname === '/forbidden') {
      sendJson(response, 403, { code: 403, msg: '无访问权限', data: null })
      return
    }
    if (pathname === '/broken') {
      sendJson(response, 500, { code: 500, msg: '数据访问异常，请稍后重试', data: null })
      return
    }
    if (pathname === '/business') {
      sendJson(response, 200, { code: 555, msg: '名称已存在', data: null })
      return
    }
    if (pathname === '/unknown') {
      sendJson(response, 200, { ok: true })
      return
    }
    if (pathname === '/empty') {
      sendJson(response, 200, { code: 200, msg: '操作成功', data: null })
      return
    }
    if (pathname === '/upload' || pathname === '/sys/user' || pathname.endsWith('/status')) {
      sendJson(response, 200, { code: 200, msg: '操作成功', data: { saved: true } })
      return
    }
    sendJson(response, 200, {
      code: 200,
      msg: '操作成功',
      data: { username: 'admin' },
    })
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  origin = `http://127.0.0.1:${address.port}`
  closeServer = () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
})

afterAll(async () => {
  await closeServer?.()
})

afterEach(() => {
  refreshGeneration += 1
  releaseRefresh?.()
  releaseRefresh = null
  releaseHold?.()
  releaseHold = null
  holdStatus = 'pending'
  hangUsed = false
  refreshAborted = false
  refreshCookieWrites = 0
  refreshMode = 'reject'
  captured.length = 0
  clearAccessToken()
  setErrorNotifier(null)
  setUnauthorizedHandler(null)
})

describe('request json', () => {
  it('unwraps a successful R payload', async () => {
    const data = await get<{ username: string }>('/auth/userinfo', undefined, { baseURL: origin })
    expect(data).toEqual({ username: 'admin' })
  })

  it('returns null when success data is null', async () => {
    await expect(get('/empty', undefined, { baseURL: origin })).resolves.toBeNull()
  })

  it('rejects an unrecognized json body', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(get('/unknown', undefined, { baseURL: origin })).rejects.toMatchObject({
      name: 'RequestError',
      message: '响应格式无法识别',
    })
    expect(log).toHaveBeenCalledWith('无法解析 API 响应格式', { url: '/unknown', status: 200 })
    log.mockRestore()
  })
})

describe('request errors', () => {
  it('uses the backend business message and notifies once', async () => {
    const messages: string[] = []
    const paths: string[] = []
    setErrorNotifier((error, path) => {
      messages.push(error.message)
      paths.push(path)
    })
    await expect(get('/business?secret=hidden', undefined, { baseURL: origin })).rejects.toMatchObject({
      code: 555,
      message: '名称已存在',
    })
    expect(messages).toEqual(['名称已存在'])
    expect(paths).toEqual(['/business'])
  })

  it('prefers the http error payload message', async () => {
    await expect(get('/broken', undefined, { baseURL: origin })).rejects.toMatchObject({
      status: 500,
      code: 500,
      message: '数据访问异常，请稍后重试',
    })
  })

  it('reports a network failure without a response body', async () => {
    const server = createServer()
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const port = (server.address() as AddressInfo).port
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    const messages: string[] = []
    setErrorNotifier((error) => messages.push(error.message))
    await expect(
      get('/offline', undefined, { baseURL: `http://127.0.0.1:${port}` }),
    ).rejects.toBeInstanceOf(RequestError)
    expect(messages).toEqual(['网络连接失败，请稍后重试'])
  })
})

describe('request auth', () => {
  it('does not send a bearer token or clear the session for login failure', async () => {
    setAccessToken('keep-me')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    await expect(
      post('/auth/login', { username: 'admin', password: 'wrong' }, { baseURL: origin }),
    ).rejects.toMatchObject({ code: 401, message: '用户名或密码错误' })
    expect(captured.map((item) => item.url)).toEqual(['/auth/login'])
    expect(captured[0]?.authorization).toBeUndefined()
    expect(redirects).toBe(0)
    expect(getAccessToken()).toBe('keep-me')
  })

  it('sends the bearer token and clears the session once for parallel 401 responses', async () => {
    setAccessToken('stale-token')
    let redirects = 0
    const messages: string[] = []
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    setErrorNotifier((error) => messages.push(error.message))
    const results = await Promise.allSettled([
      get('/secure', undefined, { baseURL: origin }),
      get('/secure', undefined, { baseURL: origin }),
    ])
    expect(results).toHaveLength(2)
    expect(captured.map((item) => item.url)).toEqual(['/secure', '/secure', '/auth/refresh'])
    expect(captured.map((item) => item.authorization)).toEqual([
      'Bearer stale-token',
      'Bearer stale-token',
      'Bearer stale-token',
    ])
    expect(redirects).toBe(1)
    expect(messages).toEqual(['未登录或登录已过期'])
    expect(getAccessToken()).toBeNull()
  })

  it('does not clear the session for 403', async () => {
    setAccessToken('still-valid')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    await expect(get('/forbidden', undefined, { baseURL: origin })).rejects.toMatchObject({
      code: 403,
      status: 403,
    })
    expect(captured.map((item) => item.url)).toEqual(['/forbidden'])
    expect(redirects).toBe(0)
    expect(getAccessToken()).toBe('still-valid')
  })

  it('refreshes once for parallel 401 responses and retries with the new token', async () => {
    refreshMode = 'grant'
    setAccessToken('stale-token')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    const results = await Promise.all([
      get<{ ok: boolean }>('/secure', undefined, { baseURL: origin }),
      get<{ ok: boolean }>('/secure', undefined, { baseURL: origin }),
    ])
    expect(results).toEqual([{ ok: true }, { ok: true }])
    expect(captured.filter((item) => item.url === '/auth/refresh')).toHaveLength(1)
    expect(captured.filter((item) => item.url === '/secure')).toHaveLength(4)
    expect(redirects).toBe(0)
    expect(getAccessToken()).toBe('renewed-token')
  })

  it('does not refresh a second time when the retried request is still unauthorized', async () => {
    refreshMode = 'rotate'
    setAccessToken('stale-token')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    await expect(get('/secure', undefined, { baseURL: origin })).rejects.toMatchObject({
      code: 401,
      message: '未登录或登录已过期',
    })
    expect(captured.filter((item) => item.url === '/auth/refresh')).toHaveLength(1)
    expect(captured.filter((item) => item.url === '/secure')).toHaveLength(2)
    expect(captured.map((item) => item.authorization)).toEqual([
      'Bearer stale-token',
      'Bearer stale-token',
      'Bearer renewed-token',
    ])
    expect(redirects).toBe(1)
    expect(getAccessToken()).toBeNull()
  })

  it('refreshes a business 401 without requiring an http 401', async () => {
    refreshMode = 'grant'
    setAccessToken('stale-token')
    await expect(get<{ ok: boolean }>('/expired', undefined, { baseURL: origin })).resolves.toEqual({
      ok: true,
    })
  })

  it('drops a refresh result that arrives after the session has changed', async () => {
    refreshMode = 'hang'
    setAccessToken('user-a')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    const pending = get('/secure', undefined, { baseURL: origin }).then(
      () => {
        throw new Error('旧请求不应成功')
      },
      (error: unknown) => error,
    )
    await waitForRefresh()
    clearAccessToken()
    setAccessToken('user-b')
    await waitFor(() => refreshAborted, '旧刷新没有在切换会话后中止')
    await expect(pending).resolves.toMatchObject({ message: '会话已变更' })
    expect(redirects).toBe(0)
    expect(getAccessToken()).toBe('user-b')
    expect(refreshCookieWrites).toBe(0)
  })

  it('keeps a newer session when its own 401 arrives while an older refresh is aborted', async () => {
    refreshMode = 'hang'
    setAccessToken('user-a')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    const stale = get('/secure', undefined, { baseURL: origin }).then(
      () => {
        throw new Error('旧请求不应成功')
      },
      (error: unknown) => error,
    )
    await waitForRefresh()
    clearAccessToken()
    setAccessToken('user-b')
    const current = get<{ ok: boolean }>('/secure', undefined, { baseURL: origin })
    await expect(stale).resolves.toMatchObject({ message: '会话已变更' })
    await expect(current).resolves.toEqual({ ok: true })
    expect(captured.filter((item) => item.url === '/auth/refresh')).toHaveLength(2)
    expect(redirects).toBe(0)
    expect(getAccessToken()).toBe('user-b-renewed')
    expect(refreshCookieWrites).toBe(0)
  })

  it('joins a direct refresh call to the in-flight refresh', async () => {
    refreshMode = 'hang'
    setApiBaseUrl(origin)
    setAccessToken('stale-token')
    try {
      const first = refreshToken()
      await waitForRefresh()
      const second = refreshToken()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(captured.filter((item) => item.url === '/auth/refresh')).toHaveLength(1)
      releaseRefresh?.()
      releaseRefresh = null
      await expect(Promise.all([first, second])).resolves.toEqual([
        { accessToken: 'stale-renewed', expireIn: 1800 },
        { accessToken: 'stale-renewed', expireIn: 1800 },
      ])
      expect(getAccessToken()).toBe('stale-renewed')
      expect(refreshCookieWrites).toBe(1)
    } finally {
      setApiBaseUrl('/api')
    }
  })

  it('attaches cookies only to login, refresh, and logout', async () => {
    const seen: { url?: string; withCredentials?: boolean }[] = []
    const adapter: NonNullable<InternalAxiosRequestConfig['adapter']> = (config) => {
      seen.push({ url: config.url, withCredentials: config.withCredentials })
      return Promise.resolve({
        data: { code: 200, msg: '操作成功', data: { accessToken: 'token-a', expireIn: 1800 } },
        status: 200,
        statusText: 'OK',
        headers: AxiosHeaders.from({ 'content-type': 'application/json' }),
        config,
      })
    }
    await post('/auth/login', { username: 'admin', password: 'admin123' }, { adapter })
    setAccessToken('token-a')
    await post('/auth/refresh', undefined, { adapter })
    await post('/auth/logout', undefined, { adapter })
    await get('/auth/userinfo', undefined, { adapter })
    expect(seen).toEqual([
      { url: '/auth/login', withCredentials: true },
      { url: '/auth/refresh', withCredentials: true },
      { url: '/auth/logout', withCredentials: true },
      { url: '/auth/userinfo', withCredentials: undefined },
    ])
  })

  it('stores a directly requested refresh token', async () => {
    refreshMode = 'grant'
    setApiBaseUrl(origin)
    setAccessToken('stale-token')
    try {
      await expect(refreshToken()).resolves.toMatchObject({
        accessToken: 'renewed-token',
        expireIn: 1800,
      })
      expect(getAccessToken()).toBe('renewed-token')
    } finally {
      setApiBaseUrl('/api')
    }
  })

  it('does not refresh or clear a newer session when an older request returns 401', async () => {
    setAccessToken('user-a')
    const pending = get('/hold', undefined, { baseURL: origin })
    await waitForPath('/hold')
    clearAccessToken()
    setAccessToken('user-b')
    holdStatus = 'unauthorized'
    releaseHold?.()
    releaseHold = null
    await expect(pending).rejects.toMatchObject({ code: 401 })
    expect(captured.some((item) => item.url === '/auth/refresh')).toBe(false)
    expect(getAccessToken()).toBe('user-b')
  })
})

async function waitFor(ready: () => boolean, label: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (ready()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(label)
}

async function waitForPath(pathname: string): Promise<void> {
  await waitFor(
    () => captured.some((item) => item.url === pathname),
    `未观察到请求 ${pathname}`,
  )
}

async function waitForRefresh(): Promise<void> {
  await waitForPath('/auth/refresh')
}

describe('request verbs', () => {
  it('sends a delete body and put query without a null body', async () => {
    await del('/sys/user', [1, 2], { baseURL: origin })
    await put('/sys/user/8/status', null, { baseURL: origin, params: { enabled: false } })
    expect(captured[0]).toMatchObject({ method: 'DELETE', body: '[1,2]' })
    expect(captured[1]?.method).toBe('PUT')
    expect(captured[1]?.url).toContain('enabled=false')
    expect(captured[1]?.body).toBe('')
  })
})

describe('request upload', () => {
  it('lets the adapter add a multipart boundary for FormData', async () => {
    const form = new FormData()
    form.append('file', new Blob(['hello']), 'note.txt')
    form.append('bizType', 'ray-web-stage2')
    await post('/upload', form, {
      baseURL: origin,
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    expect(captured[0]?.contentType).toMatch(/multipart\/form-data;\s*boundary=/i)
    expect(captured[0]?.body).toContain('ray-web-stage2')
    expect(captured[0]?.body).toContain('hello')
  })
})

describe('request blob', () => {
  function blobAdapter(
    status: number,
    blob: Blob,
    headers: Record<string, string>,
  ): NonNullable<InternalAxiosRequestConfig['adapter']> {
    return (config) => {
      const response = {
        data: blob,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: AxiosHeaders.from(headers),
        config,
      }
      if (status >= 200 && status < 300) return Promise.resolve(response)
      return Promise.reject(
        new AxiosError(
          `Request failed with status code ${status}`,
          AxiosError.ERR_BAD_REQUEST,
          config,
          null,
          response,
        ),
      )
    }
  }

  it('returns a file blob without unwrapping json content', async () => {
    const file = new Blob([JSON.stringify({ name: 'quarterly-report' })], {
      type: 'application/json',
    })
    const data = await get<Blob>('/sys/file/download', undefined, {
      baseURL: origin,
      responseType: 'blob',
      adapter: blobAdapter(200, file, {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="quarterly-report.json"',
      }),
    })
    expect(data).toBe(file)
    await expect(data.text()).resolves.toContain('quarterly-report')
  })

  it('does not treat a success-shaped json document as an R payload', async () => {
    const file = new Blob([JSON.stringify({ code: 200, msg: '操作成功', data: { id: 1 } })], {
      type: 'application/json',
    })
    const data = await get<Blob>('/sys/file/download', undefined, {
      responseType: 'blob',
      adapter: blobAdapter(200, file, { 'content-type': 'application/json' }),
    })
    expect(await data.text()).toContain('"data"')
  })

  it('rejects a json blob that carries a business error', async () => {
    const file = new Blob([JSON.stringify({ code: 555, msg: '文件不存在', data: null })], {
      type: 'application/json',
    })
    await expect(
      get('/sys/file/download', undefined, {
        responseType: 'blob',
        adapter: blobAdapter(200, file, { 'content-type': 'application/json' }),
      }),
    ).rejects.toMatchObject({ code: 555, message: '文件不存在' })
  })

  it('reads a business message from an http error blob', async () => {
    setAccessToken('stale-token')
    let redirects = 0
    setUnauthorizedHandler(() => {
      redirects += 1
    })
    const file = new Blob([JSON.stringify({ code: 401, msg: '未登录或登录已过期', data: null })], {
      type: 'application/json',
    })
    await expect(
      get('/sys/file/download', undefined, {
        baseURL: origin,
        responseType: 'blob',
        adapter: blobAdapter(401, file, { 'content-type': 'application/json' }),
      }),
    ).rejects.toMatchObject({ code: 401, status: 401, message: '未登录或登录已过期' })
    expect(redirects).toBe(1)
    expect(getAccessToken()).toBeNull()
  })
})

describe('request cancellation', () => {
  it('does not notify when the caller aborts', async () => {
    const messages: string[] = []
    setErrorNotifier((error) => messages.push(error.message))
    const controller = new AbortController()
    const pending = get('/slow', undefined, { baseURL: origin, signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toSatisfy((error: unknown) => isCancel(error))
    expect(messages).toEqual([])
  })
})
