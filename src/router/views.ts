import type { RouteRecordRaw } from 'vue-router'

export type ViewLoader = NonNullable<RouteRecordRaw['component']>

/** 只映射本地明确存在的页面。后端 component 字符串不会被当作路径执行。 */
export const viewLoaders: Record<string, ViewLoader> = {
  'system/user/index': () => import('@/views/system/user/index.vue'),
  'system/role/index': () => import('@/views/system/role/index.vue'),
  'system/dept/index': () => import('@/views/system/dept/index.vue'),
  'system/menu/index': () => import('@/views/system/menu/index.vue'),
  'system/dict/index': () => import('@/views/system/dict/index.vue'),
  'system/param/index': () => import('@/views/system/param/index.vue'),
  'system/online/index': () => import('@/views/system/online/index.vue'),
  'system/file/index': () => import('@/views/system/file/index.vue'),
  'schedule/job/index': () => import('@/views/schedule/job/index.vue'),
}
