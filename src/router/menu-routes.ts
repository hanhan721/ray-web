import type { RouteRecordRaw } from 'vue-router'
import type { PermissionVO } from '@/types/permission'
import type { ViewLoader } from './views'

export interface NavLink {
  id: number
  title: string
  to: string
  icon?: string
}

export interface NavGroup {
  id: number
  title: string
  icon?: string
  items: NavLink[]
}

export type NavNode = ({ kind: 'item' } & NavLink) | ({ kind: 'group' } & NavGroup)

function textOrUndefined(value?: string | null): string | undefined {
  return value ?? undefined
}

function ordered(nodes: PermissionVO[]): PermissionVO[] {
  return [...nodes].sort((left, right) => left.sort - right.sort || left.id - right.id)
}

function segmentOf(url: string): string {
  return url.replace(/^\/+/, '')
}

function joinPath(parents: string[], segment: string): string {
  return `/${[...parents, segment].filter((part) => part.length > 0).join('/')}`
}

export function buildMenuRoutes(
  menus: PermissionVO[],
  loaders: Record<string, ViewLoader>,
): RouteRecordRaw[] {
  const used = new Set<string>()
  const uniqueName = (preferred: string | null | undefined, id: number, prefix: string) => {
    const base = preferred && preferred.length > 0 ? preferred : `${prefix}-${id}`
    if (!used.has(base)) {
      used.add(base)
      return base
    }
    const next = `${base}-${id}`
    used.add(next)
    return next
  }
  const visit = (nodes: PermissionVO[]): RouteRecordRaw[] => {
    const routes: RouteRecordRaw[] = []
    for (const node of ordered(nodes)) {
      if (!node.enabled || node.type === 'BUTTON') continue
      const path = segmentOf(node.url)
      if (!path) continue
      if (node.type === 'DIRECTORY') {
        const children = visit(node.children ?? [])
        if (children.length === 0) continue
        routes.push({
          path,
          name: uniqueName(node.routeName, node.id, 'dir'),
          redirect: node.redirect || undefined,
          meta: { title: node.name, icon: textOrUndefined(node.icon), hidden: node.hidden },
          children,
        })
        continue
      }
      const loader = node.component ? loaders[node.component] : undefined
      if (!loader) continue
      routes.push({
        path,
        name: uniqueName(node.routeName, node.id, 'menu'),
        component: loader,
        meta: {
          title: node.name,
          icon: textOrUndefined(node.icon),
          hidden: node.hidden,
          keepAlive: node.keepAlive,
        },
      })
    }
    return routes
  }
  return visit(menus)
}

export function firstMenuPath(
  menus: PermissionVO[],
  loaders: Record<string, ViewLoader>,
): string | null {
  const visit = (nodes: PermissionVO[], parents: string[]): string | null => {
    for (const node of ordered(nodes)) {
      if (!node.enabled || node.hidden || node.type === 'BUTTON') continue
      const segment = segmentOf(node.url)
      if (!segment) continue
      if (node.type === 'DIRECTORY') {
        const nested = visit(node.children ?? [], [...parents, segment])
        if (nested) return nested
        continue
      }
      if (!node.component || !loaders[node.component]) continue
      return joinPath(parents, segment)
    }
    return null
  }
  return visit(menus, [])
}

export function buildNavigation(
  menus: PermissionVO[],
  loaders: Record<string, ViewLoader>,
): NavNode[] {
  const nodes: NavNode[] = []
  const visitLinks = (nodesToRead: PermissionVO[], parents: string[]): NavLink[] => {
    const links: NavLink[] = []
    for (const node of ordered(nodesToRead)) {
      if (!node.enabled || node.hidden || node.type === 'BUTTON') continue
      const segment = segmentOf(node.url)
      if (!segment) continue
      if (node.type === 'DIRECTORY') {
        links.push(...visitLinks(node.children ?? [], [...parents, segment]))
        continue
      }
      if (!node.component || !loaders[node.component]) continue
      links.push({
        id: node.id,
        title: node.name,
        to: joinPath(parents, segment),
        icon: textOrUndefined(node.icon),
      })
    }
    return links
  }
  for (const node of ordered(menus)) {
    if (!node.enabled || node.hidden || node.type === 'BUTTON') continue
    const segment = segmentOf(node.url)
    if (!segment) continue
    if (node.type === 'DIRECTORY') {
      const items = visitLinks(node.children ?? [], [segment])
      if (items.length === 0) continue
      nodes.push({
        kind: 'group',
        id: node.id,
        title: node.name,
        icon: textOrUndefined(node.icon),
        items,
      })
      continue
    }
    if (!node.component || !loaders[node.component]) continue
    nodes.push({
      kind: 'item',
      id: node.id,
      title: node.name,
      to: joinPath([], segment),
      icon: textOrUndefined(node.icon),
    })
  }
  return nodes
}
