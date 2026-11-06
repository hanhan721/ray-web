<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDictData, updateDictData, type DictDataRecord } from '@/api/dict'
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
import { dictDataFormError, parseSort } from './dict-form'

const props = defineProps<{
  open: boolean
  item: DictDataRecord | null
  dictType: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.item === null)
const dictLabel = shallowRef('')
const dictValue = shallowRef('')
const sortText = shallowRef('0')
const cssClass = shallowRef('')
const listClass = shallowRef('')
const isDefault = shallowRef(false)
const enabled = shallowRef(true)
const remark = shallowRef('')
const boundType = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const labelInput = useTemplateRef<{ $el?: unknown }>('labelInput')
let session = 0

function resetForm() {
  session += 1
  const row = props.item
  dictLabel.value = row?.dictLabel ?? ''
  dictValue.value = row?.dictValue ?? ''
  sortText.value = String(row?.sort ?? 0)
  cssClass.value = row?.cssClass ?? ''
  listClass.value = row?.listClass ?? ''
  isDefault.value = row?.isDefault === true
  enabled.value = row?.enabled !== false
  remark.value = row?.remark ?? ''
  boundType.value = props.dictType
  formError.value = ''
  saving.value = false
  void nextTick(() => {
    const element = labelInput.value?.$el
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
  const itemId = props.item?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, itemId, props.item?.id ?? null)
  formError.value = ''
  if (!boundType.value) {
    formError.value = '请先选择字典类型'
    return
  }
  const label = dictLabel.value.trim()
  const value = dictValue.value.trim()
  const sort = parseSort(sortText.value)
  const note = remark.value.trim()
  const message = dictDataFormError({
    dictLabel: label,
    dictValue: value,
    sort,
    cssClass: cssClass.value.trim(),
    listClass: listClass.value.trim(),
    remark: note,
  })
  if (message || sort === null) {
    formError.value = message || '顺序需要是 -2147483648 到 2147483647 的整数'
    return
  }
  const body = {
    dictType: boundType.value,
    dictLabel: label,
    dictValue: value,
    sort,
    cssClass: cssClass.value.trim(),
    listClass: listClass.value.trim(),
    isDefault: isDefault.value,
    enabled: enabled.value,
    remark: note,
  }
  saving.value = true
  try {
    if (itemId !== null) await updateDictData({ ...body, id: itemId }, { showErrorMessage: false })
    else await createDictData(body, { showErrorMessage: false })
    emit('saved')
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
        <DialogTitle>{{ creating ? '新增字典数据' : '编辑字典数据' }}</DialogTitle>
        <DialogDescription>这条数据属于当前选中的字典类型。</DialogDescription>
      </DialogHeader>
      <form
        class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
        novalidate
        @submit.prevent="onSubmit"
      >
        <FieldGroup>
          <Field>
            <FieldLabel for="dict-data-label">标签</FieldLabel>
            <Input
              id="dict-data-label"
              ref="labelInput"
              v-model="dictLabel"
              name="dictLabel"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="dict-data-value">字典值</FieldLabel>
            <Input id="dict-data-value" v-model="dictValue" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-data-sort">顺序</FieldLabel>
            <Input id="dict-data-sort" v-model="sortText" inputmode="numeric" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-data-list-class">列表样式</FieldLabel>
            <Input id="dict-data-list-class" v-model="listClass" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-data-css-class">样式类名</FieldLabel>
            <Input id="dict-data-css-class" v-model="cssClass" :disabled="saving" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="dict-data-default">默认</FieldLabel>
            <Switch id="dict-data-default" v-model="isDefault" :disabled="saving" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="dict-data-enabled">启用</FieldLabel>
            <Switch id="dict-data-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-data-remark">备注</FieldLabel>
            <Input id="dict-data-remark" v-model="remark" :disabled="saving" />
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
