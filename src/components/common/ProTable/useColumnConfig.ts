import type { ProTableColumn } from './types'
import { getColumnConfig, saveColumnConfig, resetColumnConfig } from '@/api/column-config'

/**
 * 将前端列定义与后端偏好快照合并
 *
 * 合并规则：
 * - data 为 null → 使用前端默认值，不做处理
 * - 后端有 + 前端有（key 匹配）→ 用后端 visible/sort/width/fixed 覆盖
 * - 后端有 + 前端无（已删列）→ 忽略
 * - 后端无 + 前端有（新增列）→ 追加到末尾，使用前端默认值
 * - configLocked 列 → 无论后端数据如何，强制 visible=true，fixed 保持原定义
 */
function mergeColumns(
  propColumns: ProTableColumn[],
  backendConfig: ColumnConfigItem[] | null
): { mergedColumns: ProTableColumn[]; configItems: ColumnConfigItem[] } {
  // 无后端配置时，使用前端默认值
  if (!backendConfig) {
    const configItems: ColumnConfigItem[] = propColumns.map((col, index) => ({
      key: col.key,
      visible: col.configLocked ? true : !col.hideInTable,
      sort: index,
      width: col.width ?? null,
      fixed: col.fixed ?? null,
    }))
    return { mergedColumns: [...propColumns], configItems }
  }

  const frontendMap = new Map(propColumns.map((col) => [col.key, col]))
  const backendMap = new Map(backendConfig.map((item) => [item.key, item]))

  const resultColumns: ProTableColumn[] = []
  const configItems: ColumnConfigItem[] = []

  // 按后端 sort 排序，跳过前端已删除的列
  const sortedBackend = [...backendConfig].sort((a, b) => a.sort - b.sort)
  for (const backendItem of sortedBackend) {
    const col = frontendMap.get(backendItem.key)
    if (!col) continue // 前端已删除该列，忽略

    const isLocked = col.configLocked ?? false
    const visible = isLocked ? true : backendItem.visible
    const fixed = isLocked ? (col.fixed ?? null) : backendItem.fixed
    const width = isLocked ? (col.width ?? null) : backendItem.width

    resultColumns.push({
      ...col,
      width: width ?? col.width,
      fixed: (fixed ?? undefined) as 'left' | 'right' | undefined,
      hideInTable: !visible,
    })
    configItems.push({
      key: backendItem.key,
      visible,
      sort: configItems.length,
      width,
      fixed,
    })
  }

  // 追加后端没有、前端新增的列到末尾
  for (const col of propColumns) {
    if (!backendMap.has(col.key)) {
      resultColumns.push(col)
      configItems.push({
        key: col.key,
        visible: col.configLocked ? true : !col.hideInTable,
        sort: configItems.length,
        width: col.width ?? null,
        fixed: col.fixed ?? null,
      })
    }
  }

  return { mergedColumns: resultColumns, configItems }
}

/**
 * 根据 configItems 重建 mergedColumns（抽屉改动后调用）
 */
function rebuildMergedColumns(
  propColumns: ProTableColumn[],
  items: ColumnConfigItem[]
): ProTableColumn[] {
  const colMap = new Map(propColumns.map((col) => [col.key, col]))
  const sorted = [...items].sort((a, b) => a.sort - b.sort)

  return sorted
    .map((item) => {
      const col = colMap.get(item.key)
      if (!col) return null
      if (col.configLocked) return col
      return {
        ...col,
        width: item.width ?? col.width,
        fixed: (item.fixed ?? undefined) as 'left' | 'right' | undefined,
        hideInTable: !item.visible,
      }
    })
    .filter((col): col is ProTableColumn => col !== null)
}

export function useColumnConfig(propColumns: ProTableColumn[], pageKey: string) {
  const mergedColumns = ref<ProTableColumn[]>([...propColumns])
  const configItems = ref<ColumnConfigItem[]>([])
  const loading = ref(true)

  // 防抖保存（500ms）
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  function cancelPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }
  function debouncedSave() {
    cancelPendingSave()
    saveTimer = setTimeout(() => {
      saveColumnConfig(pageKey, configItems.value).catch(() => {
        // 静默失败：列配置保存失败不影响主流程
      })
    }, 500)
  }

  // 初始化：加载后端配置并合并
  async function init() {
    try {
      const backendConfig = await getColumnConfig(pageKey)
      const { mergedColumns: merged, configItems: items } = mergeColumns(propColumns, backendConfig)
      mergedColumns.value = merged
      configItems.value = items
    } catch {
      // 加载失败时使用前端默认值
      const { mergedColumns: merged, configItems: items } = mergeColumns(propColumns, null)
      mergedColumns.value = merged
      configItems.value = items
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    init()
  })

  /**
   * 抽屉变更回调：更新 configItems 并触发保存
   */
  function updateConfigItems(items: ColumnConfigItem[]) {
    // 重新编排 sort
    const reindexed = items.map((item, index) => ({ ...item, sort: index }))
    configItems.value = reindexed
    mergedColumns.value = rebuildMergedColumns(propColumns, reindexed)
    debouncedSave()
  }

  /**
   * 列宽拖拽回调：更新对应列的宽度并触发保存
   */
  function updateWidth(key: string, width: number) {
    const item = configItems.value.find((i) => i.key === key)
    if (item) {
      item.width = width > 0 ? width : null
      debouncedSave()
    }
  }

  /**
   * 恢复默认：删除后端配置，还原为前端默认列
   */
  async function handleReset() {
    cancelPendingSave()
    try {
      await resetColumnConfig(pageKey)
    } catch {
      // 删除失败仍然还原本地状态，下次加载时会重新拉取后端配置
    }
    const { mergedColumns: merged, configItems: items } = mergeColumns(propColumns, null)
    mergedColumns.value = merged
    configItems.value = items
  }

  return {
    mergedColumns,
    configItems,
    loading,
    updateConfigItems,
    updateWidth,
    handleReset,
  }
}
