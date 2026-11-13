/** 页面保留操作上下文，具体接口错误由全局消息提示。 */
export function failureMessage(_error: unknown, fallback: string): string {
  return fallback
}
