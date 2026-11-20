<template>
  <div id="main" tabindex="-1" class="app-main">
    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <KeepAlive :include="cachedViews">
          <component :is="Component" :key="route.fullPath" />
        </KeepAlive>
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useTabsStore } from '@/stores/tabs'

defineOptions({
  name: 'AppMain',
})

const route = useRoute()
const tabsStore = useTabsStore()
const { cachedViews } = storeToRefs(tabsStore)
</script>

<style scoped lang="scss">
.app-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: $spacing-md;
  overflow: auto;
  background: var(--bg-color);
  outline: none;

  @media (min-width: 768px) {
    padding: $spacing-lg;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
