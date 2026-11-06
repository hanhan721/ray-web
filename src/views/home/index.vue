<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const { displayName } = storeToRefs(session)
</script>

<template>
  <section class="max-w-2xl">
    <h1 class="text-lg font-medium">{{ displayName || '工作台' }}</h1>
    <p class="text-muted-foreground mt-2 text-sm leading-6">从左侧菜单进入要处理的模块。</p>
  </section>
</template>
