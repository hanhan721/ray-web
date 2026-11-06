<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : '模块'))
</script>

<template>
  <section class="max-w-2xl">
    <h1 class="text-lg font-medium">{{ title }}</h1>
    <p class="text-muted-foreground mt-2 text-sm leading-6">这个模块会在后续阶段接上真实数据。</p>
  </section>
</template>
