<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { getPermissionTree, getRolePermissions, saveRolePermissions } from '@/api/permission'
import { createRole, getRoleById, updateRole } from '@/api/role'
import type { PermissionTree } from '@/types/permission'
import { QUIET, failureMessage } from '@/utils/failure'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { sameEditorSession } from '@/views/system/user/user-table'

const props = defineProps<{
  open: boolean
  roleId: number | null
  canAssignPermissions: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.roleId === null)
const roleName = shallowRef('')
const roleKey = shallowRef('')
const sortText = shallowRef('0')
const enabled = shallowRef(true)
const remark = shallowRef('')
const permissionIds = shallowRef<number[]>([])
const permissions = shallowRef<Array<{ id: number; label: string }>>([])
const formError = shallowRef('')
const stepNote = shallowRef('')
const loading = shallowRef(false)
const saving = shallowRef(false)
const detailReady = shallowRef(false)
const profileSavedKey = shallowRef('')
const permissionsSavedKey = shallowRef('')
const nameInput = useTemplateRef<{ $el?: unknown }>('nameInput')
let session = 0

function idKey(ids: number[]): string {
  return JSON.stringify([...ids].sort((left, right) => left - right))
}

function sortNumber(): number | null {
  const text = sortText.value.trim()
  if (!text) return 0
  const value = Number(text)
  return Number.isInteger(value) ? value : null
}

function profileBody(roleId: number | null) {
  return {
    id: roleId ?? undefined,
    roleName: roleName.value.trim(),
    roleKey: roleKey.value.trim(),
    sort: sortNumber() ?? 0,
    enabled: enabled.value,
    remark: remark.value.trim(),
  }
}

function flatten(nodes: PermissionTree[], depth = 0): Array<{ id: number; label: string }> {
  const result: Array<{ id: number; label: string }> = []
  for (const node of nodes) {
    result.push({ id: node.id, label: `${depth > 0 ? '· '.repeat(depth) : ''}${node.name}` })
    if (node.children?.length) result.push(...flatten(node.children, depth + 1))
  }
  return result
}

function setPermission(id: number, checked: boolean) {
  const next = new Set(permissionIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  permissionIds.value = [...next]
}

async function resetForm() {
  const sessionId = ++session
  const roleId = props.roleId
  roleName.value = ''
  roleKey.value = ''
  sortText.value = '0'
  enabled.value = true
  remark.value = ''
  permissionIds.value = []
  permissions.value = []
  formError.value = ''
  stepNote.value = ''
  profileSavedKey.value = ''
  permissionsSavedKey.value = ''
  detailReady.value = false
  saving.value = false
  loading.value = true
  try {
    if (roleId !== null && props.canAssignPermissions) {
      const tree = await getPermissionTree(QUIET)
      if (!sameEditorSession(sessionId, session, roleId, props.roleId)) return
      permissions.value = flatten(tree ?? [])
    }
    if (roleId !== null) {
      const role = await getRoleById(roleId, QUIET)
      if (!sameEditorSession(sessionId, session, roleId, props.roleId)) return
      roleName.value = role.roleName
      roleKey.value = role.roleKey
      sortText.value = String(role.sort ?? 0)
      enabled.value = role.enabled !== false
      remark.value = role.remark ?? ''
      profileSavedKey.value = JSON.stringify(profileBody(roleId))
      if (props.canAssignPermissions) {
        const ids = await getRolePermissions(roleId, QUIET)
        if (!sameEditorSession(sessionId, session, roleId, props.roleId)) return
        permissionIds.value = ids ?? []
        permissionsSavedKey.value = idKey(permissionIds.value)
      }
    }
    if (!sameEditorSession(sessionId, session, roleId, props.roleId)) return
    detailReady.value = true
  } catch (error) {
    if (sameEditorSession(sessionId, session, roleId, props.roleId)) {
      formError.value = failureMessage(error, '保存失败，请稍后重试')
    }
  } finally {
    if (sameEditorSession(sessionId, session, roleId, props.roleId)) {
      loading.value = false
      await nextTick()
      const element = nameInput.value?.$el
      if (element instanceof HTMLInputElement) element.focus()
    }
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void resetForm()
    else session += 1
  },
)

function close() {
  emit('update:open', false)
}

async function onSubmit() {
  const sessionId = session
  const roleId = props.roleId
  if (!sameEditorSession(sessionId, session, roleId, props.roleId) || !detailReady.value) {
    if (sameEditorSession(sessionId, session, roleId, props.roleId)) {
      formError.value = '角色资料还没有读取完成，不能保存。'
    }
    return
  }
  const sort = sortNumber()
  const body = profileBody(roleId)
  const nextPermissions = [...permissionIds.value]
  const permissionKey = idKey(nextPermissions)
  const profile = JSON.stringify(body)
  const savedProfile = profileSavedKey.value
  const savedPermissions = permissionsSavedKey.value
  formError.value = ''
  stepNote.value = ''
  if (!body.roleName) {
    formError.value = '请填写名称'
    return
  }
  if (!body.roleKey) {
    formError.value = '请填写标识'
    return
  }
  if (body.roleName.length > 50) {
    formError.value = '名称不能超过 50 个字符'
    return
  }
  if (body.roleKey.length > 100) {
    formError.value = '标识不能超过 100 个字符'
    return
  }
  if (body.remark.length > 500) {
    formError.value = '备注不能超过 500 个字符'
    return
  }
  if (sort === null) {
    formError.value = '顺序需要是整数'
    return
  }
  saving.value = true
  const failed: string[] = []
  let profileOk = false
  const stillHere = () => sameEditorSession(sessionId, session, roleId, props.roleId)
  try {
    if (savedProfile !== profile) {
      if (roleId === null) await createRole(body, QUIET)
      else await updateRole({ ...body, id: roleId }, QUIET)
      if (stillHere()) profileSavedKey.value = profile
    }
    profileOk = true
  } catch (error) {
    if (!stillHere()) return
    failed.push(`资料：${failureMessage(error, '保存失败，请稍后重试')}`)
  }
  if (
    profileOk &&
    roleId !== null &&
    props.canAssignPermissions &&
    savedPermissions !== permissionKey
  ) {
    try {
      await saveRolePermissions(roleId, nextPermissions, QUIET)
      if (stillHere()) permissionsSavedKey.value = permissionKey
    } catch (error) {
      if (!stillHere()) return
      failed.push(`权限：${failureMessage(error, '保存失败，请稍后重试')}`)
    }
  }
  if (!stillHere()) {
    if (profileOk && failed.length === 0) emit('saved')
    return
  }
  saving.value = false
  if (failed.length > 0) {
    formError.value = failed.join(' ')
    stepNote.value = '已成功的步骤不会重复提交。改动资料后会重新保存资料。'
    return
  }
  emit('saved')
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ creating ? '新增角色' : '编辑角色' }}</DialogTitle>
        <DialogDescription>
          {{ creating ? '创建后可以再分配权限。' : '资料和权限分开保存。列表按顺序升序。' }}
        </DialogDescription>
      </DialogHeader>
      <form
        class="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
        novalidate
        @submit.prevent="onSubmit"
      >
        <p v-if="loading" class="text-muted-foreground text-sm">正在读取角色资料。</p>
        <FieldGroup v-else-if="detailReady">
          <Field :data-invalid="formError && !roleName.trim() ? true : undefined">
            <FieldLabel for="role-name">名称</FieldLabel>
            <Input
              id="role-name"
              ref="nameInput"
              v-model="roleName"
              name="roleName"
              :disabled="saving"
            />
          </Field>
          <Field :data-invalid="formError && !roleKey.trim() ? true : undefined">
            <FieldLabel for="role-key">标识</FieldLabel>
            <Input id="role-key" v-model="roleKey" name="roleKey" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="role-sort">顺序</FieldLabel>
            <Input
              id="role-sort"
              v-model="sortText"
              name="sort"
              inputmode="numeric"
              :disabled="saving"
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel for="role-enabled">启用</FieldLabel>
            <Switch id="role-enabled" v-model="enabled" :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="role-remark">备注</FieldLabel>
            <Input id="role-remark" v-model="remark" :disabled="saving" />
          </Field>
          <FieldSet v-if="!creating && canAssignPermissions">
            <FieldLegend>权限</FieldLegend>
            <FieldGroup>
              <Field
                v-for="permission in permissions"
                :key="permission.id"
                orientation="horizontal"
              >
                <input
                  :id="`role-permission-${permission.id}`"
                  type="checkbox"
                  :checked="permissionIds.includes(permission.id)"
                  :disabled="saving"
                  @change="
                    setPermission(permission.id, ($event.target as HTMLInputElement).checked)
                  "
                />
                <FieldLabel :for="`role-permission-${permission.id}`">{{
                  permission.label
                }}</FieldLabel>
              </Field>
              <p v-if="permissions.length === 0" class="text-muted-foreground text-sm">
                没有可分配的权限。
              </p>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <FieldError v-if="formError">{{ formError }}</FieldError>
        <p v-if="stepNote" class="text-muted-foreground text-sm">{{ stepNote }}</p>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="saving" @click="close">取消</Button>
          <Button type="submit" :disabled="saving || loading || !detailReady">
            <Spinner v-if="saving" />
            {{ saving ? '正在保存' : '保存' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
