import { readonly, shallowRef } from 'vue'

export interface ErrorHistoryEntry {
  id: number
  message: string
  path: string
  time: number
}

const limit = 30
const entries = shallowRef<ErrorHistoryEntry[]>([])
let nextId = 0

export const errorHistory = readonly(entries)

export function recordError(message: string, path: string): void {
  entries.value = [...entries.value, { id: ++nextId, message, path, time: Date.now() }].slice(-limit)
}
