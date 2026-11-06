import axios, { isCancel } from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { ResponseCode } from '@/types/enums'
import type { RequestConfig } from '@/types/request'

const ACCESS_TOKEN_KEY = 'ray.accessToken'
const LOGIN_PATHS = new Set(['/auth/login', '/api/auth/login'])
const REFRESH_PATHS = new Set(['/auth/refresh', '/api/auth/refresh'])
const CREDENTIAL_PATHS = new Set([
  ...LOGIN_PATHS,
  ...REFRESH_PATHS,
  '/auth/logout',
  '/api/auth/logout',
])
const MAX_ERROR_JSON_BYTES = 1024 * 1024

const STATUS_MESSAGE: Record<number, string> = {
  400: '请求参数错误',
  401: '未登录或登录已过期',
  403: '无访问权限',
  404: '资源不存在',
  405: '请求方法不支持',
  408: '请求超时',
  429: '请求过于频繁',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂不可用',
  504: '网关超时',
}

export class RequestError extends Error {
  readonly code: number | undefined
  readonly status: number | undefined
  readonly payload: unknown

  constructor(
    message: string,
    options?: {
      code?: number
      status?: number
      payload?: unknown
      cause?: unknown
    },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'RequestError'
    this.code = options?.code
    this.status = options?.status
    this.payload = options?.payload
  }
}

type ErrorNotifier = (error: RequestError) => void
type UnauthorizedHandler = () => void

let notifier: ErrorNotifier | null = null
let unauthorizedHandler: UnauthorizedHandler | null = null
let accessWave = 0
let handledWave = -1
let sessionEpoch = 0

type RefreshResult = { accessToken: string; expireIn: number }
type RefreshFlight = {
  epoch: number
  promise: Promise<RefreshResult>
  abort: () => void
}
let refreshFlight: RefreshFlight | null = null

function cancelRefresh(): void {
  const flight = refreshFlight
  refreshFlight = null
  flight?.abort()
}

function defaultBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof configured === 'string' && configured.length > 0) return configured
  return '/api'
}

const client = axios.create({
  baseURL: defaultBaseUrl(),
})

export function setApiBaseUrl(baseURL: string): void {
  client.defaults.baseURL = baseURL
}

export function setErrorNotifier(next: ErrorNotifier | null): void {
  notifier = next
}

export function setUnauthorizedHandler(next: UnauthorizedHandler | null): void {
  unauthorizedHandler = next
}

function session(): Storage {
  if (typeof sessionStorage === 'undefined') {
    throw new Error('sessionStorage 不可用，无法保存访问令牌')
  }
  return sessionStorage
}

export function getAccessToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const value = sessionStorage.getItem(ACCESS_TOKEN_KEY)
  return value && value.length > 0 ? value : null
}

export function getSessionEpoch(): number {
  return sessionEpoch
}

export function setAccessToken(token: string, options?: { rotate?: boolean }): void {
  accessWave += 1
  if (!options?.rotate) {
    sessionEpoch += 1
    // 取消上一代已发出的刷新，避免浏览器收下旧响应里的 Set-Cookie。
    cancelRefresh()
  }
  session().setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  sessionEpoch += 1
  cancelRefresh()
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

function pathnameOf(config: { url?: string; baseURL?: string }): string {
  const url = config.url ?? ''
  const pathOnly = (value: string) => value.split('?')[0]?.replace(/\/+$/, '') || '/'
  if (/^https?:\/\//i.test(url)) return pathOnly(new URL(url).pathname)
  const base = config.baseURL ?? ''
  if (/^https?:\/\//i.test(base)) {
    const absolute = `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
    return pathOnly(new URL(absolute).pathname)
  }
  const relative = `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
  return pathOnly(relative.startsWith('/') ? relative : `/${relative}`)
}

function isAuthPost(
  config: { url?: string; baseURL?: string; method?: string } | undefined,
  paths: Set<string>,
): boolean {
  if (!config || (config.method ?? 'get').toLowerCase() !== 'post') return false
  return paths.has(pathnameOf(config))
}

function isLoginRequest(
  config: { url?: string; baseURL?: string; method?: string } | undefined,
): boolean {
  return isAuthPost(config, LOGIN_PATHS)
}

function isRefreshRequest(
  config: { url?: string; baseURL?: string; method?: string } | undefined,
): boolean {
  return isAuthPost(config, REFRESH_PATHS)
}

function sendsCredentials(
  config: { url?: string; baseURL?: string; method?: string } | undefined,
): boolean {
  return isAuthPost(config, CREDENTIAL_PATHS)
}

function isUnauthorized(error: RequestError): boolean {
  return error.code === ResponseCode.UNAUTHORIZED || error.status === ResponseCode.UNAUTHORIZED
}

function endSession(error: RequestError, config: { showErrorMessage?: boolean } | undefined): void {
  const first = handledWave !== accessWave
  if (!first) return
  handledWave = accessWave
  clearAccessToken()
  unauthorizedHandler?.()
  if (config?.showErrorMessage !== false) notifier?.(error)
}

function present(
  error: RequestError,
  config:
    { url?: string; baseURL?: string; method?: string; showErrorMessage?: boolean } | undefined,
): RequestError {
  if (isUnauthorized(error) && !isLoginRequest(config)) endSession(error, config)
  else if (config?.showErrorMessage !== false) notifier?.(error)
  return error
}

function fail(error: RequestError, config: RequestConfig | undefined): never {
  throw present(error, config)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readEnvelope(value: unknown): { code: number; msg: string; data: unknown } | null {
  if (!isRecord(value) || typeof value.code !== 'number') return null
  const message = value.msg ?? value.message
  if (typeof message !== 'string') return null
  return { code: value.code, msg: message, data: value.data }
}

function statusMessage(status: number | undefined): string | undefined {
  if (status === undefined) return undefined
  return STATUS_MESSAGE[status] ?? `请求失败（${status}）`
}

function networkMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return '请求超时，请稍后重试'
  return '网络连接失败，请稍后重试'
}

function headerText(headers: AxiosResponse['headers'], name: string): string {
  if (!isRecord(headers) || typeof headers.get !== 'function') return ''
  const value: unknown = headers.get(name)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(', ')
  return ''
}

async function readBlobEnvelope(
  blob: Blob,
  headers: AxiosResponse['headers'],
): Promise<{ code: number; msg: string; payload: unknown } | null> {
  const disposition = headerText(headers, 'content-disposition')
  if (/attachment|filename\s*=/i.test(disposition)) return null
  const contentType = `${headerText(headers, 'content-type')} ${blob.type}`.toLowerCase()
  const isJson =
    contentType.includes('application/json') ||
    contentType.includes('+json') ||
    contentType.includes('text/json')
  if (!isJson || blob.size > MAX_ERROR_JSON_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(await blob.text()) as unknown
  } catch {
    return null
  }
  const envelope = readEnvelope(parsed)
  if (!envelope || envelope.code === ResponseCode.SUCCESS) return null
  return { code: envelope.code, msg: envelope.msg, payload: parsed }
}

async function readErrorBody(
  data: unknown,
  headers: AxiosResponse['headers'] | undefined,
): Promise<{ code?: number; msg?: string; payload: unknown }> {
  if (data instanceof Blob) {
    const envelope = await readBlobEnvelope(data, headers ?? {})
    return envelope
      ? { code: envelope.code, msg: envelope.msg, payload: envelope.payload }
      : { payload: data }
  }
  const parsed = typeof data === 'string' ? parseJson(data) : data
  const envelope = readEnvelope(parsed)
  if (!envelope) return { payload: parsed }
  return { code: envelope.code, msg: envelope.msg, payload: parsed }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

client.interceptors.request.use((config) => {
  // file.ts 传入的 multipart Content-Type 没有 boundary。Axios 1.21 的 XHR 适配器不会改写该头，
  // 浏览器只在未设置 Content-Type 时生成 boundary；Node 的 formDataToStream 会自行补上。
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  if (sendsCredentials(config)) config.withCredentials = true
  if (!isLoginRequest(config)) {
    const token = getAccessToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (isCancel(error)) return Promise.reject(error)
    if (!axios.isAxiosError(error)) {
      const fallback = error instanceof Error ? error : new RequestError('请求失败')
      return Promise.reject(fallback)
    }
    const body = await readErrorBody(error.response?.data, error.response?.headers)
    return Promise.reject(
      new RequestError(body.msg ?? statusMessage(error.response?.status) ?? networkMessage(error), {
        code: body.code,
        status: error.response?.status,
        payload: body.payload,
        cause: error,
      }),
    )
  },
)

async function unwrapResponse(response: AxiosResponse<unknown>): Promise<unknown> {
  const responseType = response.config.responseType
  if (responseType === 'blob' || responseType === 'arraybuffer') {
    if (response.data instanceof Blob) {
      const businessError = await readBlobEnvelope(response.data, response.headers)
      if (businessError) {
        throw new RequestError(businessError.msg, {
          code: businessError.code,
          status: response.status,
          payload: businessError.payload,
        })
      }
    }
    return response.data
  }

  const envelope = readEnvelope(response.data)
  if (!envelope) {
    throw new RequestError('响应格式无法识别', { status: response.status, payload: response.data })
  }
  if (envelope.code !== ResponseCode.SUCCESS) {
    throw new RequestError(envelope.msg, {
      code: envelope.code,
      status: response.status,
      payload: response.data,
    })
  }
  return envelope.data
}

function shouldRefresh(error: unknown, config: RequestConfig): error is RequestError {
  return (
    error instanceof RequestError &&
    isUnauthorized(error) &&
    config.authRetry !== true &&
    !isLoginRequest(config) &&
    !isRefreshRequest(config) &&
    getAccessToken() !== null
  )
}

function readRefreshResult(data: unknown): RefreshResult | null {
  if (!isRecord(data)) return null
  const accessToken = data.accessToken
  const expireIn = data.expireIn
  if (typeof accessToken !== 'string' || accessToken.length === 0) return null
  if (typeof expireIn !== 'number' || !Number.isFinite(expireIn)) return null
  return { accessToken, expireIn }
}

function sessionChanged(): RequestError {
  return new RequestError('会话已变更', { code: 401, status: 401 })
}

async function refreshOnce(config: RequestConfig): Promise<RefreshResult> {
  const epoch = sessionEpoch
  if (refreshFlight?.epoch === epoch) return refreshFlight.promise
  cancelRefresh()
  const previous = getAccessToken()
  const controller = new AbortController()
  const promise = (async () => {
    if (!previous) throw new RequestError('未登录或登录已过期', { code: 401, status: 401 })
    let response: AxiosResponse<unknown>
    try {
      response = await client.request<unknown>({
        method: 'post',
        url: '/auth/refresh',
        baseURL: config.baseURL,
        adapter: config.adapter,
        showErrorMessage: false,
        signal: controller.signal,
      })
    } catch (error) {
      if (sessionEpoch !== epoch || getAccessToken() !== previous) throw sessionChanged()
      throw error
    }
    if (sessionEpoch !== epoch || getAccessToken() !== previous) throw sessionChanged()
    const data = await unwrapResponse(response)
    if (sessionEpoch !== epoch || getAccessToken() !== previous) throw sessionChanged()
    const next = readRefreshResult(data)
    if (!next) throw new RequestError('刷新登录状态失败', { code: 401, status: 401 })
    setAccessToken(next.accessToken, { rotate: true })
    return next
  })()
  const flight: RefreshFlight = { epoch, promise, abort: () => controller.abort() }
  promise.then(
    () => {
      if (refreshFlight === flight) refreshFlight = null
    },
    () => {
      if (refreshFlight === flight) refreshFlight = null
    },
  )
  refreshFlight = flight
  return promise
}

async function refreshThrough<T>(config: RequestConfig): Promise<T> {
  const epoch = sessionEpoch
  try {
    return (await refreshOnce(config)) as T
  } catch (error) {
    if (sessionEpoch !== epoch) {
      if (error instanceof RequestError) throw error
      throw error
    }
    if (isCancel(error)) throw error
    if (error instanceof RequestError) {
      if (isUnauthorized(error)) fail(error, config)
      endSession(error, config)
      throw error
    }
    throw error
  }
}

function refreshFailure(original: RequestError, caught: unknown): RequestError {
  if (!(caught instanceof RequestError)) return original
  if (caught.status === undefined && caught.code === undefined) return caught
  return original
}

async function dispatch<T>(config: RequestConfig): Promise<T> {
  const response = await client.request<unknown>(config)
  // 运行时已按 R<T> 解包，或按 Blob 原样返回；Axios 无法从拦截器表达这个结果。
  return (await unwrapResponse(response)) as T
}

async function send<T>(config: RequestConfig): Promise<T> {
  if (isRefreshRequest(config)) return refreshThrough(config)
  const epoch = sessionEpoch
  try {
    return await dispatch(config)
  } catch (error) {
    if (isCancel(error) || !(error instanceof RequestError)) throw error
    // 会话已经切换时，这是上一个身份的结果，不能刷新或清理新会话。
    if (sessionEpoch !== epoch) throw error
    // 401 表示鉴权阶段拒绝了请求，原请求最多重放一次。超时和写操作的未知结果不重放。
    if (!shouldRefresh(error, config)) fail(error, config)
    try {
      await refreshOnce(config)
    } catch (caught) {
      if (sessionEpoch !== epoch) {
        if (caught instanceof RequestError) throw caught
        throw error
      }
      const terminal = refreshFailure(error, caught)
      if (isUnauthorized(terminal)) fail(terminal, config)
      endSession(terminal, config)
      throw terminal
    }
    try {
      return await dispatch({ ...config, authRetry: true })
    } catch (retryError) {
      if (isCancel(retryError)) throw retryError
      if (sessionEpoch !== epoch) {
        if (retryError instanceof RequestError) throw retryError
        throw error
      }
      if (retryError instanceof RequestError) fail(retryError, { ...config, authRetry: true })
      throw retryError
    }
  }
}

function withoutNullBody(data: unknown): unknown {
  return data == null ? undefined : data
}

export function get<T>(url: string, params?: object, config?: RequestConfig): Promise<T> {
  return send<T>({
    ...config,
    method: 'get',
    url,
    params: {
      ...(params ?? {}),
      ...(isRecord(config?.params) ? config.params : {}),
    },
  })
}

export function post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return send<T>({
    ...config,
    method: 'post',
    url,
    data: withoutNullBody(data),
  })
}

export function put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return send<T>({
    ...config,
    method: 'put',
    url,
    data: withoutNullBody(data),
  })
}

export function del<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return send<T>({
    ...config,
    method: 'delete',
    url,
    data: withoutNullBody(data),
  })
}
