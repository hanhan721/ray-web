<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '@lucide/vue'
import type { NavNode } from '@/router/menu-routes'

defineProps<{
  nodes: NavNode[]
  open: Set<number>
  activeAncestors: Set<number>
  icons: Record<string, Component>
  depth: number
}>()
const emit = defineEmits<{ toggle: [id: number]; navigate: [] }>()

function onNavigate(event: MouseEvent) {
  if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    emit('navigate')
  }
}

function monogram(title: string): string {
  const char = title.trim().charAt(0)
  return char || '·'
}
</script>

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
          <component :is="icons[node.icon]" v-if="node.icon && icons[node.icon]" class="size-4" />
          <span v-else class="nav-monogram">{{ monogram(node.title) }}</span>
        </span>
        <span class="nav-label">{{ node.title }}</span>
      </RouterLink>
      <template v-else>
        <button
          type="button"
          class="nav-link nav-directory"
          :class="{ 'nav-ancestor': activeAncestors.has(node.id) }"
          :style="{
            '--nav-depth': depth,
            '--ancestor-strength': `${Math.min(30 + depth * 20, 80)}%`,
          }"
          :title="node.title"
          :aria-expanded="open.has(node.id)"
          :aria-controls="`nav-group-${node.id}`"
          @click="emit('toggle', node.id)"
        >
          <span class="nav-icon" aria-hidden="true">
            <component :is="icons[node.icon]" v-if="node.icon && icons[node.icon]" class="size-4" />
            <span v-else class="nav-monogram">{{ monogram(node.title) }}</span>
          </span>
          <span class="nav-label">{{ node.title }}</span>
          <ChevronRight
            class="nav-chevron size-4"
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
                :icons="icons"
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

<style scoped>
.nav-tree {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  width: 100%;
  min-width: 0;
  padding-inline: var(--app-sidebar-inset, 0.5rem);
}
.nav-tree > li {
  min-width: 0;
}
.nav-link {
  display: grid;
  grid-template-columns: var(--app-nav-icon, 3rem) minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--sidebar-foreground);
  font: inherit;
  font-size: 0.875rem;
  text-align: left;
  text-decoration: none;
  outline: none;
}
.nav-icon {
  display: grid;
  height: 2.5rem;
  place-items: center;
}
.nav-monogram {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  border-radius: 0.25rem;
  background: var(--sidebar-accent);
  color: var(--sidebar-primary);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
}
.nav-label {
  min-width: 0;
  padding-right: 0.75rem;
  padding-left: calc(var(--nav-depth, 0) * 0.75rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-chevron {
  margin-right: 0.625rem;
  transition: transform 200ms ease;
}
.nav-chevron.is-open {
  transform: rotate(90deg);
}
.nav-directory {
  width: 100%;
  cursor: pointer;
}
.nav-link:hover {
  background: var(--muted);
}
.nav-link:focus-visible {
  outline: 2px solid var(--sidebar-primary);
  outline-offset: -2px;
}
.nav-link-active,
.nav-link-active:hover {
  background: var(--sidebar-accent);
  color: var(--sidebar-primary);
  font-weight: 600;
}
.nav-ancestor,
.nav-ancestor:hover {
  color: var(--sidebar-primary);
  font-weight: 500;
  background: color-mix(in oklch, var(--sidebar-accent) var(--ancestor-strength), var(--sidebar));
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
    grid-template-rows 200ms ease,
    opacity 200ms ease;
}
.nav-expand-enter-from,
.nav-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
</style>
