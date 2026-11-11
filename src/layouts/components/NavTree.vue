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
const emit = defineEmits<{ toggle: [id: number] }>()
</script>

<template>
  <ul class="nav-tree">
    <li v-for="node in nodes" :key="`${node.kind}-${node.id}`">
      <RouterLink
        v-if="node.kind === 'item'"
        :to="node.to"
        :title="node.title"
        class="nav-link"
        :style="{ paddingLeft: `${0.75 + depth * 0.75}rem` }"
        exact-active-class="nav-link-active"
      >
        <component :is="icons[node.icon]" v-if="depth === 0 && node.icon && icons[node.icon]" class="size-4 shrink-0" />
        <span class="flex-1 whitespace-nowrap">{{ node.title }}</span>
      </RouterLink>
      <template v-else>
        <button
          type="button"
          class="nav-link nav-directory"
          :class="{ 'nav-ancestor': activeAncestors.has(node.id) }"
          :style="{ paddingLeft: `${0.75 + depth * 0.75}rem`, '--ancestor-strength': `${Math.min(30 + depth * 20, 80)}%` }"
          :title="node.title"
          :aria-expanded="open.has(node.id)"
          :aria-controls="`nav-group-${node.id}`"
          @click="emit('toggle', node.id)"
        >
          <component :is="icons[node.icon]" v-if="depth === 0 && node.icon && icons[node.icon]" class="size-4 shrink-0" />
          <span class="flex-1 whitespace-nowrap">{{ node.title }}</span>
          <ChevronRight class="size-4 shrink-0 transition-transform" :class="{ 'rotate-90': open.has(node.id) }" />
        </button>
        <Transition name="nav-expand">
          <div :id="`nav-group-${node.id}`" v-show="open.has(node.id)" class="nav-group">
            <div class="nav-group-content">
              <NavTree :nodes="node.items" :open="open" :active-ancestors="activeAncestors" :icons="icons" :depth="depth + 1" @toggle="(id) => emit('toggle', id)" />
            </div>
          </div>
        </Transition>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.nav-tree { display: flex; flex-direction: column; gap: 0.125rem; width: max-content; min-width: 100%; }
.nav-link { display: flex; align-items: center; gap: 0.75rem; min-height: 2.5rem; padding: 0.5rem 0.75rem; border-radius: 0.5rem; color: var(--sidebar-foreground); font-size: 0.875rem; outline: none; }
.nav-directory { width: 100%; text-align: left; }
.nav-link:hover { background: var(--muted); }
.nav-link:focus-visible { outline: 2px solid var(--sidebar-primary); outline-offset: -2px; }
.nav-link-active, .nav-link-active:hover { background: var(--sidebar-accent); color: var(--sidebar-primary); font-weight: 600; }
.nav-ancestor, .nav-ancestor:hover { color: var(--sidebar-primary); font-weight: 500; background: color-mix(in oklch, var(--sidebar-accent) var(--ancestor-strength), var(--sidebar)); }
.nav-group { display: grid; grid-template-rows: 1fr; }
.nav-group-content { min-height: 0; overflow: hidden; }
.nav-expand-enter-active, .nav-expand-leave-active { transition: grid-template-rows 200ms ease, opacity 200ms ease; }
.nav-expand-enter-from, .nav-expand-leave-to { grid-template-rows: 0fr; opacity: 0; }
</style>
