<template>
  <nav ref="navRef" class="top-nav" aria-label="一级导航">
    <ul class="top-nav-list">
      <li>
        <RouterLink v-slot="{ href, navigate }" to="/dashboard" custom>
          <a
            :href="href"
            class="top-nav-link"
            :class="{ 'is-active': homeActive }"
            :aria-current="homeActive ? 'page' : undefined"
            @click="navigate"
          >
            <NIcon :size="16" :component="GridOutline" aria-hidden="true" />
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
            :aria-current="activeId === node.id ? (node.kind === 'item' ? 'page' : 'true') : undefined"
            @click="navigate"
          >
            <NIcon :size="16" :component="resolveMenuIcon(node.icon)" aria-hidden="true" />
            <span>{{ node.title }}</span>
          </a>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { GridOutline } from '@vicons/ionicons5'
import { resolveMenuIcon } from '../menu-icons'
import { firstNavigationPath, type NavNode } from '../navigation'

defineOptions({
  name: 'TopNav',
})

const props = defineProps<{
  nodes: NavNode[]
  activeId?: number
  homeActive: boolean
}>()

const navRef = ref<HTMLElement | null>(null)

const links = computed(() =>
  props.nodes.flatMap((node) => {
    const to = firstNavigationPath(node)
    return to ? [{ ...node, to }] : []
  })
)

watch(
  () => [props.activeId, props.homeActive],
  async () => {
    await nextTick()
    navRef.value?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.top-nav {
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.top-nav-list {
  display: flex;
  align-items: stretch;
  gap: 4px;
  width: max-content;
  min-width: 100%;
}

.top-nav-link {
  position: relative;
  display: flex;
  height: calc(var(--header-height) - 1px);
  align-items: center;
  gap: 8px;
  padding-inline: 16px;
  color: var(--text-color-secondary);
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  outline: none;
  cursor: pointer;

  &:hover {
    background: var(--bg-color-hover);
    color: var(--text-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -4px;
    border-radius: var(--border-radius);
  }

  &.is-active {
    color: var(--primary-color);
  }

  &.is-active::after {
    position: absolute;
    right: 16px;
    bottom: 0;
    left: 16px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: currentColor;
    content: '';
  }
}

@media (max-width: 767px) {
  .top-nav-link {
    height: 47px;
    padding-inline: 14px;
  }
}
</style>
