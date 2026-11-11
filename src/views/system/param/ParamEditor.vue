<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createParam, getParamById, updateParam } from '@/api/param'
import { failureMessage } from '@/utils/failure'
import { ParamTypeOptions, type ParamType } from '@/types/enums'
import { sameEditorSession } from '@/views/system/user/user-table'
import FormDialog from '@/components/common/FormDialog.vue'
import SingleSelect from '@/components/common/SingleSelect.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  PARAM_BIZ_OPTIONS,
  isParamType,
  paramFormError,
  toParamCreate,
  toParamUpdate,
} from './param-form'

const props = defineProps<{
  open: boolean
  paramId: number | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.paramId === null)
const paramKey = shallowRef('')
const paramValue = shallowRef('')
const paramType = shallowRef<ParamType>('STRING')
const bizType = shallowRef('0')
const encrypted = shallowRef(false)
const description = shallowRef('')
const originalDescription = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const loading = shallowRef(false)
const detailReady = shallowRef(false)
const keyInput = useTemplateRef<{ $el?: unknown }>('keyInput')
const valueInput = useTemplateRef<{ $el?: unknown }>('valueInput')
let session = 0

const knownBiz = computed(() =>
  PARAM_BIZ_OPTIONS.some((item) => String(item.value) === bizType.value),
)
const typeOptions = ParamTypeOptions.map((item) => ({ value: item.value, label: item.label }))
const bizOptions = computed<Array<{ value: string; label: string }>>(() => {
  const options: Array<{ value: string; label: string }> = PARAM_BIZ_OPTIONS.map((item) => ({
    value: String(item.value),
    label: item.label,
  }))
  if (!knownBiz.value) options.unshift({ value: bizType.value, label: bizType.value })
  return options
})

function setParamType(value: unknown) {
  if (typeof value === 'string' && isParamType(value)) paramType.value = value
}

function focusField() {
  void nextTick(() => {
    if (creating.value) {
      const element = keyInput.value?.$el
      if (element instanceof HTMLInputElement) element.focus()
      return
    }
    const element = valueInput.value?.$el
    if (element instanceof HTMLTextAreaElement) element.focus()
  })
}

function resetCreate() {
  paramKey.value = ''
  paramValue.value = ''
  paramType.value = 'STRING'
  bizType.value = '0'
  encrypted.value = false
  description.value = ''
  originalDescription.value = ''
  formError.value = ''
  saving.value = false
  loading.value = false
  detailReady.value = true
  focusField()
}

async function loadDetail(sessionId: number, id: number) {
  paramKey.value = ''
  paramValue.value = ''
  paramType.value = 'STRING'
  bizType.value = '0'
  encrypted.value = false
  description.value = ''
  originalDescription.value = ''
  formError.value = ''
  saving.value = false
  loading.value = true
  detailReady.value = false
  try {
    const row = await getParamById(id, { showErrorMessage: false })
    if (!sameEditorSession(sessionId, session, id, props.paramId)) return
    paramKey.value = row.paramKey
    paramValue.value = row.paramValue ?? ''
    paramType.value = isParamType(row.paramType) ? row.paramType : 'STRING'
    bizType.value = String(row.bizType)
    encrypted.value = row.encrypted === true
    description.value = row.description ?? ''
    originalDescription.value = row.description ?? ''
    detailReady.value = true
  } catch (error) {
    if (!sameEditorSession(sessionId, session, id, props.paramId)) return
    formError.value = failureMessage(error, '保存失败，请稍后重试')
  } finally {
    if (sameEditorSession(sessionId, session, id, props.paramId)) {
      loading.value = false
      if (detailReady.value) focusField()
    }
  }
}

function retryLoad() {
  const id = props.paramId
  if (id === null) {
    resetCreate()
    return
  }
  session += 1
  void loadDetail(session, id)
}

watch(
  () => [props.open, props.paramId] as const,
  ([open, id], previous) => {
    if (!open) {
      if (previous?.[0]) session += 1
      return
    }
    session += 1
    if (id === null) resetCreate()
    else void loadDetail(session, id)
  },
)

async function onSubmit() {
  if (!detailReady.value || saving.value) return
  const sessionId = session
  const id = props.paramId
  const stillHere = () => sameEditorSession(sessionId, session, id, props.paramId)
  formError.value = ''
  const key = paramKey.value.trim()
  const note = description.value.trim()
  const type = paramType.value
  const message = paramFormError({
    creating: id === null,
    paramKey: key,
    paramValue: paramValue.value,
    paramType: type,
    description: note,
    originalDescription: originalDescription.value.trim(),
  })
  if (message) {
    formError.value = message
    return
  }
  const biz = Number(bizType.value)
  saving.value = true
  try {
    if (id === null) {
      await createParam(
        toParamCreate({
          paramKey: key,
          paramValue: paramValue.value,
          paramType: type,
          bizType: biz,
          encrypted: encrypted.value,
          description: note,
        }),
        { showErrorMessage: false },
      )
    } else {
      await updateParam(
        toParamUpdate({
          id,
          paramValue: paramValue.value,
          paramType: type,
          encrypted: encrypted.value,
          description: note,
        }),
        { showErrorMessage: false },
      )
    }
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
  <FormDialog
    :open="open"
    :title="creating ? '新增系统参数' : '编辑系统参数'"
    description="键、类型和分类在创建后不能修改。列表中的加密值显示为 ****，这里读取原文。已填写的描述不能清空。"
    size="lg"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <p
      v-if="loading"
      class="text-muted-foreground flex min-h-48 items-center justify-center gap-2 text-sm"
    >
      <Spinner />
      正在读取参数
    </p>

    <div
      v-else-if="!detailReady"
      class="flex min-h-48 flex-col items-center justify-center gap-2 text-center"
    >
      <p class="text-sm font-medium">没有读取到参数</p>
      <p class="text-muted-foreground text-xs">检查网络后重试，或关闭窗口稍后再试。</p>
      <Button type="button" variant="outline" size="sm" @click="retryLoad">重试</Button>
    </div>

    <div v-else class="flex flex-col gap-6">
      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">基本资料</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="param-key">参数键</FieldLabel>
            <Input
              id="param-key"
              ref="keyInput"
              v-model="paramKey"
              name="paramKey"
              class="h-9"
              :disabled="saving || loading || !creating"
            />
          </Field>
          <Field>
            <FieldLabel for="param-type">类型</FieldLabel>
            <SingleSelect
              id="param-type"
              :model-value="paramType"
              :options="typeOptions"
              size="lg"
              :searchable="false"
              :disabled="saving || loading || !creating"
              class="w-full"
              @update:model-value="setParamType"
            />
          </Field>
          <Field>
            <FieldLabel for="param-biz">分类</FieldLabel>
            <SingleSelect
              id="param-biz"
              v-model="bizType"
              :options="bizOptions"
              size="lg"
              searchable
              :disabled="saving || loading || !creating"
              class="w-full"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">参数内容</FieldLegend>
        <div class="grid gap-4">
          <Field>
            <FieldLabel for="param-value">参数值</FieldLabel>
            <Textarea
              id="param-value"
              ref="valueInput"
              v-model="paramValue"
              rows="4"
              :disabled="saving || loading || !detailReady"
            />
          </Field>
          <Field orientation="horizontal" class="rounded-lg border bg-muted/20 px-3 py-2">
            <FieldLabel for="param-encrypted">加密存储</FieldLabel>
            <Switch
              id="param-encrypted"
              v-model="encrypted"
              :disabled="saving || loading || !detailReady"
            />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">描述</FieldLegend>
        <Field>
          <FieldLabel for="param-description">描述</FieldLabel>
          <Textarea
            id="param-description"
            v-model="description"
            name="description"
            placeholder="补充说明（可选）"
            :disabled="saving || loading || !detailReady"
          />
        </Field>
      </FieldSet>
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
      <Button type="submit" class="w-full sm:w-auto" :disabled="saving || loading || !detailReady">
        <Spinner v-if="saving" />
        {{ saving ? '正在提交' : '提交' }}
      </Button>
    </template>
  </FormDialog>
</template>
