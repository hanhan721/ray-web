/**
 * Vue Router 模块扩展
 * 必须有 export {} 才能正确扩展模块而非覆盖
 */
export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    requiresAuth?: boolean
    roles?: string[]
    permissions?: string[]
    keepAlive?: boolean
    hidden?: boolean
    order?: number
  }
}
