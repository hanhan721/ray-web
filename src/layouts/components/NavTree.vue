<template>
  <ul class="nav-tree">
    <li v-for="node in nodes" :key="`${node.kind}-${node.id}`">
      <RouterLink
        v-if="node.kind === 'item'"
        :to="node.to"
        :title="node.title"
        class="nav-link"
        :style="{ paddingLeft: `${12 + depth * 10}px` }"
        exact-active-class="nav-link-active"
        @click="onNavigate"
      >
        <NIcon :size="16" :component="resolveMenuIcon(node.icon)" aria-hidden="true" />
        <span class="nav-label">{{ node.title }}</span>
      </RouterLink>
      <template v-else>
        <button
          type="button"
          class="nav-link nav-directory"
          :class="{ 'nav-ancestor': activeAncestors.has(node.id) }"
          :style="{ paddingLeft: `${12 + depth * 10}px` }"
          :title="node.title"
          :aria-expanded="open.has(node.id)"
          :aria-controls="`nav-group-${node.id}`"
          @click="emit('toggle', node.id)"
        >
          <NIcon :size="16" :component="resolveMenuIcon(node.icon)" aria-hidden="true" />
          <span class="nav-label">{{ node.title }}</span>
          <ChevronForwardOutline class="nav-chevron" :class="{ 'is-open': open.has(node.id) }" aria-hidden="true" />
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
import { resolveMenuIcon } from '../menu-icons'
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
</script>

<style scoped lang="scss">
.nav-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: max-content;
  min-width: 100%;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 8px 12px;
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

.nav-label {
  flex: 1;
  white-space: nowrap;
}

.nav-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.2s ease;

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
}

.nav-group-content {
  min-height: 0;
  overflow: hidden;
}

.nav-expand-enter-active,
.nav-expand-leave-active {
  transition:
    grid-template-rows 0.2s ease,
    opacity 0.2s ease;
}

.nav-expand-enter-from,
.nav-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nav-chevron,
  .nav-expand-enter-active,
  .nav-expand-leave-active {
    transition: none;
  }
}
</style>
