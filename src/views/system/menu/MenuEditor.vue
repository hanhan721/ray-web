<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { createPermission, updatePermission } from '@/api/permission'
import { PermissionTypeOptions, type PermissionType } from '@/types/enums'
import { failureMessage } from '@/utils/failure'
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
  excludedParentIds,
  menuFormError,
  menuWriteBody,
  parseSort,
  type MenuRow,
} from './menu-tree'

const props = defineProps<{
  open: boolean
  menu: MenuRow | null
  rows: MenuRow[]
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.menu === null)
const name = shallowRef('')
const parentId = shallowRef('0')
const type = shallowRef<PermissionType>('DIRECTORY')
const url = shallowRef('')
const component = shallowRef('')
const routeName = shallowRef('')
const redirect = shallowRef('')
const code = shallowRef('')
const icon = shallowRef('')
const sortText = shallowRef('0')
const hidden = shallowRef(false)
const keepAlive = shallowRef(false)
const enabled = shallowRef(true)
const description = shallowRef('')
const originalCode = shallowRef('')
const formError = shallowRef('')
const saving = shallowRef(false)
const nameInput = useTemplateRef<{ $el?: unknown }>('nameInput')
let session = 0

const parentOptions = computed(() => {
  const excluded = props.menu ? excludedParentIds(props.rows, props.menu.id) : new Set<number>()
  return props.rows.filter((row) => !excluded.has(row.id))
})
const parentSelectOptions = computed(() => [
  { value: '0', label: '无' },
  ...parentOptions.value.map((row) => ({
    value: String(row.id),
    label: `${'· '.repeat(row.depth)}${row.name}`,
  })),
])

function setType(value: unknown) {
  type.value = value === 'DIRECTORY' || value === 'MENU' || value === 'BUTTON' ? value : 'DIRECTORY'
}

function resetForm() {
  session += 1
  const menu = props.menu
  name.value = menu?.name ?? ''
  parentId.value = String(menu?.parentId ?? 0)
  type.value = menu?.type ?? 'DIRECTORY'
  url.value = menu?.url ?? ''
  component.value = menu?.component ?? ''
  routeName.value = menu?.routeName ?? ''
  redirect.value = menu?.redirect ?? ''
  code.value = menu?.code ?? ''
  icon.value = menu?.icon ?? ''
  sortText.value = String(menu?.sort ?? 0)
  hidden.value = menu?.hidden === true
  keepAlive.value = menu?.keepAlive === true
  enabled.value = menu?.enabled !== false
  description.value = menu?.description ?? ''
  originalCode.value = menu?.code ?? ''
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
  const menuId = props.menu?.id ?? null
  const stillHere = () => sameEditorSession(sessionId, session, menuId, props.menu?.id ?? null)
  formError.value = ''
  const nextName = name.value.trim()
  const nextCode = code.value.trim()
  const sort = parseSort(sortText.value)
  const nextParent = Number(parentId.value)
  const message = menuFormError({
    name: nextName,
    type: type.value,
    url: url.value.trim(),
    code: nextCode,
    component: component.value.trim(),
    redirect: redirect.value.trim(),
    icon: icon.value.trim(),
    routeName: routeName.value.trim(),
    description: description.value.trim(),
    sort,
    originalCode: originalCode.value,
  })
  if (message || sort === null) {
    formError.value = message || '顺序需要是 -2147483648 到 2147483647 的整数'
    return
  }
  const body = menuWriteBody({
    id: menuId,
    parentId: Number.isInteger(nextParent) ? nextParent : 0,
    name: nextName,
    type: type.value,
    url: url.value.trim(),
    code: nextCode,
    component: component.value.trim(),
    routeName: routeName.value.trim(),
    redirect: redirect.value.trim(),
    icon: icon.value.trim(),
    sort,
    hidden: hidden.value,
    keepAlive: keepAlive.value,
    enabled: enabled.value,
    description: description.value.trim(),
    originalCode: originalCode.value,
    originalEnabled: props.menu?.enabled !== false,
  })
  saving.value = true
  try {
    if (menuId !== null) {
      await updatePermission({ ...body, id: menuId }, { showErrorMessage: false })
    } else await createPermission(body, { showErrorMessage: false })
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
    :title="creating ? '新增菜单' : '编辑菜单'"
    description="菜单要填写路由，按钮要填写权限标识。已有标识不能清空。编辑按钮，或更改启用、标识后，需要重新登录。"
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
          <Field>
            <FieldLabel for="menu-name">名称</FieldLabel>
            <Input
              id="menu-name"
              ref="nameInput"
              v-model="name"
              name="name"
              class="h-9"
              :disabled="saving"
            />
          </Field>
          <Field>
            <FieldLabel for="menu-type">类型</FieldLabel>
            <SingleSelect
              id="menu-type"
              :model-value="type"
              :options="PermissionTypeOptions"
              size="lg"
              :searchable="false"
              :disabled="saving"
              class="w-full"
              @update:model-value="setType"
            />
          </Field>
          <Field>
            <FieldLabel for="menu-parent">上级</FieldLabel>
            <SingleSelect
              id="menu-parent"
              v-model="parentId"
              :options="parentSelectOptions"
              placeholder="选择上级"
              size="lg"
              searchable
              :disabled="saving"
              class="w-full"
            />
          </Field>
          <Field>
            <FieldLabel for="menu-icon">图标</FieldLabel>
            <Input id="menu-icon" v-model="icon" class="h-9" :disabled="saving" />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">路由与标识</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="menu-url">路由</FieldLabel>
            <Input id="menu-url" v-model="url" class="h-9" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="menu-code">权限标识</FieldLabel>
            <Input id="menu-code" v-model="code" class="h-9" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="menu-component">组件</FieldLabel>
            <Input id="menu-component" v-model="component" class="h-9" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="menu-route-name">路由名称</FieldLabel>
            <Input id="menu-route-name" v-model="routeName" class="h-9" :disabled="saving" />
          </Field>
          <Field class="sm:col-span-2">
            <FieldLabel for="menu-redirect">重定向</FieldLabel>
            <Input id="menu-redirect" v-model="redirect" class="h-9" :disabled="saving" />
          </Field>
        </div>
      </FieldSet>

      <FieldSet class="gap-3">
        <FieldLegend class="mb-0">显示与状态</FieldLegend>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="menu-sort">顺序</FieldLabel>
            <Input
              id="menu-sort"
              v-model="sortText"
              name="sort"
              inputmode="numeric"
              class="h-9"
              :disabled="saving"
            />
          </Field>
          <Field orientation="horizontal" class="rounded-lg border bg-muted/20 px-3 py-2">
            <FieldLabel for="menu-enabled">启用</FieldLabel>
            <Switch id="menu-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field orientation="horizontal" class="rounded-lg border bg-muted/20 px-3 py-2">
            <FieldLabel for="menu-hidden">隐藏</FieldLabel>
            <Switch id="menu-hidden" v-model="hidden" :disabled="saving" />
          </Field>
          <Field orientation="horizontal" class="rounded-lg border bg-muted/20 px-3 py-2">
            <FieldLabel for="menu-keep-alive">缓存</FieldLabel>
            <Switch id="menu-keep-alive" v-model="keepAlive" :disabled="saving" />
          </Field>
          <Field class="sm:col-span-2">
            <FieldLabel for="menu-description">描述</FieldLabel>
            <Textarea
              id="menu-description"
              v-model="description"
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
  </FormDialog>
</template>
