import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'
import { notFoundRoute } from './routes'

// 白名单路由（无需登录）
const whiteList = ['/login', '/403', '/404']

/**
 * 设置路由守卫
 */
export function setupRouterGuard(router: Router) {
  // 记录是否已添加动态路由
  let hasAddedDynamicRoutes = false
  // 记录是否已初始化标签页
  let hasInitializedTabs = false

  router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // 设置页面标题
    document.title = `${to.meta.title || ''} - Ray Admin`

    const userStore = useUserStore()
    const permissionStore = usePermissionStore()
    const tabsStore = useTabsStore()

    // 从 localStorage 恢复 token
    if (!userStore.token) {
      userStore.initFromStorage()
    }

    // 白名单路由直接放行
    if (whiteList.includes(to.path)) {
      // 已登录访问登录页，重定向到首页
      if (to.path === '/login' && userStore.isLoggedIn) {
        next({ path: '/dashboard' })
        return
      }
      next()
      return
    }

    // 未登录，跳转登录页
    if (!userStore.isLoggedIn) {
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }

    // 已登录，检查 Token 是否即将过期，尝试提前刷新
    if (userStore.isTokenExpiringSoon()) {
      try {
        await userStore.silentRefresh()
      } catch {
        await userStore.logout()
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
      }
    }

    // 检查是否需要获取用户信息和生成动态路由
    if (!userStore.userInfo) {
      try {
        // 获取用户信息（包含菜单）
        await userStore.fetchUserInfo()
      } catch {
        // 获取用户信息失败，可能 token 过期
        await userStore.logout()
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
      }
    }

    // 生成动态路由（仅执行一次）
    if (!hasAddedDynamicRoutes && permissionStore.menus.length > 0) {
      const dynamicRoutes = permissionStore.generateDynamicRoutes()

      // 添加动态路由（避免重复添加）
      dynamicRoutes.forEach((route) => {
        if (route.name && !router.hasRoute(route.name)) {
          router.addRoute(route)
        }
      })

      // 添加 404 兜底路由（必须最后添加）
      if (!router.hasRoute('NotFoundRedirect')) {
        router.addRoute(notFoundRoute)
      }

      hasAddedDynamicRoutes = true

      // 重新导航到目标路由（确保动态路由已生效）
      next({ ...to, replace: true })
      return
    }

    // 初始化标签页状态（仅执行一次）
    if (!hasInitializedTabs && userStore.isLoggedIn) {
      tabsStore.loadFromStorage()
      hasInitializedTabs = true
    }

    next()
  })

  // 路由错误处理
  router.onError((error: Error) => {
    console.error('[路由错误]', error)
  })
}

/**
 * 重置路由守卫状态（退出登录时调用）
 */
export function resetRouter(router: Router) {
  const permissionStore = usePermissionStore()
  const tabsStore = useTabsStore()

  // 移除动态添加的路由
  permissionStore.routes.forEach((route) => {
    if (route.name) {
      router.removeRoute(route.name)
    }
  })

  // 移除 404 兜底路由
  if (router.hasRoute('NotFoundRedirect')) {
    router.removeRoute('NotFoundRedirect')
  }

  // 重置权限状态
  permissionStore.reset()

  // 重置标签页状态
  tabsStore.reset()
}
