import type { AxiosRequestConfig } from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    showErrorMessage?: boolean
  }
}

export interface RequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
}
