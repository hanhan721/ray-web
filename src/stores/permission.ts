import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import type { PermissionTree } from '@/types/permission'
import { generateRoutes, extractPermissions, filterVisibleMenus } from '@/utils/routeHelper'

export const usePermissionStore = defineStore('permission', () => {
  // State
  const menus = ref<PermissionTree[]>([])
  // 使用 shallowRef 避免 vue-router 4.6 类型系统的深层检查问题
  const routes = shallowRef<RouteRecordRaw[]>([])
  const permissions = ref<Set<string>>(new Set())
  const isRoutesGenerated = ref(false)

  // Getters
  /** 可见菜单（侧边栏用） */
  const visibleMenus = computed(() => filterVisibleMenus(menus.value))

  // Actions
  /**
   * 设置菜单数据并生成路由
   * @param menuList 菜单列表
   * @param permissionCodes 后端直接返回的权限码列表
   */
  function setMenus(menuList: PermissionTree[], permissionCodes?: string[]) {
    menus.value = menuList
    const extracted = extractPermissions(menuList)
    if (permissionCodes?.length) {
      for (const code of permissionCodes) {
        extracted.add(code)
      }
    }
    permissions.value = extracted
  }

  /**
   * 生成动态路由
   * @returns 生成的路由配置
   */
  function generateDynamicRoutes(): RouteRecordRaw[] {
    if (isRoutesGenerated.value) {
      return routes.value
    }

    const dynamicRoutes = generateRoutes(menus.value)
    routes.value = dynamicRoutes
    isRoutesGenerated.value = true

    return dynamicRoutes
  }

  /**
   * 检查是否有指定权限
   * @param code 权限标识
   */
  function hasPermission(code: string): boolean {
    return permissions.value.has(code)
  }

  /**
   * 检查是否有指定权限列表中的任意一个
   * @param codes 权限标识列表
   */
  function hasAnyPermission(codes: string[]): boolean {
    return codes.some((code) => permissions.value.has(code))
  }

  /**
   * 检查是否有指定权限列表中的全部权限
   * @param codes 权限标识列表
   */
  function hasAllPermissions(codes: string[]): boolean {
    return codes.every((code) => permissions.value.has(code))
  }

  /**
   * 重置状态
   */
  function reset() {
    menus.value = []
    routes.value = []
    permissions.value = new Set()
    isRoutesGenerated.value = false
  }

  return {
    // State
    menus,
    routes,
    permissions,
    isRoutesGenerated,
    // Getters
    visibleMenus,
    // Actions
    setMenus,
    generateDynamicRoutes,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    reset,
  }
})
