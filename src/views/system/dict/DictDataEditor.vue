<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDictData, updateDictData, type DictDataRecord } from '@/api/dict'
import { QUIET, failureMessage } from '@/utils/failure'
import { sameEditorSession } from '@/views/system/user/user-table'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldGroup,
  FieldError,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
const hasAdvancedSettings = computed(() =>
  Boolean(cssClass.value || listClass.value || remark.value),
)
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
    if (itemId !== null) await updateDictData({ ...body, id: itemId }, QUIET)
    else await createDictData(body, QUIET)
    emit('saved')
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
    :title="creating ? '新增字典项' : '编辑字典项'"
    description="这条数据属于当前选中的字典类型。"
    size="lg"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <div class="flex flex-col gap-6">
      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">基本资料</FieldLegend>
        <FieldGroup class="ray-form-grid">
          <Field :data-invalid="formError && !dictLabel.trim() ? true : undefined">
            <FieldLabel for="dict-data-label" required>标签</FieldLabel>
            <Input
              id="dict-data-label"
              ref="labelInput"
              v-model="dictLabel"
              name="dictLabel"
              :disabled="saving"
              required
              :aria-invalid="formError && !dictLabel.trim() ? true : undefined"
              :aria-describedby="
                formError && !dictLabel.trim() ? 'dict-data-label-error' : undefined
              "
            />

            <FieldError v-if="formError && !dictLabel.trim()" id="dict-data-label-error"
              >请填写标签</FieldError
            >
          </Field>
          <Field :data-invalid="formError && !dictValue.trim() ? true : undefined">
            <FieldLabel for="dict-data-value" required>字典值</FieldLabel>
            <Input
              id="dict-data-value"
              v-model="dictValue"
              :disabled="saving"
              required
              :aria-invalid="formError && !dictValue.trim() ? true : undefined"
              :aria-describedby="
                formError && !dictValue.trim() ? 'dict-data-value-error' : undefined
              "
            />

            <FieldError v-if="formError && !dictValue.trim()" id="dict-data-value-error"
              >请填写字典值</FieldError
            >
          </Field>
          <Field>
            <FieldLabel for="dict-data-sort">顺序</FieldLabel>
            <Input id="dict-data-sort" v-model="sortText" inputmode="numeric" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dict-data-default">默认</FieldLabel>
            <Switch id="dict-data-default" v-model="isDefault" :disabled="saving" />
          </Field>
          <Field class="ray-form-span-full">
            <FieldLabel for="dict-data-enabled">启用</FieldLabel>
            <Switch id="dict-data-enabled" v-model="enabled" :disabled="saving" />
          </Field>
        </FieldGroup>
      </FieldSet>

      <details class="rounded-lg border px-4 py-3">
        <summary class="cursor-pointer text-sm font-medium">
          更多设置
          <span v-if="hasAdvancedSettings" class="text-muted-foreground font-normal">· 已配置</span>
        </summary>
        <FieldSet class="mt-4 gap-3">
          <FieldLegend class="sr-only">样式与备注</FieldLegend>
          <FieldGroup class="ray-form-grid">
            <Field>
              <FieldLabel for="dict-data-list-class">列表样式</FieldLabel>
              <Input id="dict-data-list-class" v-model="listClass" :disabled="saving" />
            </Field>
            <Field>
              <FieldLabel for="dict-data-css-class">样式类名</FieldLabel>
              <Input id="dict-data-css-class" v-model="cssClass" :disabled="saving" />
            </Field>
            <Field class="ray-form-span-full">
              <FieldLabel for="dict-data-remark">备注</FieldLabel>
              <Textarea
                id="dict-data-remark"
                v-model="remark"
                placeholder="补充说明（可选）"
                :disabled="saving"
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </details>
    </div>

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
