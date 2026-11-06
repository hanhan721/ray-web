import { shallowRef } from 'vue'
import { getUserPage, type SysUser } from '@/api/user'
import { RequestError } from '@/utils/request'
import {
  isCurrentRequest,
  pageIndexFromResponse,
  toUserQuery,
  USER_PAGE_SIZES,
  type UserListInput,
} from './user-table'

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '用户列表加载失败'
}

export function useUserList() {
  const rows = shallowRef<SysUser[]>([])
  const total = shallowRef(0)
  const pageIndex = shallowRef(0)
  const pageSize = shallowRef<(typeof USER_PAGE_SIZES)[number]>(10)
  const username = shallowRef('')
  const nickname = shallowRef('')
  const enabled = shallowRef<UserListInput['enabled']>('')
  const loading = shallowRef(false)
  const errorMessage = shallowRef('')
  const selectedIds = shallowRef<number[]>([])
  let generation = 0

  function clearSelection() {
    selectedIds.value = []
  }

  function input(): UserListInput {
    return {
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
      username: username.value,
      nickname: nickname.value,
      enabled: enabled.value,
    }
  }

  async function load() {
    const requestId = ++generation
    loading.value = true
    errorMessage.value = ''
    try {
      const page = await getUserPage(toUserQuery(input()), { showErrorMessage: false })
      if (!isCurrentRequest(requestId, generation)) return
      rows.value = page.records ?? []
      total.value = page.total ?? 0
      pageIndex.value = pageIndexFromResponse(page.current ?? 1)
      const returnedSize = USER_PAGE_SIZES.find((size) => size === page.size)
      if (returnedSize) pageSize.value = returnedSize
    } catch (error) {
      if (!isCurrentRequest(requestId, generation)) return
      rows.value = []
      total.value = 0
      errorMessage.value = failureMessage(error)
    } finally {
      if (isCurrentRequest(requestId, generation)) loading.value = false
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
    const allowed = USER_PAGE_SIZES.find((size) => size === nextSize) ?? 10
    pageSize.value = allowed
    pageIndex.value = 0
    clearSelection()
    return load()
  }

  function toggleSelected(id: number, checked: boolean) {
    const next = new Set(selectedIds.value)
    if (checked) next.add(id)
    else next.delete(id)
    selectedIds.value = [...next]
  }

  function togglePage(checked: boolean) {
    selectedIds.value = checked ? rows.value.map((row) => row.id) : []
  }

  function setRowEnabled(id: number, enabled: boolean) {
    rows.value = rows.value.map((item) => (item.id === id ? { ...item, enabled } : item))
  }

  return {
    rows,
    total,
    pageIndex,
    pageSize,
    username,
    nickname,
    enabled,
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
    setRowEnabled,
  }
}
