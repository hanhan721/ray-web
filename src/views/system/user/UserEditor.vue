<script setup lang="ts">
import { OctagonX, TriangleAlert, XIcon } from '@lucide/vue'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { getDeptTree, type DeptTree } from '@/api/dept'
import { getRoleList, type Role } from '@/api/role'
import { assignUserDepts, assignUserRoles, createUser, getUserById, updateUser } from '@/api/user'
import { GenderOptions, type Gender } from '@/types/enums'
import { RequestError } from '@/utils/request'
import MultiSelect from '@/components/common/MultiSelect.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
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
const avatarFileId = shallowRef<number | null>(null)
const roleIds = shallowRef<number[]>([])
const deptIds = shallowRef<number[]>([])
const roles = shallowRef<Role[]>([])
const depts = shallowRef<Array<{ id: number; label: string; depth: number }>>([])
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
const deptOptions = computed(() =>
  depts.value.map((dept) => ({
    value: dept.id,
    label: dept.label,
    depth: dept.depth,
  })),
)
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

function flattenDepts(
  nodes: DeptTree[],
  depth = 0,
): Array<{ id: number; label: string; depth: number }> {
  const result: Array<{ id: number; label: string; depth: number }> = []
  for (const node of nodes) {
    result.push({ id: node.id, label: node.deptName, depth })
    if (node.children?.length) result.push(...flattenDepts(node.children, depth + 1))
  }
  return result
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

function onOpenChange(open: boolean) {
  if (!open && saving.value) return
  emit('update:open', open)
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
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      :show-close-button="false"
      class="grid max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
    >
      <DialogHeader class="border-b px-6 pt-6 pr-12 pb-4">
        <DialogTitle class="text-lg font-semibold">
          {{ creating ? '新增用户' : '编辑用户' }}
        </DialogTitle>
        <DialogDescription class="sr-only">用户资料编辑</DialogDescription>
      </DialogHeader>

      <DialogClose as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="absolute top-4 right-4"
          :disabled="saving"
          aria-label="关闭"
        >
          <XIcon />
        </Button>
      </DialogClose>

      <form class="contents" novalidate @submit.prevent="onSubmit">
        <div class="min-h-0 overflow-y-auto px-6 py-5">
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

          <div v-else class="flex flex-col gap-6">
            <FieldSet class="gap-3">
              <FieldLegend class="mb-0">基本资料</FieldLegend>
              <div class="grid gap-4 sm:grid-cols-2">
                <Field :data-invalid="formError && !username.trim() ? true : undefined">
                  <FieldLabel for="user-username">账号</FieldLabel>
                  <Input
                    id="user-username"
                    ref="usernameInput"
                    v-model="username"
                    name="username"
                    autocomplete="off"
                    class="h-9"
                    :disabled="saving"
                    :aria-invalid="formError && !username.trim() ? true : undefined"
                  />
                  <FieldError v-if="formError && !username.trim()">请填写账号</FieldError>
                </Field>
                <Field>
                  <FieldLabel for="user-nickname">昵称</FieldLabel>
                  <Input id="user-nickname" v-model="nickname" class="h-9" :disabled="saving" />
                </Field>
                <Field
                  v-if="creating"
                  class="sm:col-span-2"
                  :data-invalid="formError && !password ? true : undefined"
                >
                  <FieldLabel for="user-password">密码</FieldLabel>
                  <Input
                    id="user-password"
                    v-model="password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    class="h-9"
                    :disabled="saving"
                    :aria-invalid="formError && !password ? true : undefined"
                  />
                  <FieldError v-if="formError && !password">请填写密码</FieldError>
                </Field>
                <Field>
                  <FieldLabel for="user-gender">性别</FieldLabel>
                  <Select
                    :model-value="gender === '' ? 'none' : gender"
                    :disabled="saving"
                    @update:model-value="setGender"
                  >
                    <SelectTrigger id="user-gender" size="lg" class="w-full text-sm">
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
                <Field>
                  <FieldLabel for="user-phone">手机</FieldLabel>
                  <Input
                    id="user-phone"
                    v-model="phone"
                    autocomplete="off"
                    class="h-9"
                    :disabled="saving"
                  />
                </Field>
                <Field class="sm:col-span-2">
                  <FieldLabel for="user-email">邮箱</FieldLabel>
                  <Input
                    id="user-email"
                    v-model="email"
                    type="email"
                    autocomplete="off"
                    class="h-9"
                    :disabled="saving"
                  />
                </Field>
                <Field
                  orientation="horizontal"
                  class="rounded-lg border bg-muted/20 px-3 py-2 sm:col-span-2"
                >
                  <FieldLabel for="user-enabled">启用账号</FieldLabel>
                  <Switch id="user-enabled" v-model="enabled" :disabled="saving" />
                </Field>
                <Field class="sm:col-span-2">
                  <FieldLabel for="user-remark">备注</FieldLabel>
                  <Textarea
                    id="user-remark"
                    v-model="remark"
                    placeholder="补充说明（可选）"
                    :disabled="saving"
                  />
                </Field>
              </div>
            </FieldSet>

            <FieldSet v-if="showPermissionSection" class="gap-3">
              <FieldLegend class="mb-0">权限与归属</FieldLegend>
              <div
                :class="
                  canAssignRoles && canAssignDepts
                    ? 'grid gap-4 md:grid-cols-2'
                    : 'flex flex-col gap-4'
                "
              >
                <FieldSet v-if="canAssignRoles" class="gap-2">
                  <FieldLegend variant="label" class="mb-0">角色</FieldLegend>
                  <MultiSelect
                    v-model="roleIds"
                    :options="roleOptions"
                    placeholder="选择角色"
                    empty-text="没有可分配的角色"
                    no-results-text="没有匹配的角色"
                    :disabled="saving"
                  />
                </FieldSet>

                <FieldSet v-if="canAssignDepts" class="gap-2">
                  <FieldLegend variant="label" class="mb-0">部门</FieldLegend>
                  <MultiSelect
                    v-model="deptIds"
                    :options="deptOptions"
                    placeholder="选择部门"
                    empty-text="没有可分配的部门"
                    no-results-text="没有匹配的部门"
                    :disabled="saving"
                  />
                </FieldSet>
              </div>
            </FieldSet>
          </div>
        </div>

        <div class="flex flex-col gap-3 border-t px-6 py-4">
          <Alert v-if="formError" :variant="stepNote ? 'default' : 'destructive'">
            <TriangleAlert v-if="stepNote" />
            <OctagonX v-else />
            <AlertTitle>{{ stepNote ? '部分内容未保存' : '没有保存成功' }}</AlertTitle>
            <AlertDescription>
              {{ formError }}
              <span v-if="stepNote" class="mt-1 block">{{ stepNote }}</span>
            </AlertDescription>
          </Alert>
          <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              class="w-full sm:w-auto"
              :disabled="saving"
              @click="close"
            >
              取消
            </Button>
            <Button
              type="submit"
              class="w-full sm:w-auto"
              :disabled="saving || loading || !detailReady"
            >
              <Spinner v-if="saving" />
              {{ saving ? '正在提交' : '提交' }}
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
