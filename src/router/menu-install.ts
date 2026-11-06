import type { RouteRecordRaw, Router } from 'vue-router'
import type { PermissionVO } from '@/types/permission'
import { buildMenuRoutes } from './menu-routes'
import type { ViewLoader } from './views'

function collectNames(record: RouteRecordRaw, names: string[]) {
  if (typeof record.name === 'string') names.push(record.name)
  for (const child of record.children ?? []) collectNames(child, names)
}

export function installMenuRoutes(
  router: Router,
  menus: PermissionVO[],
  loaders: Record<string, ViewLoader>,
): string[] {
  const names: string[] = []
  for (const record of buildMenuRoutes(menus, loaders)) {
    router.addRoute('admin', record)
    collectNames(record, names)
  }
  return names
}

export function removeRouteNames(router: Router, names: string[]) {
  for (const name of [...names].reverse()) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }
}
