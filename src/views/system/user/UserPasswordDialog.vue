<script setup lang="ts">
import { shallowRef, useTemplateRef, watch } from 'vue'
import { resetUserPassword } from '@/api/user'
import { QUIET, failureMessage } from '@/utils/failure'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

const props = defineProps<{
  open: boolean
  userId: number | null
  username: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const password = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const passwordInput = useTemplateRef<{ $el?: unknown }>('passwordInput')
let session = 0

watch(
  () => props.open,
  (open) => {
    session += 1
    if (!open) return
    password.value = ''
    formError.value = ''
    saving.value = false
    queueMicrotask(() => {
      const element = passwordInput.value?.$el
      if (element instanceof HTMLInputElement) element.focus()
    })
  },
)

async function onSubmit() {
  const sessionId = session
  const userId = props.userId
  const nextPassword = password.value
  formError.value = ''
  if (!nextPassword) {
    formError.value = '请填写新密码'
    return
  }
  if (userId === null) return
  saving.value = true
  try {
    await resetUserPassword(userId, nextPassword, QUIET)
    if (sessionId !== session) return
    emit('update:open', false)
  } catch (error) {
    if (sessionId !== session) return
    formError.value = failureMessage(error, '密码重置失败，请稍后重试')
  } finally {
    if (sessionId === session) saving.value = false
  }
}
</script>

<template>
  <RayFormDialog
    :open="open"
    title="重置密码"
    :description="`为 ${username} 设置一个新密码。原密码不会保留。`"
    size="md"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <FieldGroup>
      <Field :data-invalid="formError ? true : undefined">
        <FieldLabel for="reset-password">新密码</FieldLabel>
        <Input
          id="reset-password"
          ref="passwordInput"
          v-model="password"
          type="password"
          name="password"
          autocomplete="new-password"
          :disabled="saving"
          :aria-invalid="formError ? true : undefined"
        />
      </Field>
    </FieldGroup>

    <template #footer>
      <Button
        type="button"
        variant="outline"
        class="w-full sm:w-auto"
        :disabled="saving"
        @click="emit('update:open', false)"
      >
        取消
      </Button>
      <Button type="submit" class="w-full sm:w-auto" :disabled="saving">
        <Spinner v-if="saving" />
        {{ saving ? '正在提交' : '提交' }}
      </Button>
    </template>
  </RayFormDialog>
</template>
