export interface ColumnPreference {
  key: string
  visible: boolean
  sort: number
  width: number | null
  fixed: 'left' | 'right' | null
}

export interface AppliedColumnPreference {
  order: string[]
  visibility: Record<string, boolean>
}

export function applyColumnPreference(
  keys: readonly string[],
  saved: ColumnPreference[] | null,
): AppliedColumnPreference {
  if (!saved) {
    return {
      order: [...keys],
      visibility: Object.fromEntries(keys.map((key) => [key, true])),
    }
  }
  const known = new Set(keys)
  const sorted = saved
    .filter((item) => known.has(item.key))
    .slice()
    .sort((left, right) => left.sort - right.sort)
  const seen = new Set(sorted.map((item) => item.key))
  const order = [...sorted.map((item) => item.key), ...keys.filter((key) => !seen.has(key))]
  const visibility: Record<string, boolean> = {}
  for (const key of keys) {
    const found = saved.find((item) => item.key === key)
    visibility[key] = found ? found.visible : true
  }
  return { order, visibility }
}

export function toColumnPreference(
  keys: readonly string[],
  order: string[],
  visibility: Record<string, boolean>,
): ColumnPreference[] {
  const known = new Set(keys)
  const result = order.filter((key) => known.has(key))
  for (const key of keys) {
    if (!result.includes(key)) result.push(key)
  }
  return result.map((key, index) => ({
    key,
    visible: visibility[key] !== false,
    sort: index,
    width: null,
    fixed: null,
  }))
}
