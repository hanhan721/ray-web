<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDictType, updateDictType, type DictTypeRecord } from '@/api/dict'
import { RequestError } from '@/utils/request'
import { sameEditorSession } from '@/views/system/user/user-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { dictTypeFormError } from './dict-form'

const props = defineProps<{
  open: boolean
  dictType: DictTypeRecord | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: [row: DictTypeRecord | null]
}>()

const creating = computed(() => props.dictType === null)
const dictName = shallowRef('')
const typeCode = shallowRef('')
const enabled = shallowRef(true)
const remark = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const nameInput = useTemplateRef<{ $el?: unknown }>('nameInput')
let session = 0

function resetForm() {
  session += 1
  const row = props.dictType
  dictName.value = row?.dictName ?? ''
  typeCode.value = row?.dictType ?? ''
  enabled.value = row?.enabled !== false
  remark.value = row?.remark ?? ''
  formError.value = ''
  saving.value = false
  void nextTick(() => {
    const element = nameInput.value?.$el
    if (element instanceof HTMLInputElement) element.focus()
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
    else session += 1
  },
)

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '保存失败，请稍后重试'
}

async function onSubmit() {
  const sessionId = session
  const typeId = props.dictType?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, typeId, props.dictType?.id ?? null)
  formError.value = ''
  const name = dictName.value.trim()
  const code = typeCode.value.trim()
  const note = remark.value.trim()
  const message = dictTypeFormError({ dictName: name, dictType: code, remark: note })
  if (message) {
    formError.value = message
    return
  }
  const body = { dictName: name, dictType: code, enabled: enabled.value, remark: note }
  saving.value = true
  try {
    if (typeId !== null) {
      const row = { ...body, id: typeId }
      await updateDictType(row, { showErrorMessage: false })
      emit('saved', row)
    } else {
      await createDictType(body, { showErrorMessage: false })
      emit('saved', null)
    }
    if (stillHere()) emit('update:open', false)
  } catch (error) {
    if (stillHere()) formError.value = failureMessage(error)
  } finally {
    if (stillHere()) saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ creating ? '新增字典类型' : '编辑字典类型' }}</DialogTitle>
        <DialogDescription>修改类型编码后，该类型下的数据会改用新编码。</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <FieldGroup>
          <Field>
            <FieldLabel for="dict-type-name">名称</FieldLabel>
            <Input
              id="dict-type-name"
              ref="nameInput"
              v-model="dictName"
              name="dictName"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="dict-type-code">类型编码</FieldLabel>
            <Input id="dict-type-code" v-model="typeCode" name="dictType" :disabled="saving" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="dict-type-enabled">启用</FieldLabel>
            <Switch id="dict-type-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-type-remark">备注</FieldLabel>
            <Input id="dict-type-remark" v-model="remark" :disabled="saving" />
          </Field>
        </FieldGroup>
        <FieldError v-if="formError">{{ formError }}</FieldError>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="emit('update:open', false)"
            >取消</Button
          >
          <Button type="submit" :disabled="saving">
            <Spinner v-if="saving" />
            {{ saving ? '正在保存' : '保存' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
