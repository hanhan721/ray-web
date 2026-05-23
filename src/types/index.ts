/**
 * 类型统一导出
 *
 * 使用方式：
 * import type { Permission, PermissionTree } from '@/types'
 * import { Gender, GenderLabel } from '@/types'
 */

// 枚举类型和常量
export * from './enums'

// 权限相关类型
export * from './permission'

// 全局类型已在 global.d.ts 中声明，无需导入即可使用：
// R<T>, IPage<T>, PageQuery, WithChildren<T>, FormType<T>, IdSet
