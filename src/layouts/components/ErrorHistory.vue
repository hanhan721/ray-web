<script setup lang="ts">
import { computed } from 'vue'
import { Bell } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { errorHistory } from '@/utils/error-history'

const newestFirst = computed(() => [...errorHistory.value].reverse())
const formatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <Button type="button" variant="ghost" size="icon" aria-label="错误记录" title="错误记录">
        <Bell aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        align="end"
        :side-offset="8"
        :collision-padding="12"
        aria-label="错误记录"
        class="bg-popover text-popover-foreground z-50 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border shadow-md outline-none"
      >
        <div class="border-b px-4 py-3 text-sm font-medium">错误记录</div>
        <p
          v-if="newestFirst.length === 0"
          class="text-muted-foreground px-4 py-8 text-center text-sm"
        >
          暂无错误记录
        </p>
        <ul
          v-else
          class="max-h-[min(24rem,var(--reka-popover-content-available-height))] overflow-y-auto"
        >
          <li v-for="entry in newestFirst" :key="entry.id" class="border-b last:border-b-0">
            <PopoverRoot>
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="hover:bg-muted/60 focus-visible:ring-ring relative flex w-full flex-col gap-1 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <span class="line-clamp-2 w-full text-sm leading-5 break-all">{{
                    entry.message
                  }}</span>
                  <span class="text-muted-foreground w-full truncate text-xs">{{ entry.path }}</span>
                  <time
                    class="text-muted-foreground text-xs"
                    :datetime="new Date(entry.time).toISOString()"
                  >
                    {{ formatter.format(entry.time) }}
                  </time>
                </button>
              </PopoverTrigger>
              <PopoverPortal>
                <PopoverContent
                  side="left"
                  align="start"
                  :side-offset="8"
                  :collision-padding="12"
                  aria-label="错误详情"
                  class="bg-popover text-popover-foreground z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-md border p-4 shadow-md outline-none"
                >
                  <p
                    class="max-h-[min(16rem,var(--reka-popover-content-available-height))] overflow-y-auto text-sm leading-6 break-all whitespace-pre-wrap"
                  >
                    {{ entry.message }}
                  </p>
                  <p class="text-muted-foreground mt-3 border-t pt-3 text-xs break-all">
                    {{ entry.path }}
                  </p>
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>
          </li>
        </ul>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
