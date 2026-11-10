import { shallowRef } from 'vue'

export interface RowStatusOptions {
  update: (id: number, enabled: boolean) => Promise<unknown>
  setRowEnabled: (id: number, enabled: boolean) => void
}

/** 行内启停开关：各行独立加锁，同一行的请求结束前不重复提交。 */
export function useRowStatus(options: RowStatusOptions) {
  const pendingIds = shallowRef<ReadonlySet<number>>(new Set())

  async function change(id: number, enabled: boolean) {
    if (pendingIds.value.has(id)) return
    pendingIds.value = new Set([...pendingIds.value, id])
    try {
      await options.update(id, enabled)
      options.setRowEnabled(id, enabled)
    } catch {
      // 请求层已经提示后端原因。开关仍绑定原状态。
    } finally {
      const next = new Set(pendingIds.value)
      next.delete(id)
      pendingIds.value = next
    }
  }

  return { pendingIds, change }
}
