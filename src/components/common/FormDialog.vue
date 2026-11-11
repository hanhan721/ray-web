<script setup lang="ts">
import { OctagonX, TriangleAlert, XIcon } from '@lucide/vue'
import { computed } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type FormDialogSize = 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    description?: string
    /** 说明只给屏幕阅读器使用，视觉上不占位。 */
    hideDescription?: boolean
    /** md 适合短表单，lg 适合两列表单，xl 适合带长列表的编辑器。 */
    size?: FormDialogSize
    saving?: boolean
    /** 整体错误；字段级错误仍由页面用 FieldError 展示。 */
    error?: string
    /** 部分成功的补充说明；有值时错误提示改用普通样式。 */
    stepNote?: string
    contentClass?: string
  }>(),
  {
    description: '',
    hideDescription: false,
    size: 'lg',
    saving: false,
    error: '',
    stepNote: '',
    contentClass: '',
  },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  submit: []
}>()

const sizeClass = computed(() => {
  if (props.size === 'md') return 'sm:max-w-md'
  if (props.size === 'xl') return 'sm:max-w-3xl'
  return 'sm:max-w-2xl'
})

function onOpenChange(open: boolean) {
  if (!open && props.saving) return
  emit('update:open', open)
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      :show-close-button="false"
      :class="[
        'flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0',
        sizeClass,
        props.contentClass,
      ]"
    >
      <DialogHeader class="shrink-0 border-b bg-muted/40 px-6 pt-6 pr-12 pb-5">
        <DialogTitle class="text-xl font-semibold">{{ title }}</DialogTitle>
        <DialogDescription v-if="description && !hideDescription">
          {{ description }}
        </DialogDescription>
        <DialogDescription v-else class="sr-only">{{ title }}</DialogDescription>
      </DialogHeader>

      <DialogClose as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="absolute top-4 right-4"
          :disabled="saving"
          aria-label="关闭"
        >
          <XIcon />
        </Button>
      </DialogClose>

      <form class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="emit('submit')">
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>

        <div class="flex shrink-0 flex-col gap-3 border-t px-6 py-4">
          <Alert v-if="error" :variant="stepNote ? 'default' : 'destructive'">
            <TriangleAlert v-if="stepNote" />
            <OctagonX v-else />
            <AlertTitle>{{ stepNote ? '部分内容未保存' : '没有保存成功' }}</AlertTitle>
            <AlertDescription>
              {{ error }}
              <span v-if="stepNote" class="mt-1 block">{{ stepNote }}</span>
            </AlertDescription>
          </Alert>
          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <slot name="footer" />
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
