<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="isEdit ? '编辑任务' : '新增任务'"
    :style="{ width: '600px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <NGrid :cols="2" :x-gap="16">
        <NFormItemGi label="任务名称" path="jobName">
          <NInput v-model:value="formData.jobName" placeholder="请输入任务名称" />
        </NFormItemGi>
        <NFormItemGi label="任务分组" path="jobGroup">
          <DictSelect v-model="formData.jobGroup" type="job_group" placeholder="请选择任务分组" />
        </NFormItemGi>
        <NFormItemGi label="Bean 名称" path="beanName">
          <NInput v-model:value="formData.beanName" placeholder="Spring Bean 名称" />
        </NFormItemGi>
        <NFormItemGi label="方法名称" path="methodName">
          <NInput v-model:value="formData.methodName" placeholder="执行方法名" />
        </NFormItemGi>
        <NFormItemGi :span="2" label="方法参数" path="methodParams">
          <NInput v-model:value="formData.methodParams" placeholder="方法参数（选填）" />
        </NFormItemGi>
        <NFormItemGi :span="2" label="Cron 表达式" path="cronExpression">
          <NInputGroup>
            <NInput
              v-model:value="formData.cronExpression"
              placeholder="如 0 0 2 * * ?"
              @blur="handleCronBlur"
            />
            <NButton :loading="cronValidating" @click="handleValidateCron">
              校验
            </NButton>
          </NInputGroup>
        </NFormItemGi>
        <!-- Cron 下次执行时间预览 -->
        <NFormItemGi v-if="cronNextTimes.length > 0" :span="2" label="下次执行">
          <NSpace vertical :size="2">
            <NText
              v-for="(t, i) in cronNextTimes"
              :key="i"
              depth="3"
              style="font-size: 12px"
            >
              {{ t }}
            </NText>
          </NSpace>
        </NFormItemGi>
        <NFormItemGi label="并发执行" path="concurrent">
          <NSwitch v-model:value="formData.concurrent">
            <template #checked>
              允许
            </template>
            <template #unchecked>
              禁止
            </template>
          </NSwitch>
        </NFormItemGi>
        <NFormItemGi label="启用状态" path="enabled">
          <NSwitch v-model:value="formData.enabled">
            <template #checked>
              启用
            </template>
            <template #unchecked>
              停用
            </template>
          </NSwitch>
        </NFormItemGi>
        <NFormItemGi :span="2" label="备注" path="remark">
          <NInput
            v-model:value="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注（选填）"
          />
        </NFormItemGi>
      </NGrid>
    </NForm>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import {
  NModal,
  NForm,
  NFormItem,
  NFormItemGi,
  NGrid,
  NInput,
  NInputGroup,
  NSwitch,
  NButton,
  NSpace,
  NText,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { createJob, updateJob, validateCron, type ScheduleJob, type JobForm } from '@/api/schedule-job'

defineOptions({
  name: 'JobForm',
})

const props = defineProps<{
  show: boolean
  data: ScheduleJob | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

const isEdit = computed(() => !!props.data?.id)

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const cronValidating = ref(false)
const cronNextTimes = ref<string[]>([])

const defaultFormData: JobForm = {
  jobName: '',
  jobGroup: null,
  beanName: '',
  methodName: '',
  methodParams: null,
  cronExpression: '',
  concurrent: false,
  enabled: true,
  remark: null,
}

const formData = reactive<JobForm>({ ...defaultFormData })

const rules: FormRules = {
  jobName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  jobGroup: [{ required: true, message: '请选择任务分组', trigger: 'change' }],
  beanName: [{ required: true, message: '请输入 Bean 名称', trigger: 'blur' }],
  methodName: [{ required: true, message: '请输入方法名称', trigger: 'blur' }],
  cronExpression: [{ required: true, message: '请输入 Cron 表达式', trigger: 'blur' }],
}

watch(
  () => props.data,
  (newData) => {
    if (newData) {
      Object.assign(formData, {
        id: newData.id,
        jobName: newData.jobName,
        jobGroup: newData.jobGroup,
        beanName: newData.beanName,
        methodName: newData.methodName,
        methodParams: newData.methodParams ?? null,
        cronExpression: newData.cronExpression,
        concurrent: newData.concurrent,
        enabled: newData.enabled,
        remark: newData.remark ?? null,
      })
    } else {
      Object.assign(formData, defaultFormData)
    }
    cronNextTimes.value = []
  },
  { immediate: true }
)

async function handleValidateCron() {
  if (!formData.cronExpression) {
    message.warning('请先输入 Cron 表达式')
    return
  }
  cronValidating.value = true
  try {
    const result = await validateCron(formData.cronExpression)
    if (result.valid) {
      cronNextTimes.value = result.nextTimes
      message.success('Cron 表达式合法')
    } else {
      cronNextTimes.value = []
      message.error('Cron 表达式无效')
    }
  } catch {
    cronNextTimes.value = []
    message.error('校验失败')
  } finally {
    cronValidating.value = false
  }
}

function handleCronBlur() {
  cronNextTimes.value = []
}

function handleCancel() {
  visible.value = false
}

function handleAfterLeave() {
  Object.assign(formData, defaultFormData)
  cronNextTimes.value = []
  formRef.value?.restoreValidation()
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitting.value = true

    if (isEdit.value && (formData as JobForm & { id?: number }).id) {
      await updateJob(formData as JobForm & { id: number })
      message.success('修改成功')
    } else {
      await createJob(formData)
      message.success('新增成功')
    }

    visible.value = false
    emit('success')
  } catch (error) {
    if (error instanceof Error) {
      message.error(error.message || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
:deep(.n-form-item) {
  margin-bottom: $spacing-md;
}
</style>
