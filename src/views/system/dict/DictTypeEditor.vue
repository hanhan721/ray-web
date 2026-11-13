<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDictType, updateDictType, type DictTypeRecord } from '@/api/dict'
import { QUIET, failureMessage } from '@/utils/failure'
import { sameEditorSession } from '@/views/system/user/user-table'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
      await updateDictType(row, QUIET)
      emit('saved', row)
    } else {
      await createDictType(body, QUIET)
      emit('saved', null)
    }
    if (stillHere()) emit('update:open', false)
  } catch (error) {
    if (stillHere()) formError.value = failureMessage(error, '保存失败，请稍后重试')
  } finally {
    if (stillHere()) saving.value = false
  }
}
</script>

<template>
  <RayFormDialog
    :open="open"
    :title="creating ? '新增字典类型' : '编辑字典类型'"
    description="修改类型编码后，该类型下的数据会改用新编码。"
    size="lg"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <FieldGroup class="ray-form-grid">
      <Field :data-invalid="formError && !dictName.trim() ? true : undefined">
        <FieldLabel for="dict-type-name" required>名称</FieldLabel>
        <Input
          id="dict-type-name"
          ref="nameInput"
          v-model="dictName"
          name="dictName"
          :disabled="saving"
          required
          :aria-invalid="formError && !dictName.trim() ? true : undefined"
          :aria-describedby="formError && !dictName.trim() ? 'dict-type-name-error' : undefined"
        />
        <FieldError v-if="formError && !dictName.trim()" id="dict-type-name-error"
          >请填写名称</FieldError
        >
      </Field>
      <Field :data-invalid="formError && !typeCode.trim() ? true : undefined">
        <FieldLabel for="dict-type-code" required>类型编码</FieldLabel>
        <Input
          id="dict-type-code"
          v-model="typeCode"
          name="dictType"
          :disabled="saving"
          required
          :aria-invalid="formError && !typeCode.trim() ? true : undefined"
          :aria-describedby="formError && !typeCode.trim() ? 'dict-type-code-error' : undefined"
        />
        <FieldError v-if="formError && !typeCode.trim()" id="dict-type-code-error"
          >请填写类型编码</FieldError
        >
      </Field>
      <Field>
        <FieldLabel for="dict-type-enabled">启用</FieldLabel>
        <Switch id="dict-type-enabled" v-model="enabled" :disabled="saving" />
      </Field>
      <Field class="ray-form-span-full">
        <FieldLabel for="dict-type-remark">备注</FieldLabel>
        <Textarea
          id="dict-type-remark"
          v-model="remark"
          placeholder="补充说明（可选）"
          :disabled="saving"
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
