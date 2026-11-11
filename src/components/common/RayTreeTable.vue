<script setup lang="ts" generic="T, Id extends string | number">
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import type { ColumnSettingItem } from './column-settings'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const props = withDefaults(defineProps<{
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
  selectable?: boolean
  selectionMode?: 'independent' | 'cascade'
  selectScope?: 'visible' | 'filtered'
  selectedIds?: Id[]
  loading?: boolean
  errorMessage?: string
  cellClass?: (columnId: string) => string
}>(), { filterMode: 'ancestors', defaultExpanded: true, showExpandAll: true, selectable: true, selectionMode: 'independent', selectScope: 'visible', selectedIds: () => [], loading: false, errorMessage: '', match: undefined, expandedIds: undefined, cellClass: undefined })
const emit = defineEmits<{ 'update:expandedIds': [ids: Id[]], 'update:selectedIds': [ids: Id[]], retry: [] }>()
defineSlots<{ filters?: () => unknown, actions?: () => unknown, toolbar?: () => unknown, empty?: (props: { errorMessage: string }) => unknown, [key: `cell-${string}`]: (props: { row: T }) => unknown }>()
type Node = { row: T, id: Id, depth: number, children: Node[], matched: boolean }
const all = computed(() => {
  function build(rows: readonly T[], depth: number): Node[] {
    return rows.map(row => ({ row, id: props.rowKey(row), depth, children: build(props.children(row) ?? [], depth + 1), matched: props.match?.(row) ?? true }))
  }
  return build(props.rows, 0)
})
function flatten(nodes: Node[]): Node[] { return nodes.flatMap(node => [node, ...flatten(node.children)]) }
const allNodes = computed(() => flatten(all.value))
const localExpanded = shallowRef<Id[]>([])
const known = shallowRef(new Set<Id>())
watch(allNodes, nodes => {
  const ids = new Set(nodes.map(n => n.id))
  localExpanded.value = [...localExpanded.value.filter(id => ids.has(id)), ...nodes.filter(n => n.children.length && !known.value.has(n.id) && props.defaultExpanded).map(n => n.id)]
  known.value = ids
}, { immediate: true })
const expanded = computed(() => new Set(props.expandedIds ?? localExpanded.value))
function setExpanded(ids: Id[]) { if (props.expandedIds === undefined) localExpanded.value = ids; emit('update:expandedIds', ids) }
function toggleExpand(id: Id) { const next = new Set(expanded.value); if (next.has(id)) next.delete(id); else next.add(id); setExpanded([...next]) }
const filtered = computed(() => {
  function visit(nodes: Node[], parentMatched = false): Node[] {
    return nodes.flatMap(node => {
      const includeBranch = parentMatched || (props.filterMode === 'branch' && node.matched)
      const children = visit(node.children, includeBranch)
      return !props.match || node.matched || includeBranch || children.length ? [{ ...node, children }] : []
    })
  }
  return visit(all.value)
})
const filteredNodes = computed(() => flatten(filtered.value))
const visible = computed(() => {
  function visit(nodes: Node[]): Node[] { return nodes.flatMap(node => [node, ...((props.match || expanded.value.has(node.id)) ? visit(node.children) : [])]) }
  return visit(filtered.value)
})
const scope = computed(() => props.selectScope === 'visible' ? visible.value : filteredNodes.value)
const selected = computed(() => new Set(props.selectedIds))
const headerState = computed(() => { const count = scope.value.filter(n => selected.value.has(n.id)).length; return count === 0 ? false : count === scope.value.length ? true : 'indeterminate' })
function setSelection(nodes: Node[], checked: boolean) {
  const next = new Set(props.selectedIds)
  for (const node of nodes) {
    const original = allNodes.value.find(item => item.id === node.id)
    const targets = props.selectionMode === 'cascade' && original ? flatten([original]) : [node]
    for (const target of targets) { if (checked) next.add(target.id); else next.delete(target.id) }
  }
  if (props.selectionMode === 'cascade') {
    function update(nodes: Node[]) {
      for (const node of nodes) {
        update(node.children)
        if (node.children.length) {
          if (node.children.every(child => next.has(child.id))) next.add(node.id)
          else next.delete(node.id)
        }
      }
    }
    update(all.value)
  }
  emit('update:selectedIds', [...next])
}
function nodeState(node: Node): boolean | 'indeterminate' {
  const original = allNodes.value.find(n => n.id === node.id) ?? node
  if (props.selectionMode !== 'cascade' || !original.children.length) return selected.value.has(node.id)
  const descendants = flatten([original])
  const count = descendants.filter(item => selected.value.has(item.id)).length
  return count === 0 ? false : count === descendants.length ? true : 'indeterminate'
}
function selectNode(node: Node, checked: boolean) {
  const original = allNodes.value.find(n => n.id === node.id)
  if (props.selectionMode !== 'cascade' || !original) return setSelection([node], checked)
  const next = new Set(props.selectedIds)
  for (const item of flatten([original])) { if (checked) next.add(item.id); else next.delete(item.id) }
  function updateParents(nodes: Node[]) {
    for (const item of nodes) {
      updateParents(item.children)
      if (item.children.length) {
        if (item.children.every(child => next.has(child.id))) next.add(item.id)
        else next.delete(item.id)
      }
    }
  }
  updateParents(all.value)
  emit('update:selectedIds', [...next])
}
function value(row: T, key: string) { return (row as Record<string, unknown>)[key] }
</script>

<template>
  <section class="flex w-full min-w-0 flex-col gap-4">
    <Card v-if="$slots.filters"><CardContent><slot name="filters" /></CardContent></Card>
    <Card class="flex flex-col">
      <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
        <div class="flex items-center gap-2">
          <slot name="toolbar" />
          <template v-if="showExpandAll && !match">
            <Button variant="ghost" size="sm" @click="setExpanded(allNodes.filter(n => n.children.length).map(n => n.id))">全部展开</Button>
            <Button variant="ghost" size="sm" @click="setExpanded([])">全部收起</Button>
          </template>
        </div>
      </CardHeader>
      <CardContent class="min-w-0">
        <div v-if="errorMessage" class="mb-3 text-sm text-destructive" role="alert">{{ errorMessage }} <Button variant="outline" size="sm" @click="emit('retry')">重试</Button></div>
        <Table>
          <TableHeader class="bg-muted"><TableRow class="hover:bg-transparent">
            <TableHead v-if="selectable"><Checkbox :aria-label="selectScope === 'visible' ? '选择当前显示的行' : '选择全部筛选结果'" :model-value="headerState" :disabled="!scope.length" @update:model-value="setSelection(scope, $event === true)" /></TableHead>
            <TableHead v-for="column in columns" :key="column.key" scope="col" class="text-xs">{{ column.label }}</TableHead>
            <TableHead v-if="$slots['cell-actions']">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody :aria-busy="loading" :class="loading ? 'opacity-60' : ''">
            <TableRow v-if="!visible.length"><TableCell :colspan="columns.length + (selectable ? 1 : 0) + ($slots['cell-actions'] ? 1 : 0)"><slot name="empty" :error-message="errorMessage">{{ loading ? '加载中…' : '没有符合条件的数据' }}</slot></TableCell></TableRow>
            <TableRow v-for="node in visible" :key="node.id" :data-state="selected.has(node.id) ? 'selected' : undefined">
              <TableCell v-if="selectable"><Checkbox :aria-label="`选择 ${rowLabel(node.row)}`" :model-value="nodeState(node)" @update:model-value="selectNode(node, $event === true)" /></TableCell>
              <TableCell v-for="column in columns" :key="column.key">
                <div v-if="column.key === treeColumn" class="flex min-w-48 items-center" :style="{ paddingLeft: `${node.depth * 20}px` }">
                  <Button v-if="node.children.length && !match" variant="ghost" size="icon" class="mr-1 size-7 shrink-0" :aria-label="`${expanded.has(node.id) ? '收起' : '展开'} ${rowLabel(node.row)}`" :aria-expanded="expanded.has(node.id)" @click="toggleExpand(node.id)"><ChevronDown v-if="expanded.has(node.id)" /><ChevronRight v-else /></Button>
                  <span v-else class="mr-1 size-7 shrink-0" />
                  <span class="sr-only">第 {{ node.depth + 1 }} 级</span>
                  <slot :name="`cell-${column.key}`" :row="node.row"><span class="truncate font-medium" :title="rowLabel(node.row)">{{ rowLabel(node.row) }}</span></slot>
                </div>
                <slot v-else :name="`cell-${column.key}`" :row="node.row"><span :class="cellClass?.(column.key)" :title="String(value(node.row, column.key) ?? '')">{{ value(node.row, column.key) ?? '—' }}</span></slot>
              </TableCell>
              <TableCell v-if="$slots['cell-actions']"><slot name="cell-actions" :row="node.row" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter class="flex justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground"><span aria-live="polite">{{ selectedIds.length ? `已选 ${selectedIds.length} 项` : '' }}</span><span>{{ match ? `匹配 ${allNodes.filter(n => n.matched).length} 条，含路径共 ${filteredNodes.length} 条` : `共 ${allNodes.length} 条` }}</span></CardFooter>
    </Card>
  </section>
</template>
