<script setup lang="ts">
import RaySearchForm from '@/components/common/RaySearchForm.vue'
import { MonitorSmartphone, RotateCcw, Search } from '@lucide/vue'
import { computed, onMounted, shallowRef } from 'vue'
import { getOnlineSessionPage, kickBySessionId, kickByUserId, type OnlineUser } from '@/api/online'
import { useSessionStore } from '@/stores/session'
import { usePagedList } from '@/composables/usePagedList'
import { failureMessage } from '@/utils/failure'
import RayTable from '@/components/common/RayTable.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  ONLINE_DATA_COLUMNS,
  formatLoginTime,
  onlineCellClass,
  onlineQueryError,
  toOnlineQuery,
} from './online-query'

interface KickTarget {
  mode: 'session' | 'user'
  sessionId: string
  userId: number
  username: string
}

const session = useSessionStore()
const can = (code: string) => session.can(code)

const draftStart = shallowRef('')
const draftEnd = shallowRef('')
const appliedStart = shallowRef('')
const appliedEnd = shallowRef('')
const filterError = shallowRef('')
const kickOpen = shallowRef(false)
const kickTarget = shallowRef<KickTarget | null>(null)
const kickError = shallowRef('')
const kicking = shallowRef(false)
let kickToken = 0
let closingKick = false

const {
  rows,
  total,
  pageIndex,
  pageSize,
  loading,
  errorMessage,
  load,
  search,
  changePage,
  changePageSize,
} = usePagedList<OnlineUser>({
  fetchPage: (input) =>
    getOnlineSessionPage(
      toOnlineQuery({
        pageIndex: input.pageIndex,
        pageSize: input.pageSize,
        startTime: appliedStart.value,
        endTime: appliedEnd.value,
      }),
    ),
  fallbackMessage: '在线用户加载失败',
})

const currentUserId = computed(() => session.profile?.userId ?? null)
const rowKey = (row: OnlineUser) => row.sessionId

function applySearch() {
  const message = onlineQueryError(draftStart.value, draftEnd.value)
  if (message) {
    filterError.value = message
    return
  }
  filterError.value = ''
  appliedStart.value = draftStart.value
  appliedEnd.value = draftEnd.value
  void search()
}

function resetFilters() {
  draftStart.value = ''
  draftEnd.value = ''
  filterError.value = ''
  appliedStart.value = ''
  appliedEnd.value = ''
  void search()
}

function openKick(row: OnlineUser, mode: KickTarget['mode']) {
  kickToken += 1
  kickTarget.value = {
    mode,
    sessionId: row.sessionId,
    userId: row.userId,
    username: row.username,
  }
  kickError.value = ''
  kickOpen.value = true
}

function onKickOpen(open: boolean) {
  if (open) return
  kickOpen.value = false
  if (closingKick) {
    closingKick = false
    return
  }
  kickToken += 1
  kicking.value = false
}

async function confirmKick() {
  const token = kickToken
  const target = kickTarget.value
  if (!target) return
  kicking.value = true
  kickError.value = ''
  try {
    if (target.mode === 'session') {
      await kickBySessionId(target.sessionId)
    } else {
      await kickByUserId(target.userId)
    }
    if (token !== kickToken) {
      await load()
      return
    }
    closingKick = true
    kickOpen.value = false
    await load()
    if (rows.value.length === 0 && pageIndex.value > 0) {
      await changePage(pageIndex.value - 1)
    }
  } catch (error) {
    if (token === kickToken) kickError.value = failureMessage(error, '下线失败，请稍后重试')
  } finally {
    if (token === kickToken) kicking.value = false
  }
}

function kickCopy(target: KickTarget): string {
  const current = target.userId === currentUserId.value
  if (target.mode === 'session') {
    return current
      ? `将下线 ${target.username} 的这个会话。这是当前账号，如果下线的是本次登录，页面会回到登录页。`
      : `将下线 ${target.username} 的这个会话。`
  }
  return current
    ? `将下线 ${target.username} 的全部会话。这是当前账号，下线后页面会回到登录页。`
    : `将下线 ${target.username} 的全部会话。`
}

onMounted(() => {
  void load()
})
</script>

<template>
  <RayTable
    fill
    :selectable="false"
    :columns="ONLINE_DATA_COLUMNS"
    :rows="rows"
    :total="total"
    :page-index="pageIndex"
    :page-size="pageSize"
    :loading="loading"
    :error-message="errorMessage"
    :row-key="rowKey"
    :cell-class="onlineCellClass"
    @update:page-index="changePage"
    @update:page-size="changePageSize"
    @retry="load()"
  >
    <template #filters>
      <RaySearchForm @submit="applySearch()">
        <Field
          orientation="horizontal"
          class="ray-search-field-date"
          :data-invalid="filterError ? true : undefined"
        >
          <FieldLabel for="filter-online-start">起始时间</FieldLabel>
          <Input
            id="filter-online-start"
            v-model="draftStart"
            type="datetime-local"
            :aria-invalid="filterError ? true : undefined"
            :aria-describedby="filterError ? 'filter-online-error' : undefined"
          />
        </Field>
        <Field
          orientation="horizontal"
          class="ray-search-field-date"
          :data-invalid="filterError ? true : undefined"
        >
          <FieldLabel for="filter-online-end">结束时间</FieldLabel>
          <Input
            id="filter-online-end"
            v-model="draftEnd"
            type="datetime-local"
            :aria-invalid="filterError ? true : undefined"
            :aria-describedby="filterError ? 'filter-online-error' : undefined"
          />
        </Field>
        <template #actions>
          <Button type="submit" :disabled="loading">
            <Search data-icon="inline-start" />
            查询
          </Button>
          <Button type="button" variant="ghost" :disabled="loading" @click="resetFilters()">
            <RotateCcw data-icon="inline-start" />
            重置
          </Button>
        </template>
        <template v-if="filterError" #feedback>
          <FieldError id="filter-online-error">
            {{ filterError }}
          </FieldError>
        </template>
      </RaySearchForm>
    </template>

    <template #empty="{ errorMessage: loadError }">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MonitorSmartphone />
          </EmptyMedia>
          <EmptyTitle>
            {{ loadError ? '这次没有加载到在线会话' : '没有符合条件的在线会话' }}
          </EmptyTitle>
          <EmptyDescription>
            {{ loadError ? '稍后重试，或调整时间范围后再查询。' : '调整时间范围后再查询。' }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </template>

    <template #cell-username="{ row }">
      <span class="flex min-w-28 items-center gap-2">
        <span class="truncate font-medium text-foreground">{{ row.username }}</span>
        <Badge v-if="row.userId === currentUserId" variant="secondary" class="font-normal">
          当前账号
        </Badge>
      </span>
    </template>

    <template #cell-loginTime="{ row }">
      <span :class="onlineCellClass('loginTime')">{{ formatLoginTime(row.loginTime) }}</span>
    </template>

    <template #cell-actions="{ row }">
      <div v-if="can('system:online:kick')" class="flex min-w-40 flex-nowrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="kicking"
          @click="openKick(row, 'session')"
        >
          下线会话
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="kicking"
          @click="openKick(row, 'user')"
        >
          下线用户
        </Button>
      </div>
    </template>
  </RayTable>

  <AlertDialog :open="kickOpen" @update:open="onKickOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>强制下线</AlertDialogTitle>
        <AlertDialogDescription v-if="kickTarget">
          {{ kickCopy(kickTarget) }}
          <span v-if="kickError" class="text-destructive mt-2 block">{{ kickError }}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="kicking">取消</AlertDialogCancel>
        <Button type="button" variant="destructive" :disabled="kicking" @click="confirmKick">
          <Spinner v-if="kicking" />
          下线
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
