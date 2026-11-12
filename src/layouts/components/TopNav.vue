<script setup lang="ts">
import type { Component } from 'vue'
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { LayoutGrid } from '@lucide/vue'
import type { NavNode } from '@/router/menu-routes'
import { firstNavigationPath } from '../navigation'

const props = defineProps<{
  nodes: NavNode[]
  activeId?: number
  homeActive: boolean
  icons: Record<string, Component>
}>()

const nav = useTemplateRef<HTMLElement>('nav')
const links = computed(() =>
  props.nodes.flatMap((node) => {
    const to = firstNavigationPath(node)
    return to ? [{ ...node, to }] : []
  }),
)

watch(
  () => [props.activeId, props.homeActive],
  async () => {
    await nextTick()
    nav.value
      ?.querySelector('[aria-current]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { immediate: true },
)
</script>

<template>
  <nav ref="nav" class="top-nav" aria-label="一级导航">
    <ul class="top-nav-list">
      <li>
        <RouterLink v-slot="{ href, navigate }" to="/" custom>
          <a
            :href="href"
            class="top-nav-link"
            :class="{ 'is-active': homeActive }"
            :aria-current="homeActive ? 'page' : undefined"
            @click="navigate"
          >
            <LayoutGrid class="size-4 shrink-0" aria-hidden="true" />
            <span>工作台</span>
          </a>
        </RouterLink>
      </li>
      <li v-for="node in links" :key="node.id">
        <RouterLink v-slot="{ href, navigate }" :to="node.to" custom>
          <a
            :href="href"
            class="top-nav-link"
            :class="{ 'is-active': activeId === node.id }"
            :aria-current="
              activeId === node.id ? (node.kind === 'item' ? 'page' : 'true') : undefined
            "
            @click="navigate"
          >
            <component
              :is="icons[node.icon]"
              v-if="node.icon && icons[node.icon]"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{{ node.title }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.top-nav {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.top-nav-list {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  width: max-content;
  min-width: 100%;
}

.top-nav-link {
  position: relative;
  display: flex;
  height: calc(4rem - 1px);
  align-items: center;
  gap: 0.5rem;
  padding-inline: 1rem;
  color: var(--muted-foreground);
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  outline: none;
}

.top-nav-link:hover {
  background: var(--muted);
  color: var(--foreground);
}

.top-nav-link:focus-visible {
  outline: 2px solid var(--sidebar-primary);
  outline-offset: -4px;
  border-radius: var(--radius);
}

.top-nav-link.is-active {
  color: var(--sidebar-primary);
}

.top-nav-link.is-active::after {
  position: absolute;
  right: 1rem;
  bottom: 0;
  left: 1rem;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: currentColor;
  content: '';
}

@media (max-width: 767px) {
  .top-nav-link {
    height: calc(3rem - 1px);
    padding-inline: 0.875rem;
  }
}
</style>
