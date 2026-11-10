<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from 'cn'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { selectTriggerVariants } from './select-styles'

const props = withDefaults(
  defineProps<
    SelectTriggerProps & { class?: HTMLAttributes['class']; size?: 'sm' | 'default' | 'lg' }
  >(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="
      cn(
        selectTriggerVariants({ size }),
        'justify-between whitespace-nowrap data-placeholder:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDownIcon
        class="text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 group-data-[state=open]/select:rotate-180"
      />
    </SelectIcon>
  </SelectTrigger>
</template>
