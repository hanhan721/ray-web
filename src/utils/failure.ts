import { RequestError } from '@/utils/request'

/** 关闭请求层的自动错误提示，由页面自己展示。 */
export const QUIET = { showErrorMessage: false } as const

/** 优先使用后端业务信息，没有时回退到调用方给的文案。 */
export function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestError && error.message) return error.message
  return fallback
}
