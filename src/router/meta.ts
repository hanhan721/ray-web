export const LOGIN_NAME = 'login'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    title?: string
    icon?: string
    hidden?: boolean
    keepAlive?: boolean
    permission?: string
  }
}
