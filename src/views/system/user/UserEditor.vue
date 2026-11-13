<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { getDeptTree, type DeptTree } from '@/api/dept'
import { getRoleList, type Role } from '@/api/role'
import { assignUserDepts, assignUserRoles, createUser, getUserById, updateUser } from '@/api/user'
import { GenderOptions, type Gender } from '@/types/enums'
import { QUIET, failureMessage } from '@/utils/failure'
import RayFormDialog from '@/components/common/RayFormDialog.vue'
import RaySelect from '@/components/common/RaySelect.vue'
import RayTreeSelect, { type TreeSelectOption } from '@/components/common/RayTreeSelect.vue'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { sameEditorSession, toUserWrite } from './user-table'

const props = defineProps<{
  open: boolean
  userId: number | null
  canAssignRoles: boolean
  canAssignDepts: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const creating = computed(() => props.userId === null)
const username = shallowRef('')
const password = shallowRef('')
const nickname = shallowRef('')
const email = shallowRef('')
const phone = shallowRef('')
const gender = shallowRef<Gender | ''>('')

function setGender(value: unknown) {
  gender.value = value === 'MALE' || value === 'FEMALE' || value === 'SECRET' ? value : ''
}
const enabled = shallowRef(true)
const remark = shallowRef('')
// 表单没有头像字段，仅原样透传后端返回的文件 id，避免保存资料时清空已有头像。
const avatarFileId = shallowRef<number | null>(null)
const roleIds = shallowRef<number[]>([])
const deptIds = shallowRef<number[]>([])
const roles = shallowRef<Role[]>([])
const depts = shallowRef<TreeSelectOption<number>[]>([])
const formError = shallowRef('')
const stepNote = shallowRef('')
const loading = shallowRef(false)
const saving = shallowRef(false)
const detailReady = shallowRef(false)
const profileSavedKey = shallowRef('')
const rolesSavedKey = shallowRef('')
const deptsSavedKey = shallowRef('')
const originalGender = shallowRef<Gender | ''>('')
const usernameInput = useTemplateRef<{ $el?: unknown }>('usernameInput')
const showPermissionSection = computed(
  () => !creating.value && (props.canAssignRoles || props.canAssignDepts),
)
const roleOptions = computed(() =>
  roles.value.map((role) => ({
    value: role.id,
    label: role.roleName,
    disabled: role.enabled === false,
  })),
)
let session = 0
let rolesRequest: Promise<Role[]> | null = null
let deptsRequest: Promise<TreeSelectOption<number>[]> | null = null

function idKey(ids: number[]): string {
  return JSON.stringify([...ids].sort((left, right) => left - right))
}

function profileKey(body: ReturnType<typeof toUserWrite>): string {
  return JSON.stringify(body)
}

function writeBody(userId: number | null = props.userId): ReturnType<typeof toUserWrite> {
  return toUserWrite({
    id: userId ?? undefined,
    username: username.value,
    nickname: nickname.value,
    email: email.value,
    phone: phone.value,
    avatarFileId: avatarFileId.value,
    gender: gender.value,
    enabled: enabled.value,
    remark: remark.value,
  })
}

function toTreeOptions(nodes: DeptTree[]): TreeSelectOption<number>[] {
  return nodes.map((node) => ({
    value: node.id,
    label: node.deptName,
    children: node.children?.length ? toTreeOptions(node.children) : undefined,
  }))
}

async function loadOptions(userId: number | null) {
  if (userId === null) return
  const tasks: Array<Promise<unknown>> = []
  if (props.canAssignRoles) tasks.push(ensureRoles())
  if (props.canAssignDepts) tasks.push(ensureDepts())
  await Promise.all(tasks)
}

function ensureRoles(): Promise<Role[]> {
  if (!rolesRequest) {
    rolesRequest = getRoleList(QUIET)
      .then((items) => {
        roles.value = items ?? []
        return roles.value
      })
      .catch((error) => {
        rolesRequest = null
        throw error
      })
  }
  return rolesRequest
}

function ensureDepts(): Promise<TreeSelectOption<number>[]> {
  if (!deptsRequest) {
    deptsRequest = getDeptTree(QUIET)
      .then((items) => {
        depts.value = toTreeOptions(items ?? [])
        return depts.value
      })
      .catch((error) => {
        deptsRequest = null
        throw error
      })
  }
  return deptsRequest
}

async function loadDetail(sessionId: number, userId: number) {
  const detail = await getUserById(userId, QUIET)
  if (!sameEditorSession(sessionId, session, userId, props.userId)) return
  const user = detail.user
  username.value = user.username
  nickname.value = user.nickname ?? ''
  email.value = user.email ?? ''
  phone.value = user.phone ?? ''
  gender.value = user.gender ?? ''
  originalGender.value = gender.value
  enabled.value = user.enabled !== false
  remark.value = user.remark ?? ''
  avatarFileId.value = user.avatarFileId?.fileId ?? null
  roleIds.value = detail.roleIds ?? []
  deptIds.value = detail.deptIds ?? []
  rolesSavedKey.value = idKey(roleIds.value)
  deptsSavedKey.value = idKey(deptIds.value)
  profileSavedKey.value = profileKey(writeBody(userId))
}

async function resetForm() {
  const sessionId = ++session
  const userId = props.userId
  username.value = ''
  password.value = ''
  nickname.value = ''
  email.value = ''
  phone.value = ''
  gender.value = ''
  originalGender.value = ''
  enabled.value = true
  remark.value = ''
  avatarFileId.value = null
  roleIds.value = []
  deptIds.value = []
  formError.value = ''
  stepNote.value = ''
  profileSavedKey.value = ''
  rolesSavedKey.value = ''
  deptsSavedKey.value = ''
  detailReady.value = false
  saving.value = false
  loading.value = true
  try {
    await loadOptions(userId)
    if (!sameEditorSession(sessionId, session, userId, props.userId)) return
    if (userId !== null) await loadDetail(sessionId, userId)
    if (!sameEditorSession(sessionId, session, userId, props.userId)) return
    detailReady.value = true
  } catch (error) {
    if (sameEditorSession(sessionId, session, userId, props.userId)) {
      formError.value = failureMessage(error, '保存失败，请稍后重试')
    }
  } finally {
    if (sameEditorSession(sessionId, session, userId, props.userId)) {
      loading.value = false
      await nextTick()
      const element = usernameInput.value?.$el
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
  const userId = props.userId
  if (!sameEditorSession(sessionId, session, userId, props.userId)) return
  formError.value = ''
  stepNote.value = ''
  if (!detailReady.value) {
    formError.value = '用户资料还没有读取完成，不能保存。'
    return
  }
  const body = writeBody(userId)
  const passwordValue = password.value
  const nextRoles = [...roleIds.value]
  const nextDepts = [...deptIds.value]
  const roleKey = idKey(nextRoles)
  const deptKey = idKey(nextDepts)
  const profile = profileKey(body)
  const savedProfile = profileSavedKey.value
  const savedRoles = rolesSavedKey.value
  const savedDepts = deptsSavedKey.value
  if (!body.username) {
    formError.value = '请填写账号'
    return
  }
  if (userId === null && !passwordValue) {
    formError.value = '请填写密码'
    return
  }
  // 后端不允许清空已有性别，这里提前拦住，避免提交后才报错。
  if (userId !== null && !gender.value && originalGender.value) {
    formError.value = '性别暂时不能清空。请选择男、女或保密。'
    return
  }
  saving.value = true
  const failed: string[] = []
  let profileOk = false
  const stillHere = () => sameEditorSession(sessionId, session, userId, props.userId)
  try {
    if (savedProfile !== profile) {
      if (userId === null) await createUser({ ...body, password: passwordValue }, QUIET)
      else await updateUser({ ...body, id: userId }, QUIET)
      if (stillHere()) profileSavedKey.value = profile
    }
    profileOk = true
  } catch (error) {
    if (!stillHere()) return
    failed.push(`资料：${failureMessage(error, '保存失败，请稍后重试')}`)
  }
  if (profileOk && userId !== null && props.canAssignRoles && savedRoles !== roleKey) {
    try {
      await assignUserRoles(userId, nextRoles, QUIET)
      if (stillHere()) rolesSavedKey.value = roleKey
    } catch (error) {
      if (!stillHere()) return
      failed.push(`角色：${failureMessage(error, '保存失败，请稍后重试')}`)
    }
  }
  if (
    profileOk &&
    failed.length === 0 &&
    userId !== null &&
    props.canAssignDepts &&
    savedDepts !== deptKey
  ) {
    try {
      await assignUserDepts(userId, nextDepts, QUIET)
      if (stillHere()) deptsSavedKey.value = deptKey
    } catch (error) {
      if (!stillHere()) return
      failed.push(`部门：${failureMessage(error, '保存失败，请稍后重试')}`)
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
  <RayFormDialog
    :open="open"
    :title="creating ? '新增用户' : '编辑用户'"
    description="用户资料编辑"
    hide-description
    size="lg"
    :saving="saving"
    :error="formError"
    :step-note="stepNote"
    @update:open="emit('update:open', $event)"
    @submit="onSubmit"
  >
    <div
      v-if="loading"
      class="flex min-h-48 flex-col items-center justify-center gap-3 text-center"
    >
      <Spinner class="size-5" />
      <p class="text-muted-foreground text-sm">正在读取用户资料…</p>
    </div>

    <div
      v-else-if="!detailReady"
      class="flex min-h-48 flex-col items-center justify-center gap-2 text-center"
    >
      <p class="text-sm font-medium">没有读取到用户资料</p>
      <p class="text-muted-foreground text-xs">检查网络后重试，或关闭窗口稍后再试。</p>
      <Button type="button" variant="outline" size="sm" @click="resetForm">重试</Button>
    </div>

    <FieldGroup v-else-if="detailReady" class="ray-form-grid">
      <Field :data-invalid="formError && !username.trim() ? true : undefined">
        <FieldLabel for="user-username" required>账号</FieldLabel>
        <Input
          id="user-username"
          ref="usernameInput"
          v-model="username"
          name="username"
          autocomplete="off"
          :disabled="saving"
          required
          :aria-invalid="formError && !username.trim() ? true : undefined"
          :aria-describedby="formError && !username.trim() ? 'user-username-error' : undefined"
        />
        <FieldError v-if="formError && !username.trim()" id="user-username-error"
          >请填写账号</FieldError
        >
      </Field>
      <Field
        v-if="creating"
        :data-invalid="formError && !password ? true : undefined"
      >
        <FieldLabel for="user-password" required>密码</FieldLabel>
        <Input
          id="user-password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="new-password"
          :disabled="saving"
          required
          :aria-invalid="formError && !password ? true : undefined"
          :aria-describedby="formError && !password ? 'user-password-error' : undefined"
        />
        <FieldError v-if="formError && !password" id="user-password-error"
          >请填写密码</FieldError
        >
      </Field>
      <Field>
        <FieldLabel for="user-nickname">昵称</FieldLabel>
        <Input id="user-nickname" v-model="nickname" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="user-gender">性别</FieldLabel>
        <RaySelect
          id="user-gender"
          :model-value="gender || null"
          :options="GenderOptions"
          placeholder="未填写"
          size="lg"
          :searchable="false"
          :clearable="!originalGender"
          :disabled="saving"
          class="w-full"
          @update:model-value="setGender"
        />
      </Field>
      <Field>
        <FieldLabel for="user-phone">手机</FieldLabel>
        <Input id="user-phone" v-model="phone" autocomplete="off" :disabled="saving" />
      </Field>
      <Field>
        <FieldLabel for="user-email">邮箱</FieldLabel>
        <Input
          id="user-email"
          v-model="email"
          type="email"
          autocomplete="off"
          :disabled="saving"
        />
      </Field>
      <Field v-if="showPermissionSection && canAssignRoles">
        <FieldLabel for="user-roles">角色</FieldLabel>
        <RaySelect
          id="user-roles"
          v-model="roleIds"
          multiple
          :options="roleOptions"
          placeholder="选择角色"
          empty-text="没有可分配的角色"
          no-results-text="没有匹配的角色"
          aria-label="角色"
          :disabled="saving"
        />
      </Field>
      <Field v-if="showPermissionSection && canAssignDepts">
        <FieldLabel for="user-depts">部门</FieldLabel>
        <RayTreeSelect
          id="user-depts"
          v-model="deptIds"
          multiple
          check-strictly
          row-action="select"
          :options="depts"
          placeholder="选择部门"
          aria-label="部门"
          :disabled="saving"
          class="w-full"
        />
      </Field>
      <Field>
        <FieldLabel for="user-enabled">启用账号</FieldLabel>
        <Switch id="user-enabled" v-model="enabled" :disabled="saving" />
      </Field>
      <Field class="ray-form-span-full">
        <FieldLabel for="user-remark">备注</FieldLabel>
        <Textarea
          id="user-remark"
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
        @click="close"
      >
        取消
      </Button>
      <Button type="submit" class="w-full sm:w-auto" :disabled="saving || loading || !detailReady">
        <Spinner v-if="saving" />
        {{ saving ? '正在提交' : '提交' }}
      </Button>
    </template>
  </RayFormDialog>
</template>
