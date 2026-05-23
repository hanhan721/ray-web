import type { RouteRecordRaw } from 'vue-router'
import type { PermissionVO } from '@/types/permission'
import { AdminLayout } from '@/layouts'

// 动态导入视图组件
const viewModules = import.meta.glob('../views/**/*.vue')

/**
 * 加载视图组件
 * @param component 组件路径，如 'system/user/index'
 */
function loadView(component: string) {
  const path = `../views/${component.trim()}.vue`
  if (viewModules[path]) {
    return viewModules[path]
  }
  console.warn(`[路由] 组件不存在: ${component}`)
  return () => import('@/views/error/404.vue')
}

/**
 * 将菜单树转换为路由配置
 * @param menus 菜单列表
 * @returns 路由配置数组（类型安全）
 */
export function generateRoutes(menus: PermissionVO[]): RouteRecordRaw[] {
  const routes = generateRoutesInternal(menus) as RouteRecordRaw[]

  // 顶层 MENU 路由需要包裹 AdminLayout，否则不会显示侧边栏和顶栏
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    if (route.component && route.component !== AdminLayout) {
      routes[i] = {
        path: route.path,
        component: AdminLayout,
        name: `${String(route.name)}Layout`,
        meta: { ...route.meta },
        children: [{ ...route, path: '' }],
      } as RouteRecordRaw
    }
  }

  return routes
}

/**
 * 内部生成路由配置
 */
 
function generateRoutesInternal(menus: PermissionVO[]): any[] {
  const routes = []

  for (const menu of menus) {
    // 跳过禁用的菜单和按钮类型
    if (!menu.enabled || menu.type === 'BUTTON') {
      continue
    }

    const route = {
      path: menu.url,
      name: menu.routeName || menu.name,
      meta: {
        title: menu.name,
        icon: menu.icon,
        hidden: menu.hidden ?? false,
        keepAlive: menu.keepAlive ?? false,
        requiresAuth: true,
      },
      redirect: menu.redirect || undefined,
      component: undefined as unknown,
      children: undefined as unknown,
    }

    // 判断是否为布局容器（目录类型，或者 component 为 Layout 的菜单，或者有子菜单的父级菜单）
    const isLayout =
      menu.type === 'DIRECTORY' || menu.component === 'Layout' || (menu.children?.length && !menu.component)

    if (isLayout) {
      // 布局容器：使用 AdminLayout，递归处理子菜单
      route.component = AdminLayout
      if (menu.children?.length) {
        route.children = generateRoutesInternal(menu.children)
        // 如果没有设置 redirect，默认重定向到第一个子路由
         
        if (!route.redirect && (route.children as any[]).length > 0) {
           
          const firstChild = (route.children as any[])[0]
          route.redirect = `${menu.url}/${firstChild.path}`.replace(/\/+/g, '/')
        }
      }
    }
    // 菜单类型：加载对应的视图组件
    else if (menu.type === 'MENU') {
      if (menu.component) {
        route.component = loadView(menu.component)
      }
      // 如果菜单有子菜单（嵌套路由）
      if (menu.children?.length) {
        route.children = generateRoutesInternal(menu.children)
      }
    }

    routes.push(route)
  }

  return routes
}

/**
 * 从菜单树中提取所有权限标识
 * @param menus 菜单列表
 */
export function extractPermissions(menus: PermissionVO[]): Set<string> {
  const permissions = new Set<string>()

  function traverse(items: PermissionVO[]) {
    for (const item of items) {
      if (item.code) {
        permissions.add(item.code)
      }
      if (item.children?.length) {
        traverse(item.children)
      }
    }
  }

  traverse(menus)
  return permissions
}

/**
 * 过滤出可见的菜单（用于侧边栏渲染）
 * @param menus 菜单列表
 */
export function filterVisibleMenus(menus: PermissionVO[]): PermissionVO[] {
  return menus
    .filter((menu) => menu.enabled && !menu.hidden && menu.type !== 'BUTTON')
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterVisibleMenus(menu.children) : undefined,
    }))
    .filter((menu) => menu.type === 'MENU' || (menu.children && menu.children.length > 0))
}

/**
 * 扁平化菜单树
 * @param menus 菜单列表
 */
export function flattenMenus(menus: PermissionVO[]): PermissionVO[] {
  const result: PermissionVO[] = []

  function traverse(items: PermissionVO[]) {
    for (const item of items) {
      result.push(item)
      if (item.children?.length) {
        traverse(item.children)
      }
    }
  }

  traverse(menus)
  return result
}
