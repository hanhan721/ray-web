import axios, { isCancel } from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ResponseCode } from '@/types/enums'
import type { RequestConfig } from '@/types/request'

const ACCESS_TOKEN_KEY = 'ray.accessToken'
const LOGIN_PATHS = new Set(['/auth/login', '/api/auth/login'])
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

export function setAccessToken(token: string): void {
  accessWave += 1
  session().setItem(ACCESS_TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

function pathnameOf(config: InternalAxiosRequestConfig): string {
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

function isLoginRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config || (config.method ?? 'get').toLowerCase() !== 'post') return false
  return LOGIN_PATHS.has(pathnameOf(config))
}

function isUnauthorized(error: RequestError): boolean {
  return error.code === ResponseCode.UNAUTHORIZED || error.status === ResponseCode.UNAUTHORIZED
}

function present(
  error: RequestError,
  config: InternalAxiosRequestConfig | undefined,
): RequestError {
  let shouldNotify = config?.showErrorMessage !== false
  if (isUnauthorized(error) && !isLoginRequest(config)) {
    const first = handledWave !== accessWave
    if (first) {
      handledWave = accessWave
      clearAccessToken()
      unauthorizedHandler?.()
    } else {
      shouldNotify = false
    }
  }
  if (shouldNotify) notifier?.(error)
  return error
}

function fail(error: RequestError, config: InternalAxiosRequestConfig | undefined): never {
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
    const requestError = new RequestError(
      body.msg ?? statusMessage(error.response?.status) ?? networkMessage(error),
      {
        code: body.code,
        status: error.response?.status,
        payload: body.payload,
        cause: error,
      },
    )
    return Promise.reject(present(requestError, error.config))
  },
)

async function unwrapResponse(response: AxiosResponse<unknown>): Promise<unknown> {
  const responseType = response.config.responseType
  if (responseType === 'blob' || responseType === 'arraybuffer') {
    if (response.data instanceof Blob) {
      const businessError = await readBlobEnvelope(response.data, response.headers)
      if (businessError) {
        fail(
          new RequestError(businessError.msg, {
            code: businessError.code,
            status: response.status,
            payload: businessError.payload,
          }),
          response.config,
        )
      }
    }
    return response.data
  }

  const envelope = readEnvelope(response.data)
  if (!envelope) {
    fail(
      new RequestError('响应格式无法识别', { status: response.status, payload: response.data }),
      response.config,
    )
  }
  if (envelope.code !== ResponseCode.SUCCESS) {
    fail(
      new RequestError(envelope.msg, {
        code: envelope.code,
        status: response.status,
        payload: response.data,
      }),
      response.config,
    )
  }
  return envelope.data
}

async function send<T>(config: RequestConfig): Promise<T> {
  const response = await client.request<unknown>(config)
  // 运行时已按 R<T> 解包，或按 Blob 原样返回；Axios 无法从拦截器表达这个结果。
  return (await unwrapResponse(response)) as T
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
