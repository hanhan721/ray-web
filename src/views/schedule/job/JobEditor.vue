<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createJob, updateJob, validateCron, type ScheduleJob } from '@/api/schedule-job'
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
import { formatDateTime, jobFormError, toJobWrite } from './job-form'

const props = defineProps<{
  open: boolean
  job: ScheduleJob | null
  canValidate: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.job === null)
const jobName = shallowRef('')
const jobGroup = shallowRef('DEFAULT')
const beanName = shallowRef('')
const methodName = shallowRef('')
const methodParams = shallowRef('')
const cronExpression = shallowRef('')
const concurrent = shallowRef(false)
const enabled = shallowRef(true)
const remark = shallowRef('')
const formError = shallowRef('')
const cronHint = shallowRef('')
const saving = shallowRef(false)
const checking = shallowRef(false)
const nameInput = useTemplateRef<{ $el?: unknown }>('nameInput')
let session = 0

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestError && error.message) return error.message
  return fallback
}

function resetForm() {
  session += 1
  const row = props.job
  jobName.value = row?.jobName ?? ''
  jobGroup.value = row?.jobGroup ?? 'DEFAULT'
  beanName.value = row?.beanName ?? ''
  methodName.value = row?.methodName ?? ''
  methodParams.value = row?.methodParams ?? ''
  cronExpression.value = row?.cronExpression ?? ''
  concurrent.value = row?.concurrent === true
  enabled.value = row?.enabled !== false
  remark.value = row?.remark ?? ''
  formError.value = ''
  cronHint.value = ''
  saving.value = false
  checking.value = false
  void nextTick(() => {
    const element = nameInput.value?.$el
    if (element instanceof HTMLInputElement) element.focus()
  })
}

watch(
  () => [props.open, props.job?.id ?? null] as const,
  ([open, id], previous) => {
    if (!open) {
      if (previous?.[0]) session += 1
      return
    }
    if (previous?.[0] && previous[1] === id) return
    resetForm()
  },
)

async function checkCron() {
  const sessionId = session
  const jobId = props.job?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, jobId, props.job?.id ?? null)
  const expression = cronExpression.value.trim()
  cronHint.value = ''
  formError.value = ''
  if (!expression) {
    formError.value = '请填写 Cron 表达式'
    return
  }
  checking.value = true
  try {
    const result = await validateCron(expression, { showErrorMessage: false })
    if (!stillHere()) return
    if (!result.valid) {
      formError.value = `Cron 表达式 [${expression}] 不合法`
      return
    }
    const times = (result.nextTimes ?? []).map((item) => formatDateTime(item)).filter(Boolean)
    cronHint.value = times.length > 0 ? `接下来：${times.join('、')}` : '表达式可以解析'
  } catch (error) {
    if (stillHere()) formError.value = failureMessage(error, 'Cron 表达式校验失败')
  } finally {
    if (stillHere()) checking.value = false
  }
}

async function onSubmit() {
  if (saving.value) return
  const sessionId = session
  const jobId = props.job?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, jobId, props.job?.id ?? null)
  formError.value = ''
  const name = jobName.value.trim()
  const group = jobGroup.value.trim()
  const bean = beanName.value.trim()
  const method = methodName.value.trim()
  const params = methodParams.value.trim()
  const cron = cronExpression.value.trim()
  const note = remark.value.trim()
  const message = jobFormError({
    jobName: name,
    jobGroup: group,
    beanName: bean,
    methodName: method,
    methodParams: params,
    cronExpression: cron,
    remark: note,
  })
  if (message) {
    formError.value = message
    return
  }
  if (props.canValidate) {
    checking.value = true
    try {
      const result = await validateCron(cron, { showErrorMessage: false })
      if (!stillHere()) return
      if (!result.valid) {
        formError.value = `Cron 表达式 [${cron}] 不合法`
        return
      }
    } catch (error) {
      if (error instanceof RequestError && (error.status === 403 || error.code === 403)) {
        // 没有校验权限时仍交给保存接口判断表达式。
      } else if (stillHere()) {
        formError.value = failureMessage(error, 'Cron 表达式校验失败')
        return
      } else {
        return
      }
    } finally {
      if (stillHere()) checking.value = false
    }
  }
  const body = toJobWrite({
    id: jobId ?? undefined,
    jobName: name,
    jobGroup: group,
    beanName: bean,
    methodName: method,
    methodParams: params,
    cronExpression: cron,
    concurrent: concurrent.value,
    enabled: enabled.value,
    remark: note,
  })
  saving.value = true
  try {
    if (jobId === null) await createJob(body, { showErrorMessage: false })
    else await updateJob({ ...body, id: jobId }, { showErrorMessage: false })
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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ creating ? '新增定时任务' : '编辑定时任务' }}</DialogTitle>
        <DialogDescription>
          同一分组内的任务名称不能重复。方法需要一个字符串参数时才填写参数，留空表示无参数。停用后不会按
          Cron 执行。
        </DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <FieldGroup>
          <Field>
            <FieldLabel for="job-name">任务名称</FieldLabel>
            <Input
              id="job-name"
              ref="nameInput"
              v-model="jobName"
              name="jobName"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="job-group">任务分组</FieldLabel>
            <Input id="job-group" v-model="jobGroup" name="jobGroup" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="job-bean">Bean 名称</FieldLabel>
            <Input id="job-bean" v-model="beanName" name="beanName" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="job-method">方法名称</FieldLabel>
            <Input id="job-method" v-model="methodName" name="methodName" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="job-params">方法参数</FieldLabel>
            <Input id="job-params" v-model="methodParams" name="methodParams" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="job-cron">Cron 表达式</FieldLabel>
            <div class="flex items-center gap-2">
              <Input
                id="job-cron"
                v-model="cronExpression"
                name="cronExpression"
                :disabled="saving"
              />
              <Button
                v-if="canValidate"
                type="button"
                variant="outline"
                :disabled="saving || checking"
                @click="checkCron"
              >
                检查
              </Button>
            </div>
            <p v-if="cronHint" class="text-muted-foreground text-xs">{{ cronHint }}</p>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="job-concurrent">允许并发</FieldLabel>
            <Switch id="job-concurrent" v-model="concurrent" :disabled="saving" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="job-enabled">启用</FieldLabel>
            <Switch id="job-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="job-remark">备注</FieldLabel>
            <Input id="job-remark" v-model="remark" name="remark" :disabled="saving" />
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
          <Button type="submit" :disabled="saving || checking">
            <Spinner v-if="saving" />
            {{ saving ? '正在保存' : '保存' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
