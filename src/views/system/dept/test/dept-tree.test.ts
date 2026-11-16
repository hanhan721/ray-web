import { describe, expect, it } from 'vitest'
import { excludedParentIds, filterDeptRows, flattenDepts, type DeptRow } from '@/views/system/dept/dept-tree'

const rows: DeptRow[] = flattenDepts([
  {
    id: 1,
    parentId: 0,
    deptName: '总部',
    sort: 0,
    enabled: true,
    children: [
      { id: 2, parentId: 1, deptName: '研发', sort: 1, enabled: true, children: [] },
      { id: 3, parentId: 1, deptName: '市场', sort: 2, enabled: false },
    ],
  },
])

describe('dept tree', () => {
  it('flattens depth and excludes a node with its descendants from parent choices', () => {
    expect(rows.map((row) => [row.id, row.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 1],
    ])
    expect([...excludedParentIds(rows, 1)].sort()).toEqual([1, 2, 3])
    expect([...excludedParentIds(rows, 2)].sort()).toEqual([2])
    expect(filterDeptRows(rows, '研').map((row) => row.id)).toEqual([2])
  })
})
