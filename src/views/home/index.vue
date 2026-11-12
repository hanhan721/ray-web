<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const { displayName } = storeToRefs(session)
</script>

<template>
  <section class="max-w-2xl">
    <h1 class="text-lg font-medium">{{ displayName || '工作台' }}</h1>
    <p class="text-muted-foreground mt-2 text-sm leading-6">
      从顶部选择模块，再通过子菜单进入要处理的页面。
    </p>
    <p v-if="session.can('system:file:upload')" class="mt-4 text-sm leading-6">
      <RouterLink to="/file" class="underline">上传和删除未绑定文件</RouterLink>
    </p>
  </section>
</template>
