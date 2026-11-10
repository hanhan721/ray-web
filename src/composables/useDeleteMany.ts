import { shallowRef, type Ref } from 'vue'
import { failureMessage } from '@/utils/failure'

export interface DeleteManyOptions<T> {
  /** 只负责调用接口，是否静默提示由调用方决定。 */
  deleteRows: (ids: number[]) => Promise<unknown>
  selectedIds: Ref<number[]>
  clearSelection: () => void
  rows: Ref<T[]>
  pageIndex: Ref<number>
  changePage: (index: number) => Promise<void>
  load: () => Promise<void>
  fallbackMessage?: string
}

/** 批量删除的确认框状态，删除后清空勾选并在当前页清空时回退一页。 */
export function useDeleteMany<T>(options: DeleteManyOptions<T>) {
  const open = shallowRef(false)
  const deleting = shallowRef(false)
  const error = shallowRef('')

  function openDialog() {
    error.value = ''
    open.value = true
  }

  function setOpen(next: boolean) {
    open.value = next
  }

  async function confirm() {
    deleting.value = true
    error.value = ''
    try {
      await options.deleteRows(options.selectedIds.value)
      open.value = false
      options.clearSelection()
      await options.load()
      if (options.rows.value.length === 0 && options.pageIndex.value > 0) {
        await options.changePage(options.pageIndex.value - 1)
      }
    } catch (failure) {
      error.value = failureMessage(failure, options.fallbackMessage ?? '操作失败，请稍后重试')
    } finally {
      deleting.value = false
    }
  }

  return { open, deleting, error, openDialog, setOpen, confirm }
}
