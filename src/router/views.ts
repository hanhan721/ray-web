import type { RouteRecordRaw } from 'vue-router'

export type ViewLoader = NonNullable<RouteRecordRaw['component']>

const pending = () => import('@/views/module-pending/ModulePending.vue')

/** 只映射本地明确存在的页面。后端 component 字符串不会被当作路径执行。 */
export const viewLoaders: Record<string, ViewLoader> = {
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'system/role/index': pending,
  'system/dept/index': pending,
  'system/menu/index': pending,
  'system/dict/index': pending,
  'system/param/index': pending,
  'system/online/index': pending,
  'schedule/job/index': pending,
}
