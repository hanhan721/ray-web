<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDept, updateDept } from '@/api/dept'
import { QUIET, failureMessage } from '@/utils/failure'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import RaySelect from '@/components/common/RaySelect.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { sameEditorSession } from '@/views/system/user/user-table'
import { excludedParentIds, type DeptRow } from './dept-tree'

const props = defineProps<{
  open: boolean
  dept: DeptRow | null
  rows: DeptRow[]
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.dept === null)
const deptName = shallowRef('')
const parentId = shallowRef('0')
const sortText = shallowRef('0')
const leader = shallowRef('')
const phone = shallowRef('')
const email = shallowRef('')
const enabled = shallowRef(true)
const remark = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const nameInput = useTemplateRef<{ $el?: unknown }>('nameInput')
let session = 0

const parentOptions = computed(() => {
  const excluded = props.dept ? excludedParentIds(props.rows, props.dept.id) : new Set<number>()
  return props.rows.filter((row) => !excluded.has(row.id))
})
const parentSelectOptions = computed(() => [
  { value: '0', label: '无' },
  ...parentOptions.value.map((row) => ({
    value: String(row.id),
    label: `${'· '.repeat(row.depth)}${row.deptName}`,
  })),
])

function resetForm() {
  session += 1
  const dept = props.dept
  deptName.value = dept?.deptName ?? ''
  parentId.value = String(dept?.parentId ?? 0)
  sortText.value = String(dept?.sort ?? 0)
  leader.value = dept?.leader ?? ''
  phone.value = dept?.phone ?? ''
  email.value = dept?.email ?? ''
  enabled.value = dept?.enabled !== false
  remark.value = dept?.remark ?? ''
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
  const deptId = props.dept?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, deptId, props.dept?.id ?? null)
  formError.value = ''
  const name = deptName.value.trim()
  const sort = sortText.value.trim() ? Number(sortText.value) : 0
  const nextParent = Number(parentId.value)
  if (!name) {
    formError.value = '请填写名称'
    return
  }
  if (name.length > 50) {
    formError.value = '名称不能超过 50 个字符'
    return
  }
  if (!Number.isInteger(sort)) {
    formError.value = '顺序需要是整数'
    return
  }
  if (
    leader.value.trim().length > 50 ||
    phone.value.trim().length > 20 ||
    email.value.trim().length > 100 ||
    remark.value.trim().length > 500
  ) {
    formError.value =
      '负责人不超过 50 个字符，电话不超过 20 个字符，邮箱不超过 100 个字符，备注不超过 500 个字符。'
    return
  }
  const body = {
    parentId: Number.isInteger(nextParent) ? nextParent : 0,
    deptName: name,
    sort,
    leader: leader.value.trim(),
    phone: phone.value.trim(),
    email: email.value.trim(),
    enabled: enabled.value,
    remark: remark.value.trim(),
  }
  saving.value = true
  try {
    if (deptId !== null) await updateDept({ ...body, id: deptId }, QUIET)
    else await createDept(body, QUIET)
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
    :title="creating ? '新增部门' : '编辑部门'"
    description="顶级部门的上级留在「无」。不能把部门挂到自己或下级下面。"
    size="xl"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <div class="flex flex-col gap-6">
      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">基本资料</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field :data-invalid="formError && !deptName.trim() ? true : undefined">
            <FieldLabel for="dept-name">名称</FieldLabel>
            <Input
              id="dept-name"
              ref="nameInput"
              v-model="deptName"
              name="deptName"
              class="h-9"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="dept-parent">上级</FieldLabel>
            <RaySelect
              id="dept-parent"
              :model-value="parentId || null"
              :options="parentSelectOptions"
              placeholder="选择上级"
              size="lg"
              searchable
              :disabled="saving"
              class="w-full"
              @update:model-value="parentId = $event ?? ''"
            />
          </Field>
          <Field>
            <FieldLabel for="dept-sort">顺序</FieldLabel>
            <Input
              id="dept-sort"
              v-model="sortText"
              name="sort"
              inputmode="numeric"
              class="h-9"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="dept-leader">负责人</FieldLabel>
            <Input id="dept-leader" v-model="leader" class="h-9" :disabled="saving" />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">联系方式</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="dept-phone">电话</FieldLabel>
            <Input id="dept-phone" v-model="phone" class="h-9" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="dept-email">邮箱</FieldLabel>
            <Input id="dept-email" v-model="email" type="email" class="h-9" :disabled="saving" />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">状态与备注</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field
            orientation="horizontal"
            class="rounded-lg border bg-muted/20 px-3 py-2 sm:col-span-2"
          >
            <FieldLabel for="dept-enabled">启用</FieldLabel>
            <Switch id="dept-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field class="sm:col-span-2">
            <FieldLabel for="dept-remark">备注</FieldLabel>
            <Textarea
              id="dept-remark"
              v-model="remark"
              placeholder="补充说明（可选）"
              :disabled="saving"
            />
          </Field>
        </div>
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
      <Button type="submit" class="w-full sm:w-auto" :disabled="saving">
        <Spinner v-if="saving" />
        {{ saving ? '正在提交' : '提交' }}
      </Button>
    </template>
  </RayFormDialog>
</template>
