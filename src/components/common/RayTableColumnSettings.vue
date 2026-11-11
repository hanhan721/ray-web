<script setup lang="ts">
import {
  moveColumn,
  normalizeColumnOrder,
  type ColumnSettingItem,
  type ColumnSettingsDraft,
} from './column-settings'
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

const props = withDefaults(
  defineProps<{
    open: boolean
    columns: readonly ColumnSettingItem[]
    order: readonly string[]
    visibility: Record<string, boolean>
    saving?: boolean
    error?: string
  }>(),
  {
    saving: false,
    error: '',
  },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  save: [draft: ColumnSettingsDraft]
  reset: []
}>()

const draftOrder = ref<string[]>([])
const draftVisibility = ref<Record<string, boolean>>({})
const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)
const dropEdge = ref<'before' | 'after'>('before')
const announcement = ref('')

const columnMap = computed(() => new Map(props.columns.map((column) => [column.key, column])))
const draftColumns = computed(() =>
  draftOrder.value
    .map((key) => columnMap.value.get(key))
    .filter((column): column is ColumnSettingItem => Boolean(column)),
)
const visibleCount = computed(
  () => props.columns.filter((column) => draftVisibility.value[column.key] !== false).length,
)
const allVisible = computed(() =>
  props.columns.every((column) => draftVisibility.value[column.key] !== false),
)
const dirty = computed(() => {
  const baseOrder = normalizeColumnOrder(props.columns, props.order)
  if (baseOrder.length !== draftOrder.value.length) return true
  if (baseOrder.some((key, index) => key !== draftOrder.value[index])) return true
  return props.columns.some(
    (column) =>
      (props.visibility[column.key] !== false) !== (draftVisibility.value[column.key] !== false),
  )
})

function resetDraft() {
  draftOrder.value = normalizeColumnOrder(props.columns, props.order)
  draftVisibility.value = Object.fromEntries(
    props.columns.map((column) => [column.key, props.visibility[column.key] !== false]),
  )
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    dragIndex.value = null
    overIndex.value = null
    announcement.value = ''
    resetDraft()
  },
  { immediate: true },
)

function setVisible(key: string, visible: boolean) {
  draftVisibility.value = { ...draftVisibility.value, [key]: visible }
}

function toggleAll() {
  const next = !allVisible.value
  draftVisibility.value = Object.fromEntries(props.columns.map((column) => [column.key, next]))
}

function moveBy(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draftOrder.value.length) return
  const label = draftColumns.value[index]?.label ?? ''
  draftOrder.value = moveColumn(draftOrder.value, index, target)
  announcement.value = `「${label}」已移动到第 ${target + 1} 位，共 ${draftOrder.value.length} 列`
}

function startDrag(index: number, event: DragEvent) {
  dragIndex.value = index
  overIndex.value = null
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', draftOrder.value[index] ?? '')
  const handle = event.currentTarget as HTMLElement | null
  const row = handle?.closest('[data-column-row]') as HTMLElement | null
  if (!row) return
  const rect = row.getBoundingClientRect()
  event.dataTransfer.setDragImage(row, event.clientX - rect.left, event.clientY - rect.top)
}

function dragOver(index: number, event: DragEvent) {
  if (dragIndex.value === null) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  overIndex.value = index
  dropEdge.value = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
}

function endDrag() {
  dragIndex.value = null
  overIndex.value = null
}

function dropOn(index: number) {
  const from = dragIndex.value
  if (from === null) return
  let target = dropEdge.value === 'after' ? index + 1 : index
  if (target > from) target -= 1
  if (target !== from) {
    const label = draftColumns.value[from]?.label ?? ''
    draftOrder.value = moveColumn(draftOrder.value, from, target)
    announcement.value = `「${label}」已移动到第 ${target + 1} 位，共 ${draftOrder.value.length} 列`
  }
  endDrag()
}

function submit() {
  emit('save', { order: [...draftOrder.value], visibility: { ...draftVisibility.value } })
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>列显示与排序</DialogTitle>
        <DialogDescription>
          拖拽手柄调整顺序，取消勾选隐藏列。保存后应用到表格。
        </DialogDescription>
      </DialogHeader>

      <div class="flex items-center justify-between gap-3">
        <p class="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
          <span>已显示 {{ visibleCount }} / {{ columns.length }}</span>
          <template v-if="dirty">
            <span aria-hidden="true">·</span>
            <span>未保存</span>
          </template>
        </p>
        <Button type="button" variant="ghost" size="sm" :disabled="saving" @click="toggleAll">
          <EyeOff v-if="allVisible" data-icon="inline-start" />
          <Eye v-else data-icon="inline-start" />
          {{ allVisible ? '全部隐藏' : '全部显示' }}
        </Button>
      </div>

      <div
        role="list"
        aria-label="列顺序与显示"
        class="-mx-1 flex max-h-[min(60vh,24rem)] flex-col gap-0.5 overflow-y-auto px-1 py-0.5"
        @dragover.prevent
        @drop.prevent="endDrag"
      >
        <div
          v-for="(column, index) in draftColumns"
          :key="column.key"
          data-column-row
          role="listitem"
          :data-dragging="dragIndex === index || undefined"
          class="group/column relative flex items-center gap-1.5 rounded-lg border border-transparent py-1 pr-1 pl-1.5 transition-colors hover:border-border/80 hover:bg-muted/40 data-[dragging=true]:opacity-50"
          @dragover.prevent="dragOver(index, $event)"
          @drop.prevent="dropOn(index)"
        >
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-1.5 -top-px h-0.5 rounded-full bg-primary transition-opacity"
            :class="
              dragIndex !== null && overIndex === index && dropEdge === 'before'
                ? 'opacity-100'
                : 'opacity-0'
            "
          />
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-primary transition-opacity"
            :class="
              dragIndex !== null && overIndex === index && dropEdge === 'after'
                ? 'opacity-100'
                : 'opacity-0'
            "
          />

          <span
            role="button"
            tabindex="0"
            draggable="true"
            aria-label="拖动调整顺序，或按上下方向键移动"
            aria-roledescription="排序手柄"
            aria-keyshortcuts="ArrowUp ArrowDown"
            class="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 transition-colors select-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:cursor-grabbing"
            @dragstart="startDrag(index, $event)"
            @dragend="endDrag"
            @keydown.up.prevent="moveBy(index, -1)"
            @keydown.down.prevent="moveBy(index, 1)"
          >
            <GripVertical class="size-4" />
          </span>

          <Checkbox
            :id="`column-setting-${column.key}`"
            :model-value="draftVisibility[column.key] !== false"
            @update:model-value="setVisible(column.key, Boolean($event))"
          />
          <Label
            :for="`column-setting-${column.key}`"
            :class="
              cn(
                'min-w-0 flex-1 cursor-pointer truncate font-normal',
                draftVisibility[column.key] === false && 'text-muted-foreground',
              )
            "
          >
            {{ column.label }}
          </Label>

          <div
            class="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within/column:opacity-100 group-hover/column:opacity-100 max-sm:opacity-100"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              :disabled="index === 0"
              :aria-label="`上移「${column.label}」`"
              @click="moveBy(index, -1)"
            >
              <ChevronUp />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              :disabled="index === draftColumns.length - 1"
              :aria-label="`下移「${column.label}」`"
              @click="moveBy(index, 1)"
            >
              <ChevronDown />
            </Button>
          </div>
        </div>
      </div>

      <span class="sr-only" aria-live="polite">{{ announcement }}</span>

      <p v-if="error" role="alert" class="text-destructive text-xs">{{ error }}</p>

      <DialogFooter class="flex-col sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" :disabled="saving" @click="emit('reset')">
          恢复默认
        </Button>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="emit('update:open', false)"
          >
            取消
          </Button>
          <Button type="button" :disabled="saving" @click="submit">
            <Spinner v-if="saving" />
            保存
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
