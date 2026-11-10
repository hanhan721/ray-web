export interface ColumnSettingItem {
  key: string
  label: string
}

export interface ColumnSettingsDraft {
  order: string[]
  visibility: Record<string, boolean>
}

/**
 * 去掉未知列和重复项，并把缺少的列补到末尾。
 */
export function normalizeColumnOrder(
  columns: readonly ColumnSettingItem[],
  order: readonly string[],
): string[] {
  const known = new Set(columns.map((column) => column.key))
  const seen = new Set<string>()
  const result: string[] = []
  for (const key of order) {
    if (!known.has(key) || seen.has(key)) continue
    seen.add(key)
    result.push(key)
  }
  for (const column of columns) {
    if (seen.has(column.key)) continue
    seen.add(column.key)
    result.push(column.key)
  }
  return result
}

/**
 * 把 from 位置的列移动到 to 位置（移动后的最终下标）。
 * 越界或原地不动时返回副本，避免调用方误改原数组。
 */
export function moveColumn(order: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) {
    return [...order]
  }
  const result = [...order]
  const [moved] = result.splice(from, 1)
  result.splice(to, 0, moved)
  return result
}
