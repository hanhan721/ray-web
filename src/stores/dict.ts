/**
 * 字典数据管理 Store
 *
 * 功能：
 * - 字典数据缓存（避免重复请求）
 * - 按 type 获取字典列表
 * - 按 type + value 获取字典标签
 * - 支持懒加载（首次使用时请求）
 * - 支持手动刷新
 */
import { defineStore } from 'pinia'
import { getDictByType, type DictItem } from '@/api/dict'

export type { DictItem } from '@/api/dict'

export const useDictStore = defineStore('dict', () => {
  // State: 字典缓存 Map<dictType, DictItem[]>
  const cache = ref<Map<string, DictItem[]>>(new Map())

  // 加载状态 Map<dictType, Promise>，用于防止并发请求
  const loading = ref<Map<string, Promise<DictItem[]>>>(new Map())

  /**
   * 获取字典列表
   * @param dictType 字典类型
   * @returns 字典项数组
   */
  async function getDict(dictType: string): Promise<DictItem[]> {
    // 优先从缓存获取
    if (cache.value.has(dictType)) {
      return cache.value.get(dictType)!
    }

    // 如果正在加载，等待加载完成
    if (loading.value.has(dictType)) {
      return loading.value.get(dictType)!
    }

    // 发起请求并缓存 Promise
    const promise = getDictByType(dictType)
      .then((data) => {
        cache.value.set(dictType, data)
        return data
      })
      .finally(() => {
        loading.value.delete(dictType)
      })

    loading.value.set(dictType, promise)
    return promise
  }

  /**
   * 获取字典标签
   * @param dictType 字典类型
   * @param value 字典值
   * @returns 字典标签，未找到时返回原值
   */
  async function getLabel(dictType: string, value: string | number): Promise<string> {
    const items = await getDict(dictType)
    const item = items.find((i) => i.value === String(value))
    return item?.label ?? String(value)
  }

  /**
   * 同步获取字典标签（需要先确保数据已加载）
   * @param dictType 字典类型
   * @param value 字典值
   * @returns 字典标签，未找到或未加载时返回原值
   */
  function getLabelSync(dictType: string, value: string | number): string {
    const items = cache.value.get(dictType)
    if (!items) return String(value)
    const item = items.find((i) => i.value === String(value))
    return item?.label ?? String(value)
  }

  /**
   * 同步获取字典项（需要先确保数据已加载）
   * @param dictType 字典类型
   * @param value 字典值
   * @returns 字典项，未找到时返回 undefined
   */
  function getItemSync(dictType: string, value: string | number): DictItem | undefined {
    const items = cache.value.get(dictType)
    if (!items) return undefined
    return items.find((i) => i.value === String(value))
  }

  /**
   * 刷新指定字典类型的缓存
   * @param dictType 字典类型
   */
  async function refresh(dictType: string): Promise<DictItem[]> {
    cache.value.delete(dictType)
    return getDict(dictType)
  }

  /**
   * 清除所有缓存
   */
  function clearCache() {
    cache.value.clear()
  }

  /**
   * 检查字典是否已缓存
   * @param dictType 字典类型
   */
  function isCached(dictType: string): boolean {
    return cache.value.has(dictType)
  }

  return {
    // State
    cache,
    // Actions
    getDict,
    getLabel,
    getLabelSync,
    getItemSync,
    refresh,
    clearCache,
    isCached,
  }
})
