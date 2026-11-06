import { isAxiosError } from 'axios'

export function getRequestErrorMessage(cause: unknown, fallback: string): string {
  if (isAxiosError(cause)) {
    const payload: unknown = cause.response?.data
    if (payload && typeof payload === 'object') {
      const fields = payload as Record<string, unknown>
      const message = fields.msg ?? fields.message
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return cause instanceof Error && cause.message ? cause.message : fallback
}
