import type { NavNode } from '@/router/menu-routes'

export function firstNavigationPath(node: NavNode): string | null {
  if (node.kind === 'item') return node.to
  for (const child of node.items) {
    const path = firstNavigationPath(child)
    if (path) return path
  }
  return null
}

export function findNavigationTrail(nodes: NavNode[], path: string): NavNode[] {
  for (const node of nodes) {
    if (node.kind === 'item' && node.to === path) return [node]
    if (node.kind === 'group') {
      const trail = findNavigationTrail(node.items, path)
      if (trail.length) return [node, ...trail]
    }
  }
  return []
}
