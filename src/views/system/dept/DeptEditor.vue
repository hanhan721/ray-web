<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createDept, updateDept } from '@/api/dept'
import { failureMessage } from '@/utils/failure'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import RayTreeSelect, { type TreeSelectOption } from '@/components/common/RayTreeSelect.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'
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
const parentSelectOptions = computed(() => {
  const nodes = parentOptions.value.map((row) => ({
    value: String(row.id),
    label: row.deptName,
    children: [] as TreeSelectOption<string>[],
    parentId: row.parentId,
  }))
  const lookup = new Map(nodes.map((node) => [node.value, node]))
  const roots: TreeSelectOption<string>[] = [{ value: '0', label: '无' }]
  for (const node of nodes) {
    const parent = lookup.get(String(node.parentId))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
})

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
    if (deptId !== null) await updateDept({ ...body, id: deptId })
    else await createDept(body)
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
    size="lg"
    :saving="saving"
    :error="formError"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <FieldGroup class="ray-form-grid">
      <Field :data-invalid="formError && !deptName.trim() ? true : undefined">
        <FieldLabel for="dept-name" required>名称</FieldLabel>
        <Input
          id="dept-name"
          ref="nameInput"
          v-model="deptName"
          name="deptName"
          :disabled="saving"
          required
          :aria-invalid="formError && !deptName.trim() ? true : undefined"
          :aria-describedby="formError && !deptName.trim() ? 'dept-name-error' : undefined"
        />
        <FieldError v-if="formError && !deptName.trim()" id="dept-name-error"
          >请填写名称</FieldError
        >
      </Field>
      <Field>
        <FieldLabel for="dept-parent">上级</FieldLabel>
        <RayTreeSelect
          id="dept-parent"
          :model-value="parentId || null"
          row-action="select"
          :options="parentSelectOptions"
          placeholder="选择上级"
          size="lg"
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
          :disabled="saving"
        />
      </Field>
      <Field>
        <FieldLabel for="dept-leader">负责人</FieldLabel>
        <Input id="dept-leader" v-model="leader" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="dept-phone">电话</FieldLabel>
        <Input id="dept-phone" v-model="phone" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="dept-email">邮箱</FieldLabel>
        <Input id="dept-email" v-model="email" type="email" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="dept-enabled">启用</FieldLabel>
        <Switch id="dept-enabled" v-model="enabled" :disabled="saving" />
      </Field>
      <Field class="ray-form-span-full">
        <FieldLabel for="dept-remark">备注</FieldLabel>
        <Textarea
          id="dept-remark"
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
