<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import { RefreshOutline } from '@vicons/ionicons5'
import { getRoleList, type Role } from '@/api/role'
import { getDeptTree, type DeptTree } from '@/api/dept'
import { assignUserDepts, assignUserRoles, createUser, getUserById, updateUser, type SysUser } from '@/api/user'
import { GenderOptions, type Gender } from '@/types/enums'
import { getRequestErrorMessage } from '@/utils/errorMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

defineOptions({ name: 'UserHeadlessEditor' })

const props = defineProps<{ open: boolean; user: SysUser | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; saved: []; restoreFocus: [] }>()
const fieldId = useId()
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const loadFailed = ref(false)
const retryVersion = ref(0)
const roles = ref<Role[]>([])
const departments = ref<{ id: number; label: string; enabled: boolean }[]>([])
const isEdit = computed(() => props.user !== null)

function defaultValues() {
  return {
    username: '',
    password: '',
    nickname: '',
    email: '',
    phone: '',
    gender: 'SECRET' as Gender,
    enabled: true,
    remark: '',
    roleIds: [] as number[],
    deptIds: [] as number[],
  }
}

const form = reactive(defaultValues())

function flattenDepartments(nodes: DeptTree[], parents: string[] = [], parentEnabled = true): typeof departments.value {
  return nodes.flatMap((node) => {
    const path = [...parents, node.deptName]
    const enabled = parentEnabled && node.enabled
    return [
      { id: node.id, label: path.join(' / '), enabled },
      ...flattenDepartments(node.children || [], path, enabled),
    ]
  })
}

watch(
  () => [props.open, props.user?.id, retryVersion.value] as const,
  async ([open, id], _previous, onCleanup) => {
    if (!open) return
    let current = true
    onCleanup(() => {
      current = false
    })
    Object.assign(form, defaultValues())
    roles.value = []
    departments.value = []
    error.value = ''
    loadFailed.value = false
    loading.value = true
    try {
      const [detail, roleList, deptTree] = await Promise.all([
        id !== undefined ? getUserById(id) : Promise.resolve(null),
        getRoleList(),
        getDeptTree(),
      ])
      if (!current) return
      if (detail) {
        const user = detail.user
        Object.assign(form, {
          username: user.username,
          nickname: user.nickname || '',
          email: user.email || '',
          phone: user.phone || '',
          gender: user.gender || 'SECRET',
          enabled: user.enabled,
          remark: user.remark || '',
          roleIds: [...(detail.roleIds || [])],
          deptIds: [...(detail.deptIds || [])],
        })
      }
      roles.value = roleList.filter((role) => role.enabled || form.roleIds.includes(role.id))
      departments.value = flattenDepartments(deptTree).filter((dept) => dept.enabled || form.deptIds.includes(dept.id))
    } catch (cause) {
      if (current) {
        loadFailed.value = true
        error.value = getRequestErrorMessage(cause, '用户资料加载失败，请重试')
      }
    } finally {
      if (current) loading.value = false
    }
  },
  { immediate: true }
)

function setOpen(value: boolean) {
  if (!submitting.value) emit('update:open', value)
}

function toggleAssignment(field: 'roleIds' | 'deptIds', id: number, checked: boolean) {
  form[field] = checked ? [...new Set([...form[field], id])] : form[field].filter((value) => value !== id)
}

async function submit() {
  if (loading.value || submitting.value || loadFailed.value) return
  submitting.value = true
  error.value = ''
  try {
    const basic = {
      username: form.username.trim(),
      nickname: form.nickname.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      gender: form.gender,
      enabled: form.enabled,
      remark: form.remark.trim(),
    }
    if (props.user) {
      const id = props.user.id
      await updateUser({ ...basic, id })
      const results = await Promise.allSettled([
        assignUserRoles(id, [...form.roleIds]),
        assignUserDepts(id, [...form.deptIds]),
      ])
      const failed = results.flatMap((result, index) =>
        result.status === 'rejected' ? [index === 0 ? '角色' : '部门'] : []
      )
      if (failed.length) throw new Error(`基本资料已保存，${failed.join('、')}保存失败，请重试。`)
    } else {
      await createUser({ ...basic, password: form.password, roleIds: [...form.roleIds], deptIds: [...form.deptIds] })
    }
    emit('saved')
    emit('update:open', false)
  } catch (cause) {
    error.value = getRequestErrorMessage(cause, '保存失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="setOpen">
    <DialogContent
      class="headless-ui tw:max-h-[90dvh] tw:overflow-y-auto tw:bg-card tw:p-0 tw:sm:max-w-2xl"
      :show-close-button="!submitting"
      @interact-outside.prevent
      @escape-key-down="
        (event) => {
          if (submitting) event.preventDefault()
        }
      "
      @close-auto-focus="
        (event) => {
          event.preventDefault()
          emit('restoreFocus')
        }
      "
    >
      <DialogHeader class="tw:border-b tw:px-6 tw:py-5 tw:pr-12">
        <DialogTitle class="tw:text-xl">
          {{ isEdit ? '编辑用户' : '新增用户' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEdit ? `管理 ${user?.username} 的基本资料与访问权限。` : '创建一个账号，并为其分配角色与部门。' }}
        </DialogDescription>
      </DialogHeader>
      <div
        v-if="loading"
        role="status"
        class="tw:flex tw:items-center tw:justify-center tw:gap-2 tw:px-6 tw:py-16 tw:text-muted-foreground"
      >
        <RefreshOutline class="tw:size-4 tw:animate-spin" />
        正在读取用户资料…
      </div>
      <form v-else :id="`${fieldId}-form`" class="tw:grid tw:gap-6 tw:px-6 tw:pb-1" @submit.prevent="submit">
        <div
          v-if="error"
          role="alert"
          class="tw:rounded-md tw:border tw:border-destructive/25 tw:bg-destructive/5 tw:p-3 tw:text-sm tw:text-destructive"
        >
          {{ error }}
          <Button v-if="loadFailed" type="button" variant="outline" size="sm" class="tw:ml-3" @click="retryVersion++">
            重新加载
          </Button>
        </div>
        <fieldset :disabled="submitting || loadFailed" class="tw:grid tw:gap-6 tw:disabled:opacity-60">
          <div class="tw:grid tw:gap-4 tw:sm:grid-cols-2">
            <div class="tw:grid tw:gap-2">
              <Label :for="`${fieldId}-username`">
                用户名
                <span class="tw:text-destructive">*</span>
              </Label>
              <Input
                :id="`${fieldId}-username`"
                v-model="form.username"
                name="username"
                required
                minlength="2"
                maxlength="20"
                pattern="[a-zA-Z0-9_]{2,20}"
                title="2–20 位字母、数字或下划线"
                :disabled="isEdit"
                autocomplete="off"
                placeholder="例如 zhangsan"
              />
              <p class="tw:text-xs tw:text-muted-foreground">
                {{ isEdit ? '用户名创建后不可修改。' : '2–20 位字母、数字或下划线。' }}
              </p>
            </div>
            <div v-if="!isEdit" class="tw:grid tw:content-start tw:gap-2">
              <Label :for="`${fieldId}-password`">
                初始密码
                <span class="tw:text-destructive">*</span>
              </Label>
              <Input
                :id="`${fieldId}-password`"
                v-model="form.password"
                type="password"
                name="password"
                autocomplete="new-password"
                required
                minlength="6"
                maxlength="20"
                placeholder="6–20 位密码"
              />
            </div>
            <div class="tw:grid tw:content-start tw:gap-2">
              <Label :for="`${fieldId}-nickname`">昵称</Label>
              <Input
                :id="`${fieldId}-nickname`"
                v-model="form.nickname"
                name="nickname"
                maxlength="30"
                placeholder="用户的显示名称"
              />
            </div>
            <div class="tw:grid tw:gap-2">
              <Label :for="`${fieldId}-email`">邮箱</Label>
              <Input
                :id="`${fieldId}-email`"
                v-model="form.email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
              />
            </div>
            <div class="tw:grid tw:gap-2">
              <Label :for="`${fieldId}-phone`">手机号</Label>
              <Input
                :id="`${fieldId}-phone`"
                v-model="form.phone"
                name="phone"
                type="tel"
                autocomplete="tel"
                pattern="1[3-9][0-9]{9}"
                title="请输入正确的 11 位手机号"
                placeholder="请输入手机号"
              />
            </div>
            <div class="tw:grid tw:gap-2">
              <Label :for="`${fieldId}-gender`">性别</Label>
              <Select v-model="form.gender" :disabled="submitting || loadFailed">
                <SelectTrigger :id="`${fieldId}-gender`" class="tw:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent class="headless-ui">
                  <SelectItem v-for="option in GenderOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="tw:grid tw:gap-4 tw:border-t tw:pt-5 tw:sm:grid-cols-2">
            <fieldset class="tw:min-w-0">
              <legend class="tw:mb-2 tw:text-sm tw:font-medium">分配角色</legend>
              <div class="tw:grid tw:max-h-36 tw:gap-2 tw:overflow-y-auto tw:rounded-md tw:border tw:p-3">
                <label
                  v-for="role in roles"
                  :key="role.id"
                  class="tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:text-sm"
                >
                  <Checkbox
                    :model-value="form.roleIds.includes(role.id)"
                    :disabled="!role.enabled || submitting || loadFailed"
                    @update:model-value="toggleAssignment('roleIds', role.id, $event === true)"
                  />
                  {{ role.roleName }}
                  <span v-if="!role.enabled" class="tw:text-xs tw:text-muted-foreground">已停用</span>
                </label>
                <p v-if="!roles.length" class="tw:text-sm tw:text-muted-foreground">暂无可分配的角色</p>
              </div>
            </fieldset>
            <fieldset class="tw:min-w-0">
              <legend class="tw:mb-2 tw:text-sm tw:font-medium">所属部门</legend>
              <div class="tw:grid tw:max-h-36 tw:gap-2 tw:overflow-y-auto tw:rounded-md tw:border tw:p-3">
                <label
                  v-for="dept in departments"
                  :key="dept.id"
                  class="tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:text-sm"
                >
                  <Checkbox
                    :model-value="form.deptIds.includes(dept.id)"
                    :disabled="!dept.enabled || submitting || loadFailed"
                    @update:model-value="toggleAssignment('deptIds', dept.id, $event === true)"
                  />
                  {{ dept.label }}
                  <span v-if="!dept.enabled" class="tw:text-xs tw:text-muted-foreground">已停用</span>
                </label>
                <p v-if="!departments.length" class="tw:text-sm tw:text-muted-foreground">暂无可分配的部门</p>
              </div>
              <p class="tw:mt-2 tw:text-xs tw:text-muted-foreground">可多选，按勾选项分配。</p>
            </fieldset>
          </div>
          <div class="tw:flex tw:items-center tw:justify-between tw:rounded-lg tw:bg-muted/60 tw:p-4">
            <div>
              <Label :for="`${fieldId}-enabled`">账号状态</Label>
              <p class="tw:mt-1 tw:text-xs tw:text-muted-foreground">
                {{ form.enabled ? '账号已启用，可正常登录。' : '账号已停用，将无法登录。' }}
              </p>
            </div>
            <Switch :id="`${fieldId}-enabled`" v-model="form.enabled" :disabled="submitting || loadFailed" />
          </div>
          <div class="tw:grid tw:gap-2">
            <Label :for="`${fieldId}-remark`">备注</Label>
            <Textarea
              :id="`${fieldId}-remark`"
              v-model="form.remark"
              name="remark"
              :rows="2"
              placeholder="补充说明（选填）"
            />
          </div>
        </fieldset>
      </form>
      <DialogFooter class="tw:border-t tw:bg-muted/30 tw:px-6 tw:py-4">
        <Button type="button" variant="outline" :disabled="submitting" @click="setOpen(false)">取消</Button>
        <Button type="submit" :form="`${fieldId}-form`" :disabled="loading || submitting || loadFailed">
          <RefreshOutline v-if="submitting" class="tw:size-4 tw:animate-spin" />
          {{ submitting ? '正在保存…' : '保存用户' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
