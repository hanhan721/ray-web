/**
 * 自定义指令统一注册
 */
import type { App } from 'vue'
import { setupPermissionDirective } from './permission'

/**
 * 注册所有自定义指令
 * @param app Vue 应用实例
 */
export function setupDirectives(app: App) {
  setupPermissionDirective(app)
}

export { setupPermissionDirective } from './permission'
