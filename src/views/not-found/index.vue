<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="max-w-xl">
    <h1 class="text-lg font-medium">没有这个页面</h1>
    <p class="text-muted-foreground mt-2 text-sm leading-6">地址没有对应的菜单或页面。</p>
    <RouterLink
      to="/"
      class="text-primary focus-visible:ring-ring mt-4 inline-flex rounded-md text-sm outline-none focus-visible:ring-2"
    >
      返回工作台
    </RouterLink>
  </section>
</template>
