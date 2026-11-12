<script setup lang="ts" generic="T, Id extends string | number">
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import type { ColumnSettingItem } from './column-settings'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const props = withDefaults(
  defineProps<{
    rows: T[]
    columns: readonly ColumnSettingItem[]
    treeColumn: string
    rowKey: (row: T) => Id
    children: (row: T) => readonly T[] | undefined
    rowLabel: (row: T) => string
    match?: (row: T) => boolean
    filterMode?: 'ancestors' | 'branch'
    defaultExpanded?: boolean
    expandedIds?: Id[]
    showExpandAll?: boolean
    expandOnRowClick?: boolean
    selectable?: boolean
    selectionMode?: 'independent' | 'cascade'
    selectScope?: 'visible' | 'filtered'
    selectedIds?: Id[]
    loading?: boolean
    errorMessage?: string
    cellClass?: (columnId: string) => string
  }>(),
  {
    filterMode: 'ancestors',
    defaultExpanded: true,
    showExpandAll: true,
    expandOnRowClick: false,
    selectable: true,
    selectionMode: 'independent',
    selectScope: 'visible',
    selectedIds: () => [],
    loading: false,
    errorMessage: '',
    match: undefined,
    expandedIds: undefined,
    cellClass: undefined,
  },
)
const emit = defineEmits<{
  'update:expandedIds': [ids: Id[]]
  'update:selectedIds': [ids: Id[]]
  retry: []
}>()
defineSlots<{
  filters?: () => unknown
  actions?: () => unknown
  toolbar?: () => unknown
  empty?: (props: { errorMessage: string }) => unknown
  [key: `cell-${string}`]: (props: { row: T }) => unknown
}>()
type Node = { row: T; id: Id; depth: number; children: Node[]; matched: boolean }
const all = computed(() => {
  function build(rows: readonly T[], depth: number): Node[] {
    return rows.map((row) => ({
      row,
      id: props.rowKey(row),
      depth,
      children: build(props.children(row) ?? [], depth + 1),
      matched: props.match?.(row) ?? true,
    }))
  }
  return build(props.rows, 0)
})
function flatten(nodes: Node[]): Node[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)])
}
const allNodes = computed(() => flatten(all.value))
const localExpanded = shallowRef<Id[]>([])
const known = shallowRef(new Set<Id>())
watch(
  allNodes,
  (nodes) => {
    const ids = new Set(nodes.map((n) => n.id))
    localExpanded.value = [
      ...localExpanded.value.filter((id) => ids.has(id)),
      ...nodes
        .filter((n) => n.children.length && !known.value.has(n.id) && props.defaultExpanded)
        .map((n) => n.id),
    ]
    known.value = ids
  },
  { immediate: true },
)
const expanded = computed(() => new Set(props.expandedIds ?? localExpanded.value))
function setExpanded(ids: Id[]) {
  if (props.expandedIds === undefined) localExpanded.value = ids
  emit('update:expandedIds', ids)
}
function toggleExpand(id: Id) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  setExpanded([...next])
}
function onRowClick(node: Node, event: MouseEvent) {
  if (!props.expandOnRowClick || props.match || !node.children.length) return
  const target = event.target
  if (target instanceof Element && target.closest('button, a, input, select, textarea, [role="button"], [role="checkbox"], [role="switch"], [contenteditable="true"]')) return
  toggleExpand(node.id)
}
const filtered = computed(() => {
  function visit(nodes: Node[], parentMatched = false): Node[] {
    return nodes.flatMap((node) => {
      const includeBranch = parentMatched || (props.filterMode === 'branch' && node.matched)
      const children = visit(node.children, includeBranch)
      return !props.match || node.matched || includeBranch || children.length
        ? [{ ...node, children }]
        : []
    })
  }
  return visit(all.value)
})
const filteredNodes = computed(() => flatten(filtered.value))
const visible = computed(() => {
  function visit(nodes: Node[]): Node[] {
    return nodes.flatMap((node) => [
      node,
      ...(props.match || expanded.value.has(node.id) ? visit(node.children) : []),
    ])
  }
  return visit(filtered.value)
})
const scope = computed(() =>
  props.selectScope === 'visible' ? visible.value : filteredNodes.value,
)
const selected = computed(() => new Set(props.selectedIds))
const headerState = computed(() => {
  const count = scope.value.filter((n) => selected.value.has(n.id)).length
  return count === 0 ? false : count === scope.value.length ? true : 'indeterminate'
})
function setSelection(nodes: Node[], checked: boolean) {
  const next = new Set(props.selectedIds)
  for (const node of nodes) {
    const original = allNodes.value.find((item) => item.id === node.id)
    const targets = props.selectionMode === 'cascade' && original ? flatten([original]) : [node]
    for (const target of targets) {
      if (checked) next.add(target.id)
      else next.delete(target.id)
    }
  }
  if (props.selectionMode === 'cascade') {
    function update(nodes: Node[]) {
      for (const node of nodes) {
        update(node.children)
        if (node.children.length) {
          if (node.children.every((child) => next.has(child.id))) next.add(node.id)
          else next.delete(node.id)
        }
      }
    }
    update(all.value)
  }
  emit('update:selectedIds', [...next])
}
function nodeState(node: Node): boolean | 'indeterminate' {
  const original = allNodes.value.find((n) => n.id === node.id) ?? node
  if (props.selectionMode !== 'cascade' || !original.children.length)
    return selected.value.has(node.id)
  const descendants = flatten([original])
  const count = descendants.filter((item) => selected.value.has(item.id)).length
  return count === 0 ? false : count === descendants.length ? true : 'indeterminate'
}
function selectNode(node: Node, checked: boolean) {
  const original = allNodes.value.find((n) => n.id === node.id)
  if (props.selectionMode !== 'cascade' || !original) return setSelection([node], checked)
  const next = new Set(props.selectedIds)
  for (const item of flatten([original])) {
    if (checked) next.add(item.id)
    else next.delete(item.id)
  }
  function updateParents(nodes: Node[]) {
    for (const item of nodes) {
      updateParents(item.children)
      if (item.children.length) {
        if (item.children.every((child) => next.has(child.id))) next.add(item.id)
        else next.delete(item.id)
      }
    }
  }
  updateParents(all.value)
  emit('update:selectedIds', [...next])
}
function value(row: T, key: string) {
  return (row as Record<string, unknown>)[key]
}
</script>

<template>
  <section class="flex w-full min-w-0 flex-col gap-4">
    <Card v-if="$slots.filters"
      ><CardContent><slot name="filters" /></CardContent
    ></Card>
    <Card class="tree-grid flex flex-col gap-0 pb-0">
      <CardHeader
        v-if="$slots.actions || $slots.toolbar || (showExpandAll && !match)"
        class="flex flex-row flex-wrap items-center justify-between gap-3 pb-4"
      >
        <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          <slot name="toolbar" />
          <template v-if="showExpandAll && !match">
            <div class="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                @click="setExpanded(allNodes.filter((n) => n.children.length).map((n) => n.id))"
                ><ChevronsUpDown data-icon="inline-start" />全部展开</Button
              >
              <Button type="button" variant="ghost" size="sm" @click="setExpanded([])"
                ><ChevronsDownUp data-icon="inline-start" />全部收起</Button
              >
            </div>
          </template>
        </div>
      </CardHeader>
      <CardContent class="min-w-0 px-0">
        <Alert v-if="errorMessage" variant="destructive" class="mx-4 mb-4 w-auto"
          ><AlertDescription class="flex flex-wrap items-center gap-2"
            >{{ errorMessage }}
            <Button type="button" variant="outline" size="sm" @click="emit('retry')"
              >重试</Button
            ></AlertDescription
          ></Alert
        >
        <Table>
          <colgroup>
            <col v-if="selectable" class="w-12" />
            <col
              v-for="column in columns"
              :key="column.key"
              :class="column.key === treeColumn ? 'w-[40%]' : undefined"
            />
            <col v-if="$slots['cell-actions']" class="w-px" />
          </colgroup>
          <TableHeader class="border-y border-border/60 bg-muted/30"
            ><TableRow class="hover:bg-transparent">
              <TableHead v-if="selectable"
                ><Checkbox
                  :aria-label="selectScope === 'visible' ? '选择当前显示的行' : '选择全部筛选结果'"
                  :model-value="headerState"
                  :disabled="!scope.length"
                  @update:model-value="setSelection(scope, $event === true)"
              /></TableHead>
              <TableHead v-for="column in columns" :key="column.key" scope="col" class="text-xs"
                ><span :class="column.key === treeColumn ? 'pl-8' : undefined">{{
                  column.label
                }}</span></TableHead
              >
              <TableHead v-if="$slots['cell-actions']" class="text-right">操作</TableHead>
            </TableRow></TableHeader
          >
          <TableBody :aria-busy="loading" :class="loading ? 'opacity-60' : ''">
            <TableRow v-if="!visible.length"
              ><TableCell
                :colspan="columns.length + (selectable ? 1 : 0) + ($slots['cell-actions'] ? 1 : 0)"
                ><slot name="empty" :error-message="errorMessage">{{
                  loading ? '加载中…' : '没有符合条件的数据'
                }}</slot></TableCell
              ></TableRow
            >
            <TableRow
              v-for="node in visible"
              :key="node.id"
              class="tree-row"
              :data-state="selected.has(node.id) ? 'selected' : undefined"
              @click="onRowClick(node, $event)"
            >
              <TableCell v-if="selectable" class="py-2.5"
                ><Checkbox
                  :aria-label="`选择 ${rowLabel(node.row)}`"
                  :model-value="nodeState(node)"
                  @update:model-value="selectNode(node, $event === true)"
              /></TableCell>
              <TableCell v-for="column in columns" :key="column.key" class="py-2.5">
                <div
                  v-if="column.key === treeColumn"
                  class="flex min-w-56 items-center gap-1"
                  :style="{ paddingLeft: `${node.depth * 20}px` }"
                >
                  <Button
                    v-if="node.children.length && !match"
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-7 shrink-0 aria-expanded:bg-transparent aria-expanded:hover:bg-muted"
                    :aria-label="`${expanded.has(node.id) ? '收起' : '展开'} ${rowLabel(node.row)}`"
                    :aria-expanded="expanded.has(node.id)"
                    @click="toggleExpand(node.id)"
                    ><ChevronRight
                      class="transition-transform motion-reduce:transition-none"
                      :class="{ 'rotate-90': expanded.has(node.id) }"
                  /></Button>
                  <span v-else class="size-7 shrink-0" aria-hidden="true" />
                  <span class="sr-only">第 {{ node.depth + 1 }} 级</span>
                  <slot :name="`cell-${column.key}`" :row="node.row"
                    ><span
                      class="truncate text-foreground"
                      :class="props.children(node.row)?.length ? 'font-medium' : 'font-normal'"
                      :title="rowLabel(node.row)"
                      >{{ rowLabel(node.row) }}</span
                    ></slot
                  >
                </div>
                <slot v-else :name="`cell-${column.key}`" :row="node.row"
                  ><span
                    class="text-muted-foreground"
                    :class="cellClass?.(column.key)"
                    :title="String(value(node.row, column.key) ?? '')"
                    >{{ value(node.row, column.key) ?? '—' }}</span
                  ></slot
                >
              </TableCell>
              <TableCell v-if="$slots['cell-actions']" class="py-2.5"
                ><div class="flex items-center justify-end">
                  <slot name="cell-actions" :row="node.row" /></div
              ></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter
        class="flex flex-wrap justify-between gap-2 border-t border-border/60 py-3 text-xs text-muted-foreground"
        ><span aria-live="polite">{{
          selectedIds.length ? `已选 ${selectedIds.length} 项` : ''
        }}</span
        ><span>{{
          match
            ? `匹配 ${allNodes.filter((n) => n.matched).length} 条，含路径共 ${filteredNodes.length} 条`
            : `共 ${allNodes.length} 条`
        }}</span></CardFooter
      >
    </Card>
  </section>
</template>

<style scoped>
.tree-grid :deep([data-slot='table-head']:first-child),
.tree-grid :deep([data-slot='table-cell']:first-child) {
  padding-left: 1rem;
}

.tree-grid :deep([data-slot='table-head']:last-child),
.tree-grid :deep([data-slot='table-cell']:last-child) {
  padding-right: 1rem;
}

.tree-grid :deep([data-slot='table-cell']) {
  height: 3.25rem;
}

.tree-grid :deep([data-slot='table-head']) {
  height: 2.5rem;
}

.tree-row:has([aria-expanded]) {
  background-color: transparent;
}

.tree-row:hover {
  background-color: color-mix(in oklab, var(--muted) 50%, transparent);
}

.tree-row[data-state='selected'] {
  background-color: color-mix(in oklab, var(--muted) 60%, transparent);
}
</style>
