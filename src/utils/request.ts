import axios from 'axios'
import { ref } from 'vue'
import { createDiscreteApi, darkTheme } from 'naive-ui'
import type { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import router from '@/router'

export interface RequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
}

interface ApiResponse<T = any> {
  code?: number
  msg?: string
  message?: string
  data: T
}

const discreteConfigProps = ref({ theme: null as typeof darkTheme | null })

export function syncDiscreteTheme(isDark: boolean) {
  discreteConfigProps.value = { theme: isDark ? darkTheme : null }
}

const { message } = createDiscreteApi(['message'], {
  configProviderProps: discreteConfigProps as any,
})

function shouldShowErrorMessage(config?: AxiosRequestConfig): boolean {
  return (config as RequestConfig | undefined)?.showErrorMessage !== false
}

function getErrorMessage(data: unknown): string | undefined {
  if (!data) {
    return undefined
  }

  if (typeof data === 'string') {
    return data
  }

  if (typeof data === 'object') {
    const payload = data as Record<string, unknown>
    const messageText = payload.msg ?? payload.message ?? payload.error
    if (typeof messageText === 'string' && messageText.trim()) {
      return messageText
    }
  }

  return undefined
}

function isAuthRequest(url?: string): boolean {
  return !!url && url.startsWith('/auth/')
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
service.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { useUserStore } = await import('@/stores/user')
    const userStore = useUserStore()

    // 非 auth 请求：检查 Token 是否即将过期，提前刷新
    if (!isAuthRequest(config.url) && userStore.isLoggedIn && userStore.isTokenExpiringSoon()) {
      try {
        await userStore.silentRefresh()
      } catch {
        // 刷新失败，用旧 Token 继续，让 401 兜底
      }
    }

    // 设置 Authorization Header
    if (userStore.accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${userStore.accessToken}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse

    // 根据业务状态码处理
    if (data.code === 0 || data.code === 200) {
      return data.data as any
    }

    // 业务错误
    const errorMessage = getErrorMessage(data) || '请求失败'
    console.error('Business error:', errorMessage)

    if (shouldShowErrorMessage(response.config)) {
      message.error(errorMessage)
    }

    return Promise.reject(new Error(errorMessage))
  },
  async (error: AxiosError) => {
    // HTTP 错误处理
    const { response, config } = error
    let errorMessage = ''

    if (response) {
      const responseMessage = getErrorMessage(response.data)

      switch (response.status) {
        case 401: {
          const { useUserStore } = await import('@/stores/user')
          const userStore = useUserStore()

          // 非 auth 请求：尝试刷新 Token 并重试
          if (!isAuthRequest(config?.url)) {
            try {
              await userStore.silentRefresh()
              if (config) {
                config.headers.Authorization = `Bearer ${userStore.accessToken}`
                return service.request(config)
              }
            } catch {
              // 刷新失败，fall through 统一处理
            }
          }

          // 刷新失败或 auth 请求 401：清除状态跳转登录
          errorMessage = responseMessage || '登录状态已过期，请重新登录'
          await userStore.logout().catch(() => {})
          router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
          break
        }
        case 403:
          errorMessage = responseMessage || '没有权限访问该资源'
          break
        case 404:
          errorMessage = responseMessage || '请求的资源不存在'
          break
        case 500:
          errorMessage = responseMessage || '服务器内部错误'
          break
        default:
          errorMessage = responseMessage || `HTTP Error: ${response.status}`
      }
    } else {
      errorMessage = error.message || 'Network error'
    }

    if (shouldShowErrorMessage(config)) {
      message.error(errorMessage)
    }

    return Promise.reject(error)
  }
)

// 封装请求方法（响应拦截器已解包 data.data，直接返回业务数据）
export function request<T = unknown>(config: RequestConfig): Promise<T> {
  return service.request(config)
}

export function get<T = unknown>(url: string, params?: object, config?: RequestConfig): Promise<T> {
  return service.get(url, { params, ...config })
}

export function post<T = unknown>(url: string, data?: object, config?: RequestConfig): Promise<T> {
  return service.post(url, data, config)
}

export function put<T = unknown>(url: string, data?: object, config?: RequestConfig): Promise<T> {
  return service.put(url, data, config)
}

export function del<T = unknown>(url: string, data?: object, config?: RequestConfig): Promise<T> {
  return service.delete(url, { data, ...config })
}

export default service
