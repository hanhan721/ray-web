import { shallowRef } from 'vue'

export interface SelectionOptions<T> {
  /** 行主键，默认取 `row.id`。 */
  rowId?: (row: T) => number
}

/**
 * 行勾选状态：用稳定业务 ID 记录，整页全选只覆盖传入的这批行。
 * 分页列表与树形/本地列表共用，避免各页重复实现。
 */
export function useSelection<T>(options: SelectionOptions<T> = {}) {
  const rowId = options.rowId ?? ((row: T) => (row as { id: number }).id)
  const selectedIds = shallowRef<number[]>([])

  function clearSelection() {
    selectedIds.value = []
  }

  function toggleSelected(id: number, checked: boolean) {
    const next = new Set(selectedIds.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedIds.value = [...next]
  }

  function toggleAll(rows: readonly T[], checked: boolean) {
    selectedIds.value = checked ? rows.map((row) => rowId(row)) : []
  }

  return { selectedIds, clearSelection, toggleSelected, toggleAll }
}
