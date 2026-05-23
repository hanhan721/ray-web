/**
 * 权限指令 (v-permission)
 *
 * 功能：
 * - 支持单个权限码
 * - 支持多个权限码（OR 逻辑，满足任一即可）
 * - 无权限时隐藏元素（从 DOM 移除）
 *
 * 使用示例：
 * <n-button v-permission="'sys:user:add'">新增</n-button>
 * <n-button v-permission="['sys:user:edit', 'sys:user:add']">编辑</n-button>
 */
import type { App, Directive, DirectiveBinding } from 'vue'
import { usePermissionStore } from '@/stores/permission'

export interface PermissionDirectiveBinding {
  value: string | string[]
}

/**
 * 检查权限
 * @param binding 指令绑定值
 * @returns 是否有权限
 */
function checkPermission(binding: DirectiveBinding<string | string[]>): boolean {
  const permissionStore = usePermissionStore()
  const { value } = binding

  if (!value) {
    return true
  }

  if (Array.isArray(value)) {
    return permissionStore.hasAnyPermission(value)
  }

  return permissionStore.hasPermission(value)
}

const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    if (!checkPermission(binding)) {
      // 保存父节点和占位符，用于后续可能的恢复
      const comment = document.createComment('v-permission')
      el.parentNode?.replaceChild(comment, el)
      // 保存引用以便 unmounted 时清理
      ;(el as unknown as { _permissionComment?: Comment })._permissionComment = comment
    }
  },
  updated(el, binding) {
    const hasPermission = checkPermission(binding)
    const comment = (el as unknown as { _permissionComment?: Comment })._permissionComment

    if (hasPermission && comment?.parentNode) {
      // 有权限且当前是注释节点，恢复元素
      comment.parentNode.replaceChild(el, comment)
      ;(el as unknown as { _permissionComment?: Comment })._permissionComment = undefined
    } else if (!hasPermission && el.parentNode) {
      // 无权限且当前是元素，替换为注释
      const newComment = document.createComment('v-permission')
      el.parentNode.replaceChild(newComment, el)
      ;(el as unknown as { _permissionComment?: Comment })._permissionComment = newComment
    }
  },
}

/**
 * 注册权限指令
 * @param app Vue 应用实例
 */
export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}

export default permissionDirective
