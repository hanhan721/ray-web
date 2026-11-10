import type { Permission, PermissionForm, PermissionTree } from '@/types/permission'
import type { PermissionType } from '@/types/enums'
import type { ColumnSettingItem } from '@/components/common/column-settings'

export const MENU_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'name', label: '名称' },
  { key: 'type', label: '类型' },
  { key: 'code', label: '标识' },
  { key: 'url', label: '路由' },
  { key: 'enabled', label: '状态' },
]

const CELL_MIN_WIDTH: Record<string, string> = {
  name: 'min-w-48',
  type: 'min-w-16',
  code: 'min-w-32',
  url: 'min-w-40',
}

/** 单元格文本样式：菜单名加重，标识与路由弱化，其余只做截断。 */
export function menuCellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'name') return `block truncate font-medium text-foreground ${minWidth}`
  if (columnId === 'code' || columnId === 'url')
    return `block truncate text-muted-foreground ${minWidth}`
  return `block truncate ${minWidth}`
}

export interface MenuRow {
  id: number
  parentId: number
  name: string
  depth: number
  type: PermissionType
  url: string
  component: string
  routeName: string
  redirect: string
  code: string
  icon: string
  sort: number
  hidden: boolean
  keepAlive: boolean
  enabled: boolean
  description: string
}

const TYPES = new Set<PermissionType>(['DIRECTORY', 'MENU', 'BUTTON'])

export function flattenMenus(nodes: PermissionTree[], depth = 0): MenuRow[] {
  const rows: MenuRow[] = []
  for (const node of nodes) {
    rows.push(toRow(node, depth))
    if (node.children?.length) rows.push(...flattenMenus(node.children, depth + 1))
  }
  return rows
}

function toRow(node: Permission, depth: number): MenuRow {
  const type = TYPES.has(node.type) ? node.type : 'DIRECTORY'
  return {
    id: node.id,
    parentId: node.parentId ?? 0,
    name: node.name ?? '',
    depth,
    type,
    url: node.url ?? '',
    component: node.component ?? '',
    routeName: node.routeName ?? '',
    redirect: node.redirect ?? '',
    code: node.code ?? '',
    icon: node.icon ?? '',
    sort: node.sort ?? 0,
    hidden: node.hidden === true,
    keepAlive: node.keepAlive === true,
    enabled: node.enabled !== false,
    description: node.description ?? '',
  }
}

export function filterMenuRows(
  rows: MenuRow[],
  name: string,
  type: PermissionType | '',
): MenuRow[] {
  const query = name.trim()
  return rows.filter((row) => {
    if (type && row.type !== type) return false
    if (query && !row.name.includes(query)) return false
    return true
  })
}

export function excludedParentIds(rows: MenuRow[], id: number): Set<number> {
  const children = new Map<number, number[]>()
  for (const row of rows) {
    const list = children.get(row.parentId) ?? []
    list.push(row.id)
    children.set(row.parentId, list)
  }
  const excluded = new Set<number>([id])
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) continue
    for (const child of children.get(current) ?? []) {
      if (excluded.has(child)) continue
      excluded.add(child)
      stack.push(child)
    }
  }
  return excluded
}

export function parseSort(text: string): number | null {
  if (!text.trim()) return 0
  const value = Number(text)
  if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) return null
  return value
}

export function menuFormError(input: {
  name: string
  type: string
  url: string
  code: string
  component: string
  redirect: string
  icon: string
  routeName: string
  description: string
  sort: number | null
  originalCode: string
}): string {
  if (!input.name) return '请填写名称'
  if (input.name.length > 100) return '名称不能超过 100 个字符'
  if (input.type !== 'DIRECTORY' && input.type !== 'MENU' && input.type !== 'BUTTON') {
    return '请选择类型'
  }
  if (input.sort === null) return '顺序需要是 -2147483648 到 2147483647 的整数'
  if (input.type === 'MENU' && !input.url) return '请填写路由'
  if (input.type === 'BUTTON' && !input.code) return '请填写权限标识'
  if (input.originalCode && !input.code) return '权限标识暂时不能清空。'
  if (input.url.length > 255 || input.component.length > 255 || input.redirect.length > 255) {
    return '路由、组件和重定向都不能超过 255 个字符'
  }
  if (input.code.length > 100) return '权限标识不能超过 100 个字符'
  if (input.icon.length > 100) return '图标不能超过 100 个字符'
  if (input.routeName.length > 64) return '路由名称不能超过 64 个字符'
  if (input.description.length > 500) return '描述不能超过 500 个字符'
  return ''
}

export function menuWriteBody(input: {
  id: number | null
  parentId: number
  name: string
  type: PermissionType
  url: string
  component: string
  routeName: string
  redirect: string
  code: string
  icon: string
  sort: number
  hidden: boolean
  keepAlive: boolean
  enabled: boolean
  description: string
  originalCode: string
  originalEnabled: boolean
}): PermissionForm {
  const body: PermissionForm = {
    parentId: input.parentId,
    name: input.name,
    type: input.type,
    url: input.url,
    component: input.component,
    routeName: input.routeName,
    redirect: input.redirect,
    icon: input.icon,
    sort: input.sort,
    hidden: input.hidden,
    keepAlive: input.keepAlive,
    description: input.description,
  }
  if (input.id !== null) body.id = input.id
  if (input.id === null || input.enabled !== input.originalEnabled) body.enabled = input.enabled
  if (
    input.code &&
    (input.type === 'BUTTON' || input.id === null || input.code !== input.originalCode)
  ) {
    body.code = input.code
  }
  return body
}

export function toMenuWrite(
  row: MenuRow,
  enabled = row.enabled,
): Permission & { id: number; code?: string } {
  const body: Permission & { id: number; code?: string } = {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    type: row.type,
    url: row.url,
    component: row.component,
    routeName: row.routeName,
    redirect: row.redirect,
    icon: row.icon,
    sort: row.sort,
    hidden: row.hidden,
    keepAlive: row.keepAlive,
    enabled,
    description: row.description,
  }
  if (row.code) body.code = row.code
  return body
}
