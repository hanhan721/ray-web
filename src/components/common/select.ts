export type SelectValue = string | number

export interface SelectOption<T extends SelectValue = SelectValue> {
  value: T
  label: string
  depth?: number
  disabled?: boolean
}

/** 单选以 null 表示未选；多选始终使用数组，并保留选项值的原始类型。 */
export type SelectModelValue<
  T extends SelectValue,
  Multiple extends boolean = false,
> = Multiple extends true ? T[] : T | null

/**
 * 多选展示时的折叠规则。
 *
 * `maxVisible` 只影响选择框内标签的展示，不改变已选值；
 * 超出的部分通过 `+N` 摘要呈现，避免选择框无限撑高。
 */
export function splitVisibleOptions<T>(
  options: readonly T[],
  maxVisible?: number,
): { visible: T[]; hiddenCount: number } {
  if (!maxVisible || maxVisible <= 0 || options.length <= maxVisible) {
    return { visible: [...options], hiddenCount: 0 }
  }
  return {
    visible: options.slice(0, maxVisible),
    hiddenCount: options.length - maxVisible,
  }
}
