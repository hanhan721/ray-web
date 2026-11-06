<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { PaginationState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import {
  AddOutline,
  ArrowBackOutline,
  CreateOutline,
  LockClosedOutline,
  PeopleOutline,
  RefreshOutline,
  SearchOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { deleteUsers, getUserPage, resetUserPassword, updateUserStatus, type SysUser, type UserQuery } from '@/api/user'
import { GenderLabel } from '@/types/enums'
import { getRequestErrorMessage } from '@/utils/errorMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ProTableHeadless from '@/components/common/ProTableHeadless/index.vue'
import type { HeadlessColumn } from '@/components/common/ProTableHeadless/features'
import UserEditor from './UserEditor.vue'
import '@/styles/headless.css'

defineOptions({ name: 'UserHeadlessPage' })
const emit = defineEmits<{ compare: [] }>()
const message = useMessage()
const data = ref<SysUser[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 })
const sorting = ref<SortingState>([{ id: 'createTime', desc: true }])
const selection = ref<RowSelectionState>({})
const search = reactive({ username: '', status: 'all' })
const filters = ref<Pick<UserQuery, 'username' | 'enabled'>>({})
const editorOpen = ref(false)
const editingUser = ref<SysUser | null>(null)
const selectedIds = computed(() => Object.keys(selection.value).map(Number))
let requestVersion = 0
let focusTarget: HTMLElement | null = null

const columns: HeadlessColumn<SysUser>[] = [
  { accessorKey: 'username', header: '用户', enableSorting: false, enableHiding: false },
  { id: 'contact', header: '联系方式', enableSorting: false },
  {
    accessorKey: 'gender',
    header: '性别',
    enableSorting: false,
    cell: (info) => GenderLabel[info.row.original.gender] || '—',
  },
  { accessorKey: 'enabled', header: '状态', enableSorting: false },
  {
    accessorKey: 'lastLoginTime',
    header: '最后登录',
    enableSorting: false,
    cell: (info) => info.getValue() || '尚未登录',
  },
  { accessorKey: 'createTime', header: '创建时间', enableSorting: true, cell: (info) => info.getValue() || '—' },
  { id: 'actions', header: '操作', enableSorting: false, enableHiding: false },
]

async function load() {
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  selection.value = {}
  const sort = sorting.value[0]
  const query: UserQuery = {
    ...filters.value,
    pageNum: pagination.value.pageIndex + 1,
    pageSize: pagination.value.pageSize,
    orderBy: sort?.id,
    asc: sort ? !sort.desc : undefined,
  }
  try {
    const result = await getUserPage(query)
    if (version !== requestVersion) return
    const lastPageIndex = Math.max(0, Math.ceil(result.total / query.pageSize) - 1)
    if (pagination.value.pageIndex > lastPageIndex) {
      pagination.value = { ...pagination.value, pageIndex: lastPageIndex }
      return
    }
    data.value = result.records
    total.value = result.total
  } catch (cause) {
    if (version !== requestVersion) return
    data.value = []
    total.value = 0
    error.value = getRequestErrorMessage(cause, '用户列表加载失败，请重试')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

watch(() => [pagination.value.pageIndex, pagination.value.pageSize, sorting.value, filters.value], load, {
  immediate: true,
})
onBeforeUnmount(() => {
  requestVersion++
})

function applyFilters() {
  pagination.value = { ...pagination.value, pageIndex: 0 }
  filters.value = {
    username: search.username.trim() || undefined,
    enabled: search.status === 'all' ? undefined : search.status === 'enabled',
  }
}

function resetFilters() {
  search.username = ''
  search.status = 'all'
  applyFilters()
}

function openEditor(user: SysUser | null) {
  focusTarget = document.activeElement as HTMLElement | null
  editingUser.value = user
  editorOpen.value = true
}

function restoreFocus() {
  focusTarget?.focus()
}

function handleSaved() {
  message.success(editingUser.value ? '用户资料已保存' : '用户创建成功')
  load()
}

type UserAction = { kind: 'delete'; ids: number[] } | { kind: 'status' | 'password'; user: SysUser }
const action = ref<UserAction | null>(null)
const actionLoading = ref(false)
const actionError = ref('')
const password = reactive({ value: '', confirmation: '' })
const actionTitle = computed(() =>
  action.value?.kind === 'delete' ? '删除用户' : action.value?.kind === 'status' ? '修改账号状态' : '重置密码'
)
const actionDescription = computed(() => {
  const current = action.value
  if (!current) return ''
  if (current.kind === 'delete') return `确定删除选中的 ${current.ids.length} 位用户吗？删除后无法恢复。`
  if (current.kind === 'status')
    return `确定${current.user.enabled ? '停用' : '启用'} ${current.user.username} 的账号吗？`
  return `为 ${current.user.username} 设置新密码。`
})

function openAction(next: UserAction) {
  focusTarget = document.activeElement as HTMLElement | null
  password.value = ''
  password.confirmation = ''
  actionError.value = ''
  action.value = next
}

function closeAction(open: boolean) {
  if (!open && !actionLoading.value) action.value = null
}

async function confirmAction() {
  const current = action.value
  if (!current || actionLoading.value) return
  if (current.kind === 'password' && password.value !== password.confirmation) {
    actionError.value = '两次输入的密码不一致'
    return
  }
  actionLoading.value = true
  actionError.value = ''
  try {
    if (current.kind === 'delete') await deleteUsers([...current.ids])
    else if (current.kind === 'status') await updateUserStatus(current.user.id, !current.user.enabled)
    else await resetUserPassword(current.user.id, password.value)
    message.success(
      current.kind === 'delete' ? '删除成功' : current.kind === 'status' ? '账号状态已更新' : '密码已重置'
    )
    action.value = null
    await load()
  } catch (cause) {
    actionError.value = getRequestErrorMessage(cause, '操作失败，请重试')
  } finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <main class="headless-ui tw:mx-auto tw:w-full tw:max-w-[1600px] tw:space-y-6 tw:p-2 tw:sm:p-5">
    <header class="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4">
      <div>
        <p class="tw:mb-2 tw:text-xs tw:font-medium tw:tracking-wider tw:text-muted-foreground">
          系统管理 / 用户与访问
        </p>
        <h1 class="tw:text-3xl tw:font-semibold tw:tracking-tight">用户管理</h1>
        <p class="tw:mt-2 tw:text-sm tw:text-muted-foreground">管理团队成员、账号状态与访问权限。</p>
      </div>
      <div class="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <Button type="button" variant="outline" @click="emit('compare')">
          <ArrowBackOutline class="tw:size-4" />
          查看原版
        </Button>
        <Button type="button" @click="openEditor(null)">
          <AddOutline class="tw:size-4" />
          新增用户
        </Button>
      </div>
    </header>

    <section class="tw:overflow-hidden tw:rounded-xl tw:border tw:bg-card tw:shadow-xs">
      <form
        class="tw:flex tw:flex-wrap tw:items-end tw:gap-3 tw:border-b tw:p-5"
        aria-label="用户筛选"
        @submit.prevent="applyFilters"
      >
        <div class="tw:grid tw:w-full tw:min-w-0 tw:gap-2 tw:sm:min-w-48 tw:sm:flex-1 tw:md:max-w-80">
          <Label for="user-search">用户名</Label>
          <div class="tw:relative">
            <SearchOutline
              class="tw:pointer-events-none tw:absolute tw:top-2.5 tw:left-3 tw:size-4 tw:text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="user-search"
              v-model="search.username"
              class="tw:pl-9"
              placeholder="搜索用户名…"
              autocomplete="off"
            />
          </div>
        </div>
        <div class="tw:grid tw:w-full tw:gap-2 tw:sm:w-40">
          <Label for="user-status">账号状态</Label>
          <Select v-model="search.status">
            <SelectTrigger id="user-status" class="tw:w-full">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent class="headless-ui">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">查询</Button>
        <Button type="button" variant="ghost" @click="resetFilters">重置</Button>
        <p
          v-if="filters.username || filters.enabled !== undefined"
          class="tw:ml-auto tw:self-center tw:text-xs tw:text-muted-foreground"
          aria-live="polite"
        >
          当前筛选：{{ filters.username || '全部用户' }} ·
          {{ filters.enabled === undefined ? '全部状态' : filters.enabled ? '启用' : '停用' }}
        </p>
      </form>

      <ProTableHeadless
        v-model:pagination="pagination"
        v-model:sorting="sorting"
        v-model:selection="selection"
        :data="data"
        :columns="columns"
        :total="total"
        :loading="loading"
        :error="error"
        @retry="load"
      >
        <template #toolbar>
          <Button
            v-if="selectedIds.length"
            type="button"
            variant="destructive"
            size="sm"
            :disabled="loading"
            @click="openAction({ kind: 'delete', ids: [...selectedIds] })"
          >
            <TrashOutline class="tw:size-4" />
            删除 {{ selectedIds.length }} 项
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            :disabled="loading"
            aria-label="刷新用户列表"
            @click="load"
          >
            <RefreshOutline class="tw:size-4" :class="loading ? 'tw:animate-spin' : ''" />
          </Button>
        </template>
        <template #cell-username="{ row }">
          <div class="tw:flex tw:items-center tw:gap-3">
            <span
              class="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary/10 tw:text-sm tw:font-semibold tw:text-primary"
              aria-hidden="true"
            >
              {{ (row.nickname || row.username).slice(0, 1).toUpperCase() }}
            </span>
            <div class="tw:min-w-0">
              <p class="tw:max-w-48 tw:truncate tw:font-medium" :title="row.username">
                {{ row.username }}
              </p>
              <p class="tw:mt-0.5 tw:max-w-48 tw:truncate tw:text-xs tw:text-muted-foreground" :title="row.nickname">
                {{ row.nickname || '未设置昵称' }} · #{{ row.id }}
              </p>
            </div>
          </div>
        </template>
        <template #cell-contact="{ row }">
          <p class="tw:max-w-56 tw:truncate" :title="row.email">
            {{ row.email || '—' }}
          </p>
          <p class="tw:mt-1 tw:text-xs tw:tabular-nums tw:text-muted-foreground">
            {{ row.phone || '未填写手机号' }}
          </p>
        </template>
        <template #cell-enabled="{ row }">
          <button
            type="button"
            :disabled="loading"
            :aria-label="`${row.enabled ? '停用' : '启用'}用户 ${row.username}`"
            @click="openAction({ kind: 'status', user: row })"
          >
            <Badge
              variant="outline"
              :class="
                row.enabled
                  ? 'tw:border-transparent tw:bg-[var(--ui-success-bg)] tw:text-[var(--ui-success)]'
                  : 'tw:border-transparent tw:bg-muted tw:text-muted-foreground'
              "
            >
              <span class="tw:size-1.5 tw:rounded-full tw:bg-current"></span>
              {{ row.enabled ? '启用' : '停用' }}
            </Badge>
          </button>
        </template>
        <template #cell-actions="{ row }">
          <div class="tw:flex tw:items-center tw:gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :disabled="loading"
              :aria-label="`编辑用户 ${row.username}`"
              class="tw:text-primary"
              @click="openEditor(row)"
            >
              <CreateOutline class="tw:size-4" />
              编辑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              :disabled="loading"
              :aria-label="`重置 ${row.username} 的密码`"
              @click="openAction({ kind: 'password', user: row })"
            >
              <LockClosedOutline class="tw:size-4 tw:text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              :disabled="loading"
              :aria-label="`删除用户 ${row.username}`"
              class="tw:text-destructive"
              @click="openAction({ kind: 'delete', ids: [row.id] })"
            >
              <TrashOutline class="tw:size-4" />
            </Button>
          </div>
        </template>
      </ProTableHeadless>
    </section>
    <p class="tw:flex tw:items-center tw:gap-2 tw:px-1 tw:text-xs tw:text-muted-foreground">
      <PeopleOutline class="tw:size-4" aria-hidden="true" />
      账号权限由角色与部门共同配置，编辑用户即可调整。
    </p>

    <UserEditor v-model:open="editorOpen" :user="editingUser" @saved="handleSaved" @restore-focus="restoreFocus" />

    <Dialog :open="action !== null" @update:open="closeAction">
      <DialogContent
        class="headless-ui tw:bg-card"
        :show-close-button="!actionLoading"
        @interact-outside.prevent
        @escape-key-down="
          (event) => {
            if (actionLoading) event.preventDefault()
          }
        "
        @close-auto-focus="
          (event) => {
            event.preventDefault()
            restoreFocus()
          }
        "
      >
        <DialogHeader>
          <DialogTitle>{{ actionTitle }}</DialogTitle>
          <DialogDescription>{{ actionDescription }}</DialogDescription>
        </DialogHeader>
        <form id="user-action-form" class="tw:grid tw:gap-4" @submit.prevent="confirmAction">
          <p v-if="actionError" role="alert" class="tw:text-sm tw:text-destructive">
            {{ actionError }}
          </p>
          <template v-if="action?.kind === 'password'">
            <div class="tw:grid tw:gap-2">
              <Label for="user-new-password">新密码</Label>
              <Input
                id="user-new-password"
                v-model="password.value"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                maxlength="20"
                :disabled="actionLoading"
              />
            </div>
            <div class="tw:grid tw:gap-2">
              <Label for="user-confirm-password">确认密码</Label>
              <Input
                id="user-confirm-password"
                v-model="password.confirmation"
                type="password"
                autocomplete="new-password"
                required
                minlength="6"
                maxlength="20"
                :disabled="actionLoading"
              />
            </div>
          </template>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" :disabled="actionLoading" @click="closeAction(false)">取消</Button>
          <Button
            type="submit"
            form="user-action-form"
            :variant="action?.kind === 'delete' ? 'destructive' : 'default'"
            :disabled="actionLoading"
          >
            <RefreshOutline v-if="actionLoading" class="tw:size-4 tw:animate-spin" />
            {{ actionLoading ? '正在处理…' : '确定' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>
</template>
