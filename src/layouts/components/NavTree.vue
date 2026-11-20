<template>
  <ul class="nav-tree">
    <li v-for="node in nodes" :key="`${node.kind}-${node.id}`">
      <RouterLink
        v-if="node.kind === 'item'"
        :to="node.to"
        :title="node.title"
        class="nav-link"
        :style="{ '--nav-depth': depth }"
        exact-active-class="nav-link-active"
        @click="onNavigate"
      >
        <span class="nav-icon" aria-hidden="true">
          <NIcon v-if="node.icon && hasMenuIcon(node.icon)" :size="16" :component="resolveMenuIcon(node.icon)" />
          <span v-else class="nav-monogram">{{ monogram(node.title) }}</span>
        </span>
        <span class="nav-label">{{ node.title }}</span>
      </RouterLink>
      <template v-else>
        <button
          type="button"
          class="nav-link nav-directory"
          :class="{ 'nav-ancestor': activeAncestors.has(node.id) }"
          :style="{ '--nav-depth': depth }"
          :title="node.title"
          :aria-expanded="open.has(node.id)"
          :aria-controls="`nav-group-${node.id}`"
          @click="emit('toggle', node.id)"
        >
          <span class="nav-icon" aria-hidden="true">
            <NIcon v-if="node.icon && hasMenuIcon(node.icon)" :size="16" :component="resolveMenuIcon(node.icon)" />
            <span v-else class="nav-monogram">{{ monogram(node.title) }}</span>
          </span>
          <span class="nav-label">{{ node.title }}</span>
          <ChevronForwardOutline
            class="nav-chevron"
            :class="{ 'is-open': open.has(node.id) }"
            aria-hidden="true"
          />
        </button>
        <Transition name="nav-expand">
          <div v-show="open.has(node.id)" :id="`nav-group-${node.id}`" class="nav-group">
            <div class="nav-group-content">
              <NavTree
                :nodes="node.items"
                :open="open"
                :active-ancestors="activeAncestors"
                :depth="depth + 1"
                @toggle="(id) => emit('toggle', id)"
                @navigate="emit('navigate')"
              />
            </div>
          </div>
        </Transition>
      </template>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ChevronForwardOutline } from '@vicons/ionicons5'
import { hasMenuIcon, resolveMenuIcon } from '../menu-icons'
import type { NavNode } from '../navigation'

defineOptions({
  name: 'NavTree',
})

defineProps<{
  nodes: NavNode[]
  open: Set<number>
  activeAncestors: Set<number>
  depth: number
}>()

const emit = defineEmits<{
  (e: 'toggle', id: number): void
  (e: 'navigate'): void
}>()

function onNavigate(event: MouseEvent) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    emit('navigate')
  }
}

function monogram(title: string): string {
  return title.trim().charAt(0) || '·'
}
</script>

<style scoped lang="scss">
.nav-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-width: 0;
  padding-inline: var(--app-sidebar-inset, 8px);
}

.nav-tree > li {
  min-width: 0;
}

.nav-link {
  display: grid;
  grid-template-columns: var(--app-nav-icon, 48px) minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--nav-sidebar-fg, var(--text-color-primary));
  font: inherit;
  font-size: 14px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  outline: none;

  &:hover {
    background: var(--nav-sidebar-hover, var(--bg-color-hover));
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
}

.nav-directory {
  width: 100%;
}

.nav-icon {
  display: grid;
  height: 40px;
  place-items: center;
}

.nav-monogram {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 4px;
  background: var(--nav-sidebar-active, var(--primary-color-suppl));
  color: var(--nav-accent, var(--primary-color));
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.nav-label {
  min-width: 0;
  padding-right: 12px;
  padding-left: calc(var(--nav-depth, 0) * 12px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 120ms ease;
}

.nav-chevron {
  width: 16px;
  height: 16px;
  margin-right: 10px;
  transition:
    transform 200ms ease,
    opacity 120ms ease;

  &.is-open {
    transform: rotate(90deg);
  }
}

.nav-link-active,
.nav-link-active:hover {
  background: var(--nav-sidebar-active, var(--primary-color-suppl));
  color: var(--nav-accent, var(--primary-color));
  font-weight: 600;
}

.nav-ancestor,
.nav-ancestor:hover {
  color: var(--nav-accent, var(--primary-color));
  font-weight: 500;
}

.nav-group {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows 200ms ease,
    opacity 120ms ease;
}

.nav-group-content {
  min-height: 0;
  overflow: hidden;
}

.nav-expand-enter-active,
.nav-expand-leave-active {
  transition:
    grid-template-rows 200ms ease,
    opacity 200ms ease;
}

.nav-expand-enter-from,
.nav-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nav-label,
  .nav-chevron,
  .nav-group,
  .nav-expand-enter-active,
  .nav-expand-leave-active {
    transition: none;
  }
}
</style>
