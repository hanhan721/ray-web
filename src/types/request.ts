import type { AxiosRequestConfig } from 'axios'

export interface RequestConfig extends AxiosRequestConfig {
  showErrorMessage?: boolean
}
