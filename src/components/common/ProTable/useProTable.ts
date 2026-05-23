import type { ProTableRequest, ProTableRequestParams } from './types'

/**
 * ProTable 组合式函数
 * 管理分页、搜索和数据加载逻辑
 */
export function useProTable<T>(
  request: ProTableRequest<T>,
  options: {
    defaultPageSize?: number
    immediate?: boolean
  } = {}
) {
  const { defaultPageSize = 10, immediate = true } = options

  // 状态
  const loading = ref(false)
  const data = ref<T[]>([]) as Ref<T[]>
  const total = ref(0)
  const pageNum = ref(1)
  const pageSize = ref(defaultPageSize)
  const searchParams = ref<Record<string, unknown>>({})
  const sortParams = ref<{ orderBy?: string; asc?: boolean }>({})

  // 加载数据
  async function loadData() {
    loading.value = true
    try {
      const params: ProTableRequestParams = {
        pageNum: pageNum.value,
        pageSize: pageSize.value,
        ...sortParams.value,
        ...searchParams.value,
      }

      const result = await request(params)
      data.value = result.records
      total.value = result.total
    } catch (error) {
      console.error('ProTable loadData error:', error)
      data.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  // 刷新（保持当前页）
  async function refresh() {
    await loadData()
  }

  // 重置并刷新
  async function reset() {
    pageNum.value = 1
    searchParams.value = {}
    sortParams.value = {}
    await loadData()
  }

  // 搜索
  async function search(params: Record<string, unknown>) {
    pageNum.value = 1
    searchParams.value = { ...params }
    await loadData()
  }

  // 分页变化
  async function handlePageChange(page: number) {
    pageNum.value = page
    await loadData()
  }

  // 每页条数变化
  async function handlePageSizeChange(size: number) {
    pageNum.value = 1
    pageSize.value = size
    await loadData()
  }

  // 排序变化
  async function handleSorterChange(sorter: { columnKey: string; order: 'ascend' | 'descend' | false } | null) {
    if (sorter && sorter.order) {
      sortParams.value = {
        orderBy: sorter.columnKey,
        asc: sorter.order === 'ascend',
      }
    } else {
      sortParams.value = {}
    }
    await loadData()
  }

  // 立即加载
  if (immediate) {
    loadData()
  }

  return {
    // 状态
    loading,
    data,
    total,
    pageNum,
    pageSize,
    searchParams,
    // 方法
    loadData,
    refresh,
    reset,
    search,
    handlePageChange,
    handlePageSizeChange,
    handleSorterChange,
  }
}
