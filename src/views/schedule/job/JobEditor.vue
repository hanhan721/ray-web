<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createJob, updateJob, validateCron, type ScheduleJob } from '@/api/schedule-job'
import { RequestError } from '@/utils/request'
import { failureMessage } from '@/utils/failure'
import { sameEditorSession } from '@/views/system/user/user-table'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
    const result = await validateCron(expression)
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
      const result = await validateCron(cron)
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
    if (jobId === null) await createJob(body)
    else await updateJob({ ...body, id: jobId })
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
    :title="creating ? '新增定时任务' : '编辑定时任务'"
    description="同一分组内的任务名称不能重复。方法需要一个字符串参数时才填写参数，留空表示无参数。停用后不会按 Cron 执行。"
    size="lg"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <FieldGroup class="ray-form-grid">
      <Field :data-invalid="formError && !jobName.trim() ? true : undefined">
        <FieldLabel for="job-name" required>任务名称</FieldLabel>
        <Input
          id="job-name"
          ref="nameInput"
          v-model="jobName"
          name="jobName"
          :disabled="saving"
          required
          :aria-invalid="formError && !jobName.trim() ? true : undefined"
          :aria-describedby="formError && !jobName.trim() ? 'job-name-error' : undefined"
        />
        <FieldError v-if="formError && !jobName.trim()" id="job-name-error"
          >请填写任务名称</FieldError
        >
      </Field>
      <Field :data-invalid="formError && !jobGroup.trim() ? true : undefined">
        <FieldLabel for="job-group" required>任务分组</FieldLabel>
        <Input
          id="job-group"
          v-model="jobGroup"
          name="jobGroup"
          :disabled="saving"
          required
          :aria-invalid="formError && !jobGroup.trim() ? true : undefined"
          :aria-describedby="formError && !jobGroup.trim() ? 'job-group-error' : undefined"
        />
        <FieldError v-if="formError && !jobGroup.trim()" id="job-group-error"
          >请填写任务分组</FieldError
        >
      </Field>
      <Field :data-invalid="formError && !beanName.trim() ? true : undefined">
        <FieldLabel for="job-bean" required>Bean 名称</FieldLabel>
        <Input
          id="job-bean"
          v-model="beanName"
          name="beanName"
          :disabled="saving"
          required
          :aria-invalid="formError && !beanName.trim() ? true : undefined"
          :aria-describedby="formError && !beanName.trim() ? 'job-bean-error' : undefined"
        />
        <FieldError v-if="formError && !beanName.trim()" id="job-bean-error"
          >请填写 Bean 名称</FieldError
        >
      </Field>
      <Field :data-invalid="formError && !methodName.trim() ? true : undefined">
        <FieldLabel for="job-method" required>方法名称</FieldLabel>
        <Input
          id="job-method"
          v-model="methodName"
          name="methodName"
          :disabled="saving"
          required
          :aria-invalid="formError && !methodName.trim() ? true : undefined"
          :aria-describedby="formError && !methodName.trim() ? 'job-method-error' : undefined"
        />
        <FieldError v-if="formError && !methodName.trim()" id="job-method-error"
          >请填写方法名称</FieldError
        >
      </Field>
      <Field class="ray-form-span-full">
        <FieldLabel for="job-params">方法参数</FieldLabel>
        <Input id="job-params" v-model="methodParams" name="methodParams" :disabled="saving" />
      </Field>
      <Field
        class="ray-form-span-full"
        :data-invalid="formError && !cronExpression.trim() ? true : undefined"
      >
        <FieldLabel for="job-cron" required>Cron 表达式</FieldLabel>
        <div class="flex items-center gap-2">
          <Input
            id="job-cron"
            v-model="cronExpression"
            name="cronExpression"
            :disabled="saving"
            required
            :aria-invalid="formError && !cronExpression.trim() ? true : undefined"
            :aria-describedby="formError && !cronExpression.trim() ? 'job-cron-error' : undefined"
          />
          <Button
            v-if="canValidate"
            type="button"
            variant="outline"
            :disabled="saving || checking"
            @click="checkCron"
          >
            <Spinner v-if="checking" />
            检查
          </Button>
        </div>
        <p v-if="cronHint" class="text-muted-foreground text-xs">{{ cronHint }}</p>
        <FieldError v-if="formError && !cronExpression.trim()" id="job-cron-error"
          >请填写 Cron 表达式</FieldError
        >
      </Field>
      <Field>
        <FieldLabel for="job-concurrent">允许并发</FieldLabel>
        <Switch id="job-concurrent" v-model="concurrent" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="job-enabled">启用</FieldLabel>
        <Switch id="job-enabled" v-model="enabled" :disabled="saving" />
      </Field>
      <Field class="ray-form-span-full">
        <FieldLabel for="job-remark">备注</FieldLabel>
        <Textarea
          id="job-remark"
          v-model="remark"
          name="remark"
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
      <Button type="submit" class="w-full sm:w-auto" :disabled="saving || checking">
        <Spinner v-if="saving" />
        {{ saving ? '正在提交' : '提交' }}
      </Button>
    </template>
  </RayFormDialog>
</template>
