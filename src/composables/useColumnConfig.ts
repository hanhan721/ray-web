import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getColumnConfig, resetColumnConfig, saveColumnConfig } from '@/api/column-config'
import type { ColumnSettingItem, ColumnSettingsDraft } from '@/components/common/column-settings'
import { applyColumnPreference, toColumnPreference } from '@/utils/column-preference'
import { failureMessage } from '@/utils/failure'

/**
 * 列显隐与排序配置。`pageKey` 为空时只保留本地默认值，不读写后端。
 */
export function useColumnConfig(
  columns: MaybeRefOrGetter<readonly ColumnSettingItem[]>,
  pageKey: MaybeRefOrGetter<string | null | undefined>,
) {
  const keys = computed(() => toValue(columns).map((column) => column.key))
  const saved = shallowRef<ColumnConfigItem[] | null>(null)
  const applied = computed(() => applyColumnPreference(keys.value, saved.value))
  const order = computed(() => applied.value.order)
  const visibility = computed(() => applied.value.visibility)
  const dialogOpen = shallowRef(false)
  const saving = shallowRef(false)
  const error = shallowRef('')

  let generation = 0

  watch(
    () => toValue(pageKey),
    async (key, _previous, onCleanup) => {
      const requestId = ++generation
      onCleanup(() => {
        generation += 1
      })
      saved.value = null
      dialogOpen.value = false
      saving.value = false
      error.value = ''
      if (!key) return
      try {
        const result = await getColumnConfig(key)
        if (requestId === generation) saved.value = result
      } catch {
        // 读取失败保留默认列，页面不因此报错。
      }
    },
    { immediate: true, flush: 'sync' },
  )

  function setDialogOpen(open: boolean) {
    if (open) error.value = ''
    dialogOpen.value = open
  }

  async function persist(write: () => Promise<unknown>, next: ColumnConfigItem[] | null) {
    if (saving.value) return
    const requestId = ++generation
    saving.value = true
    error.value = ''
    try {
      await write()
      if (requestId !== generation) return
      saved.value = next
      dialogOpen.value = false
    } catch (failure) {
      if (requestId === generation) error.value = failureMessage(failure, '操作失败，请稍后重试')
    } finally {
      if (requestId === generation) saving.value = false
    }
  }

  function save(draft: ColumnSettingsDraft) {
    const key = toValue(pageKey)
    if (!key) return
    const next = toColumnPreference(keys.value, draft.order, draft.visibility)
    return persist(() => saveColumnConfig(key, next), next)
  }

  function reset() {
    const key = toValue(pageKey)
    if (!key) return
    return persist(() => resetColumnConfig(key), null)
  }

  return {
    order,
    visibility,
    dialogOpen,
    saving,
    error,
    setDialogOpen,
    save,
    reset,
  }
}
