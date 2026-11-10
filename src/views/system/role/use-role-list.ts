import { shallowRef } from 'vue'
import { getRolePage, type Role } from '@/api/role'
import { QUIET, failureMessage } from '@/utils/failure'
import {
  isCurrentRequest,
  pageIndexFromResponse,
  ROLE_PAGE_SIZES,
  toRoleQuery,
  type RoleListInput,
} from './role-table'

export function useRoleList() {
  const rows = shallowRef<Role[]>([])
  const total = shallowRef(0)
  const pageIndex = shallowRef(0)
  const pageSize = shallowRef<(typeof ROLE_PAGE_SIZES)[number]>(10)
  const roleName = shallowRef('')
  const roleKey = shallowRef('')
  const enabled = shallowRef<RoleListInput['enabled']>('')
  const loading = shallowRef(false)
  const errorMessage = shallowRef('')
  const selectedIds = shallowRef<number[]>([])
  let generation = 0

  function clearSelection() {
    selectedIds.value = []
  }

  function input(): RoleListInput {
    return {
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
      roleName: roleName.value,
      roleKey: roleKey.value,
      enabled: enabled.value,
    }
  }

  async function load() {
    const requestId = ++generation
    loading.value = true
    errorMessage.value = ''
    try {
      const page = await getRolePage(toRoleQuery(input()), QUIET)
      if (!isCurrentRequest(requestId, generation)) return
      rows.value = page.records ?? []
      total.value = page.total ?? 0
      pageIndex.value = pageIndexFromResponse(page.current ?? 1)
      const returnedSize = ROLE_PAGE_SIZES.find((size) => size === page.size)
      if (returnedSize) pageSize.value = returnedSize
    } catch (error) {
      if (!isCurrentRequest(requestId, generation)) return
      rows.value = []
      total.value = 0
      errorMessage.value = failureMessage(error, '角色列表加载失败')
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
    const allowed = ROLE_PAGE_SIZES.find((size) => size === nextSize) ?? 10
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
    roleName,
    roleKey,
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
