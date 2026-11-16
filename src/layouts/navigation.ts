import type { PermissionVO } from '@/types/permission'

export interface NavItem {
  kind: 'item'
  id: number
  title: string
  to: string
  icon?: string
}

export interface NavGroup {
  kind: 'group'
  id: number
  title: string
  icon?: string
  items: NavNode[]
}

export type NavNode = NavItem | NavGroup

export function joinMenuPath(url: string | undefined, parentPath = ''): string {
  const value = url?.trim() ?? ''
  if (!value) return parentPath
  if (value.startsWith('/')) return value.replace(/\/+/g, '/')
  return `${parentPath}/${value}`.replace(/\/+/g, '/')
}

/** 把可见菜单转成顶栏模块和侧栏树。有子节点的是分组，叶子是页面。 */
export function buildNavigation(menus: PermissionVO[], parentPath = ''): NavNode[] {
  const nodes: NavNode[] = []

  for (const menu of menus) {
    const path = joinMenuPath(menu.url, parentPath)
    const children = menu.children?.length ? buildNavigation(menu.children, path || parentPath) : []

    if (children.length > 0) {
      nodes.push({
        kind: 'group',
        id: menu.id,
        title: menu.name,
        icon: menu.icon || undefined,
        items: children,
      })
      continue
    }

    if (!path) continue
    nodes.push({
      kind: 'item',
      id: menu.id,
      title: menu.name,
      to: path,
      icon: menu.icon || undefined,
    })
  }

  return nodes
}

export function firstNavigationPath(node: NavNode): string | null {
  if (node.kind === 'item') return node.to
  for (const child of node.items) {
    const path = firstNavigationPath(child)
    if (path) return path
  }
  return null
}

function findExactTrail(nodes: NavNode[], path: string): NavNode[] {
  for (const node of nodes) {
    if (node.kind === 'item' && node.to === path) return [node]
    if (node.kind === 'group') {
      const trail = findExactTrail(node.items, path)
      if (trail.length) return [node, ...trail]
    }
  }
  return []
}

function matchesPrefix(to: string, path: string): boolean {
  if (!to || to === '/') return false
  return path === to || path.startsWith(to.endsWith('/') ? to : `${to}/`)
}

function findPrefixTrail(nodes: NavNode[], path: string): NavNode[] {
  let best: NavNode[] = []
  let bestLength = -1

  const visit = (list: NavNode[], parents: NavNode[]) => {
    for (const node of list) {
      if (node.kind === 'item' && matchesPrefix(node.to, path) && node.to.length > bestLength) {
        best = [...parents, node]
        bestLength = node.to.length
      }
      if (node.kind === 'group') visit(node.items, [...parents, node])
    }
  }

  visit(nodes, [])
  return best
}

/** 当前路由对应的菜单链。精确匹配优先，详情页再按最长路径前缀回退。 */
export function findNavigationTrail(nodes: NavNode[], path: string): NavNode[] {
  const exact = findExactTrail(nodes, path)
  if (exact.length) return exact
  return findPrefixTrail(nodes, path)
}

/** 同一层级里，除自身以外的分组 id。手风琴模式用来收起兄弟分组。 */
export function siblingGroupIds(nodes: NavNode[], id: number): number[] | null {
  const groups = nodes.filter((node): node is NavGroup => node.kind === 'group')
  if (groups.some((node) => node.id === id)) {
    return groups.filter((node) => node.id !== id).map((node) => node.id)
  }
  for (const group of groups) {
    const nested = siblingGroupIds(group.items, id)
    if (nested) return nested
  }
  return null
}
