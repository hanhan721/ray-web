/** 各列表页共用的每页条数选项。 */
export const PAGE_SIZES = [10, 20, 50, 100] as const

/** 后端页码从 1 开始，表格内部从 0 开始。 */
export function pageIndexFromResponse(current: number): number {
  return Math.max(0, current - 1)
}
