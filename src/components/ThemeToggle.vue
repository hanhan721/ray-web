<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { MoonIcon, SunIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const { mode } = storeToRefs(theme)
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    :aria-label="mode === 'dark' ? '切换到浅色' : '切换到深色'"
    :title="mode === 'dark' ? '切换到浅色' : '切换到深色'"
    @click="theme.toggle()"
  >
    <SunIcon v-if="mode === 'dark'" />
    <MoonIcon v-else />
  </Button>
</template>
