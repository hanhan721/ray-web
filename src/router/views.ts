import type { RouteRecordRaw } from 'vue-router'

export type ViewLoader = NonNullable<RouteRecordRaw['component']>

const pending = () => import('@/views/module-pending/ModulePending.vue')

/** 只映射本地明确存在的页面。后端 component 字符串不会被当作路径执行。 */
export const viewLoaders: Record<string, ViewLoader> = {
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'system/role/index': () => import('@/views/system/role/index.vue'),
  'system/dept/index': () => import('@/views/system/dept/index.vue'),
  'system/menu/index': () => import('@/views/system/menu/index.vue'),
  'system/dict/index': () => import('@/views/system/dict/index.vue'),
  'system/param/index': pending,
  'system/online/index': pending,
  'schedule/job/index': pending,
}
