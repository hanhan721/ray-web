import { shallowRef } from 'vue'
import { useSelection } from '@/composables/useSelection'
import { failureMessage } from '@/utils/failure'
import { PAGE_SIZES, pageIndexFromResponse } from '@/utils/pagination'

export interface PagedListOptions<T> {
  /** 按当前筛选条件取一页数据，筛选状态由调用方持有。 */
  fetchPage: (input: { pageIndex: number; pageSize: number }) => Promise<IPage<T>>
  pageSizes?: readonly number[]
  fallbackMessage?: string
  /** 行主键，用于勾选；默认取 `row.id`。 */
  rowId?: (row: T) => number
}

/**
 * 服务端分页列表的通用状态：翻页、筛选重置、勾选和请求竞态。
 * 筛选条件不放在这里，由页面自己持有并闭包进 `fetchPage`。
 */
export function usePagedList<T>(options: PagedListOptions<T>) {
  const pageSizes = options.pageSizes ?? PAGE_SIZES

  const rows = shallowRef<T[]>([])
  const total = shallowRef(0)
  const pageIndex = shallowRef(0)
  const pageSize = shallowRef<number>(pageSizes[0] ?? 10)
  const loading = shallowRef(false)
  const errorMessage = shallowRef('')
  const { selectedIds, clearSelection, toggleSelected, toggleAll } = useSelection<T>({
    rowId: options.rowId,
  })
  let generation = 0

  async function load() {
    const requestId = ++generation
    loading.value = true
    errorMessage.value = ''
    try {
      const page = await options.fetchPage({
        pageIndex: pageIndex.value,
        pageSize: pageSize.value,
      })
      if (requestId !== generation) return
      rows.value = page.records ?? []
      total.value = page.total ?? 0
      pageIndex.value = pageIndexFromResponse(page.current ?? 1)
      const returnedSize = pageSizes.find((size) => size === page.size)
      if (returnedSize) pageSize.value = returnedSize
    } catch (error) {
      if (requestId !== generation) return
      rows.value = []
      total.value = 0
      errorMessage.value = failureMessage(error, options.fallbackMessage ?? '列表加载失败')
    } finally {
      if (requestId === generation) loading.value = false
    }
  }

  function search() {
    pageIndex.value = 0
    clearSelection()
    return load()
  }

  function changePage(nextIndex: number) {
    pageIndex.value = Math.max(0, nextIndex)
    clearSelection()
    return load()
  }

  function changePageSize(nextSize: number) {
    pageSize.value = pageSizes.find((size) => size === nextSize) ?? pageSizes[0] ?? 10
    pageIndex.value = 0
    clearSelection()
    return load()
  }

  function togglePage(checked: boolean) {
    toggleAll(rows.value, checked)
  }

  return {
    rows,
    total,
    pageIndex,
    pageSize,
    loading,
    errorMessage,
    selectedIds,
    clearSelection,
    load,
    search,
    changePage,
    changePageSize,
    toggleSelected,
    togglePage,
  }
}
