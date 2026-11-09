<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { getDeptTree, type DeptTree } from '@/api/dept'
import { getRoleList, type Role } from '@/api/role'
import { assignUserDepts, assignUserRoles, createUser, getUserById, updateUser } from '@/api/user'
import { GenderOptions, type Gender } from '@/types/enums'
import { RequestError } from '@/utils/request'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
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
const avatarFileId = shallowRef<number | null>(null)
const roleIds = shallowRef<number[]>([])
const deptIds = shallowRef<number[]>([])
const roles = shallowRef<Role[]>([])
const depts = shallowRef<Array<{ id: number; label: string }>>([])
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
let session = 0

function idKey(ids: number[]): string {
  return JSON.stringify([...ids].sort((left, right) => left - right))
}

const quiet = { showErrorMessage: false } as const

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

function failureMessage(error: unknown): string {
  if (error instanceof RequestError && error.message) return error.message
  return '保存失败，请稍后重试'
}

function flattenDepts(nodes: DeptTree[], depth = 0): Array<{ id: number; label: string }> {
  const result: Array<{ id: number; label: string }> = []
  for (const node of nodes) {
    result.push({
      id: node.id,
      label: `${depth > 0 ? `${'· '.repeat(depth)}` : ''}${node.deptName}`,
    })
    if (node.children?.length) result.push(...flattenDepts(node.children, depth + 1))
  }
  return result
}

function toggleId(list: number[], id: number, checked: boolean): number[] {
  const next = new Set(list)
  if (checked) next.add(id)
  else next.delete(id)
  return [...next]
}

function setRole(id: number, checked: boolean) {
  roleIds.value = toggleId(roleIds.value, id, checked)
}

function setDept(id: number, checked: boolean) {
  deptIds.value = toggleId(deptIds.value, id, checked)
}

async function loadOptions(sessionId: number, userId: number | null) {
  const tasks: Array<Promise<void>> = []
  if (userId !== null && props.canAssignRoles) {
    tasks.push(
      getRoleList(quiet).then((items) => {
        if (sameEditorSession(sessionId, session, userId, props.userId)) roles.value = items ?? []
      }),
    )
  }
  if (userId !== null && props.canAssignDepts) {
    tasks.push(
      getDeptTree(quiet).then((items) => {
        if (sameEditorSession(sessionId, session, userId, props.userId)) {
          depts.value = flattenDepts(items ?? [])
        }
      }),
    )
  }
  await Promise.all(tasks)
}

async function loadDetail(sessionId: number, userId: number) {
  const detail = await getUserById(userId, quiet)
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
  roles.value = []
  depts.value = []
  formError.value = ''
  stepNote.value = ''
  profileSavedKey.value = ''
  rolesSavedKey.value = ''
  deptsSavedKey.value = ''
  detailReady.value = false
  saving.value = false
  loading.value = true
  try {
    await loadOptions(sessionId, userId)
    if (!sameEditorSession(sessionId, session, userId, props.userId)) return
    if (userId !== null) await loadDetail(sessionId, userId)
    if (!sameEditorSession(sessionId, session, userId, props.userId)) return
    detailReady.value = true
  } catch (error) {
    if (sameEditorSession(sessionId, session, userId, props.userId)) {
      formError.value = failureMessage(error)
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
      if (userId === null) await createUser({ ...body, password: passwordValue }, quiet)
      else await updateUser({ ...body, id: userId }, quiet)
      if (stillHere()) profileSavedKey.value = profile
    }
    profileOk = true
  } catch (error) {
    if (!stillHere()) return
    failed.push(`资料：${failureMessage(error)}`)
  }
  if (profileOk && userId !== null && props.canAssignRoles && savedRoles !== roleKey) {
    try {
      await assignUserRoles(userId, nextRoles, quiet)
      if (stillHere()) rolesSavedKey.value = roleKey
    } catch (error) {
      if (!stillHere()) return
      failed.push(`角色：${failureMessage(error)}`)
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
      await assignUserDepts(userId, nextDepts, quiet)
      if (stillHere()) deptsSavedKey.value = deptKey
    } catch (error) {
      if (!stillHere()) return
      failed.push(`部门：${failureMessage(error)}`)
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
        <DialogTitle>{{ creating ? '新增用户' : '编辑用户' }}</DialogTitle>
        <DialogDescription>
          {{ creating ? '创建后可以再分配角色和部门。' : '资料、角色和部门分开保存。' }}
        </DialogDescription>
      </DialogHeader>
      <form novalidate @submit.prevent="onSubmit">
        <div class="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          <p v-if="loading" class="text-muted-foreground text-sm">正在读取用户资料。</p>
          <FieldGroup v-else-if="detailReady">
            <Field :data-invalid="formError && !username.trim() ? true : undefined">
              <FieldLabel for="user-username">账号</FieldLabel>
              <Input
                id="user-username"
                ref="usernameInput"
                v-model="username"
                name="username"
                autocomplete="off"
                :disabled="saving"
                :aria-invalid="formError && !username.trim() ? true : undefined"
              />
            </Field>
            <Field v-if="creating" :data-invalid="formError && !password ? true : undefined">
              <FieldLabel for="user-password">密码</FieldLabel>
              <Input
                id="user-password"
                v-model="password"
                name="password"
                type="password"
                autocomplete="new-password"
                :disabled="saving"
                :aria-invalid="formError && !password ? true : undefined"
              />
            </Field>
            <Field>
              <FieldLabel for="user-nickname">昵称</FieldLabel>
              <Input id="user-nickname" v-model="nickname" :disabled="saving" />
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
            <Field>
              <FieldLabel for="user-phone">手机</FieldLabel>
              <Input id="user-phone" v-model="phone" autocomplete="off" :disabled="saving" />
            </Field>
            <Field>
              <FieldLabel for="user-gender">性别</FieldLabel>
              <Select
                :model-value="gender === '' ? 'none' : gender"
                :disabled="saving"
                @update:model-value="setGender"
              >
                <SelectTrigger id="user-gender" class="w-full">
                  <SelectValue placeholder="未填写" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">未填写</SelectItem>
                    <SelectItem
                      v-for="option in GenderOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <FieldLabel for="user-enabled">启用</FieldLabel>
              <Switch id="user-enabled" v-model="enabled" :disabled="saving" />
            </Field>
            <Field>
              <FieldLabel for="user-remark">备注</FieldLabel>
              <Input id="user-remark" v-model="remark" :disabled="saving" />
            </Field>
            <FieldSet v-if="!creating && canAssignRoles">
              <FieldLegend>角色</FieldLegend>
              <FieldGroup class="gap-1">
                <Field v-for="role in roles" :key="role.id" orientation="horizontal">
                  <Checkbox
                    :id="`user-role-${role.id}`"
                    :model-value="roleIds.includes(role.id)"
                    :disabled="saving || role.enabled === false"
                    @update:model-value="setRole(role.id, Boolean($event))"
                  />
                  <FieldLabel :for="`user-role-${role.id}`">{{ role.roleName }}</FieldLabel>
                </Field>
                <p v-if="roles.length === 0" class="text-muted-foreground text-sm">
                  没有可分配的角色。
                </p>
              </FieldGroup>
            </FieldSet>
            <FieldSet v-if="!creating && canAssignDepts">
              <FieldLegend>部门</FieldLegend>
              <FieldGroup class="gap-1">
                <Field v-for="dept in depts" :key="dept.id" orientation="horizontal">
                  <Checkbox
                    :id="`user-dept-${dept.id}`"
                    :model-value="deptIds.includes(dept.id)"
                    :disabled="saving"
                    @update:model-value="setDept(dept.id, Boolean($event))"
                  />
                  <FieldLabel :for="`user-dept-${dept.id}`">{{ dept.label }}</FieldLabel>
                </Field>
                <p v-if="depts.length === 0" class="text-muted-foreground text-sm">
                  没有可分配的部门。
                </p>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>
          <FieldError v-if="formError">{{ formError }}</FieldError>
          <p v-if="stepNote" class="text-muted-foreground text-sm">{{ stepNote }}</p>
        </div>
        <DialogFooter class="bg-dialog sticky bottom-0 pt-3">
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
