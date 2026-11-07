<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createParam, getParamById, updateParam } from '@/api/param'
import { RequestError } from '@/utils/request'
import { ParamTypeOptions, type ParamType } from '@/types/enums'
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
const valueInput = useTemplateRef<HTMLTextAreaElement>('valueInput')
let session = 0

const knownBiz = computed(() =>
  PARAM_BIZ_OPTIONS.some((item) => String(item.value) === bizType.value),
)
const knownType = computed(() => isParamType(paramType.value))

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '保存失败，请稍后重试'
}

function focusField() {
  void nextTick(() => {
    if (creating.value) {
      const element = keyInput.value?.$el
      if (element instanceof HTMLInputElement) element.focus()
      return
    }
    valueInput.value?.focus()
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
    focusField()
  } catch (error) {
    if (!sameEditorSession(sessionId, session, id, props.paramId)) return
    formError.value = failureMessage(error)
  } finally {
    if (sameEditorSession(sessionId, session, id, props.paramId)) loading.value = false
  }
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
    if (stillHere()) formError.value = failureMessage(error)
  } finally {
    if (stillHere()) saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ creating ? '新增系统参数' : '编辑系统参数' }}</DialogTitle>
        <DialogDescription>
          键、类型和分类在创建后不能修改。列表中的加密值显示为
          ****，这里读取原文。已填写的描述不能清空。
        </DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <p v-if="loading" class="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner />
          正在读取参数
        </p>
        <FieldGroup>
          <Field>
            <FieldLabel for="param-key">参数键</FieldLabel>
            <Input
              id="param-key"
              ref="keyInput"
              v-model="paramKey"
              name="paramKey"
              :disabled="saving || loading || !creating"
            />
          </Field>
          <Field>
            <FieldLabel for="param-type">类型</FieldLabel>
            <select
              id="param-type"
              v-model="paramType"
              class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              :disabled="saving || loading || !creating"
            >
              <option v-if="!knownType" :value="paramType">{{ paramType }}</option>
              <option v-for="item in ParamTypeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </Field>
          <Field>
            <FieldLabel for="param-biz">分类</FieldLabel>
            <select
              id="param-biz"
              v-model="bizType"
              class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
              :disabled="saving || loading || !creating"
            >
              <option v-if="!knownBiz" :value="bizType">{{ bizType }}</option>
              <option
                v-for="item in PARAM_BIZ_OPTIONS"
                :key="item.value"
                :value="String(item.value)"
              >
                {{ item.label }}
              </option>
            </select>
          </Field>
          <Field>
            <FieldLabel for="param-value">参数值</FieldLabel>
            <textarea
              id="param-value"
              ref="valueInput"
              v-model="paramValue"
              rows="4"
              class="border-input bg-input/20 w-full rounded-md border px-2 py-1 text-sm outline-none focus-visible:ring-2"
              :disabled="saving || loading || !detailReady"
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="param-encrypted">加密存储</FieldLabel>
            <Switch
              id="param-encrypted"
              v-model="encrypted"
              :disabled="saving || loading || !detailReady"
            />
          </Field>
          <Field>
            <FieldLabel for="param-description">描述</FieldLabel>
            <Input
              id="param-description"
              v-model="description"
              name="description"
              :disabled="saving || loading || !detailReady"
            />
          </Field>
        </FieldGroup>
        <FieldError v-if="formError">{{ formError }}</FieldError>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :disabled="saving"
            @click="emit('update:open', false)"
          >
            取消
          </Button>
          <Button type="submit" :disabled="saving || loading || !detailReady">
            <Spinner v-if="saving" />
            {{ saving ? '正在保存' : '保存' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
