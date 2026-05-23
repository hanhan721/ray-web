import { createRouter, createWebHistory } from 'vue-router'
import { constantRoutes, basicRoutes } from './routes'
import { setupRouterGuard } from './guard'

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...constantRoutes, ...basicRoutes],
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

// 设置路由守卫
setupRouterGuard(router)

export default router
