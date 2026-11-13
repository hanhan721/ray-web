import type { AxiosRequestConfig } from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 请求层内部标记：这次调用已经因 401 重放过，不能再进入刷新。 */
    authRetry?: boolean
  }
}

export type RequestConfig = AxiosRequestConfig
