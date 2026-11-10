import type { Dept, DeptTree } from '@/api/dept'
import type { ColumnSettingItem } from '@/components/common/column-settings'

export const DEPT_DATA_COLUMNS: ColumnSettingItem[] = [
  { key: 'deptName', label: '名称' },
  { key: 'leader', label: '负责人' },
  { key: 'phone', label: '电话' },
  { key: 'enabled', label: '状态' },
]

const CELL_MIN_WIDTH: Record<string, string> = {
  deptName: 'min-w-48',
  leader: 'min-w-24',
  phone: 'min-w-32',
}

/** 单元格文本样式：部门名加重，其余只做截断。 */
export function deptCellClass(columnId: string): string {
  const minWidth = CELL_MIN_WIDTH[columnId] ?? 'min-w-16'
  if (columnId === 'deptName') return `block truncate font-medium text-foreground ${minWidth}`
  return `block truncate ${minWidth}`
}

export interface DeptRow {
  id: number
  parentId: number
  deptName: string
  depth: number
  sort: number
  leader: string
  phone: string
  email: string
  enabled: boolean
  remark: string
}

export function flattenDepts(nodes: DeptTree[], depth = 0): DeptRow[] {
  const rows: DeptRow[] = []
  for (const node of nodes) {
    rows.push({
      id: node.id,
      parentId: node.parentId ?? 0,
      deptName: node.deptName,
      depth,
      sort: node.sort ?? 0,
      leader: node.leader ?? '',
      phone: node.phone ?? '',
      email: node.email ?? '',
      enabled: node.enabled !== false,
      remark: node.remark ?? '',
    })
    if (node.children?.length) rows.push(...flattenDepts(node.children, depth + 1))
  }
  return rows
}

export function filterDeptRows(rows: DeptRow[], name: string): DeptRow[] {
  const query = name.trim()
  if (!query) return rows
  return rows.filter((row) => row.deptName.includes(query))
}

export function excludedParentIds(rows: DeptRow[], id: number): Set<number> {
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

export function toDeptWrite(row: DeptRow, enabled = row.enabled): Dept & { id: number } {
  return {
    id: row.id,
    parentId: row.parentId,
    deptName: row.deptName,
    sort: row.sort,
    leader: row.leader,
    phone: row.phone,
    email: row.email,
    enabled,
    remark: row.remark,
  }
}
