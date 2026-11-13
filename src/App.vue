<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const { mode } = storeToRefs(theme)
theme.syncFromDom()
</script>

<template>
  <RouterView />
  <Toaster :theme="mode" position="top-right" />
</template>
