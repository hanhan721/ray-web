<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { getOnlineSessionPage, kickBySessionId, kickByUserId, type OnlineUser } from '@/api/online'
import { RequestError } from '@/utils/request'
import { useSessionStore } from '@/stores/session'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ONLINE_PAGE_SIZES,
  formatLoginTime,
  onlineQueryError,
  pageIndexFromResponse,
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

const rows = shallowRef<OnlineUser[]>([])
const total = shallowRef(0)
const pageIndex = shallowRef(0)
const pageSize = shallowRef<(typeof ONLINE_PAGE_SIZES)[number]>(10)
const draftStart = shallowRef('')
const draftEnd = shallowRef('')
const appliedStart = shallowRef('')
const appliedEnd = shallowRef('')
const loading = shallowRef(false)
const loadError = shallowRef('')
const filterError = shallowRef('')
const kickOpen = shallowRef(false)
const kickTarget = shallowRef<KickTarget | null>(null)
const kickError = shallowRef('')
const kicking = shallowRef(false)
let generation = 0
let kickToken = 0
let closingKick = false

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const currentUserId = computed(() => session.profile?.userId ?? null)

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof RequestError && error.message) return error.message
  return fallback
}

async function load() {
  const requestId = ++generation
  loading.value = true
  loadError.value = ''
  try {
    const page = await getOnlineSessionPage(
      toOnlineQuery({
        pageIndex: pageIndex.value,
        pageSize: pageSize.value,
        startTime: appliedStart.value,
        endTime: appliedEnd.value,
      }),
      { showErrorMessage: false },
    )
    if (requestId !== generation) return
    rows.value = page.records ?? []
    total.value = page.total ?? 0
    if (typeof page.current === 'number') pageIndex.value = pageIndexFromResponse(page.current)
    if ((ONLINE_PAGE_SIZES as readonly number[]).includes(page.size)) {
      pageSize.value = page.size as (typeof ONLINE_PAGE_SIZES)[number]
    }
  } catch (error) {
    if (requestId !== generation) return
    rows.value = []
    total.value = 0
    loadError.value = failureMessage(error, '在线用户加载失败')
  } finally {
    if (requestId === generation) loading.value = false
  }
}

function search() {
  const message = onlineQueryError(draftStart.value, draftEnd.value)
  if (message) {
    filterError.value = message
    return
  }
  filterError.value = ''
  appliedStart.value = draftStart.value
  appliedEnd.value = draftEnd.value
  pageIndex.value = 0
  void load()
}

function changePageSize(event: Event) {
  const value = Number(
    event.target instanceof HTMLSelectElement ? event.target.value : pageSize.value,
  )
  if ((ONLINE_PAGE_SIZES as readonly number[]).includes(value)) {
    pageSize.value = value as (typeof ONLINE_PAGE_SIZES)[number]
  }
  pageIndex.value = 0
  void load()
}

function changePage(next: number) {
  pageIndex.value = next
  void load()
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
      await kickBySessionId(target.sessionId, { showErrorMessage: false })
    } else {
      await kickByUserId(target.userId, { showErrorMessage: false })
    }
    if (token !== kickToken) {
      await load()
      return
    }
    closingKick = true
    kickOpen.value = false
    await load()
    if (rows.value.length === 0 && pageIndex.value > 0) {
      pageIndex.value -= 1
      await load()
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
  <section class="flex flex-col gap-4">
    <header>
      <h1 class="text-lg font-medium">在线用户</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        按登录时间从新到旧显示。下线当前登录后需要重新登录。
      </p>
    </header>

    <form class="flex flex-wrap items-end gap-3" @submit.prevent="search">
      <Field class="w-52">
        <FieldLabel for="filter-online-start">起始时间</FieldLabel>
        <input
          id="filter-online-start"
          v-model="draftStart"
          type="datetime-local"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        />
      </Field>
      <Field class="w-52">
        <FieldLabel for="filter-online-end">结束时间</FieldLabel>
        <input
          id="filter-online-end"
          v-model="draftEnd"
          type="datetime-local"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
        />
      </Field>
      <Button type="submit" :disabled="loading">查询</Button>
    </form>

    <p class="text-muted-foreground text-sm">
      {{ loading ? '正在加载' : `共 ${total} 个会话` }}
    </p>

    <p v-if="filterError || loadError" role="alert" class="text-destructive text-sm">
      {{ filterError || loadError }}
      <Button
        v-if="loadError"
        type="button"
        variant="outline"
        size="sm"
        class="ml-2"
        @click="load()"
      >
        重试
      </Button>
    </p>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">账号</TableHead>
          <TableHead scope="col">昵称</TableHead>
          <TableHead scope="col">登录 IP</TableHead>
          <TableHead scope="col">浏览器</TableHead>
          <TableHead scope="col">系统</TableHead>
          <TableHead scope="col">登录时间</TableHead>
          <TableHead scope="col">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="!loading && rows.length === 0" :colspan="7">
          {{ loadError ? '这次没有加载到在线会话。' : '没有符合条件的在线会话。' }}
        </TableEmpty>
        <TableRow v-for="row in rows" :key="row.sessionId">
          <TableCell>
            {{ row.username }}
            <span v-if="row.userId === currentUserId" class="text-muted-foreground ml-2"
              >当前账号</span
            >
          </TableCell>
          <TableCell>{{ row.nickname }}</TableCell>
          <TableCell>{{ row.loginIp }}</TableCell>
          <TableCell>{{ row.browser }}</TableCell>
          <TableCell>{{ row.os }}</TableCell>
          <TableCell>{{ formatLoginTime(row.loginTime) }}</TableCell>
          <TableCell>
            <div v-if="can('system:online:kick')" class="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="kicking"
                @click="openKick(row, 'session')"
              >
                下线此会话
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="kicking"
                @click="openKick(row, 'user')"
              >
                下线该用户
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <Field class="w-28">
        <FieldLabel for="online-page-size">每页</FieldLabel>
        <select
          id="online-page-size"
          class="border-input bg-input/20 h-7 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
          :value="pageSize"
          @change="changePageSize"
        >
          <option v-for="size in ONLINE_PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
        </select>
      </Field>
      <div class="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex <= 0 || loading"
          @click="changePage(pageIndex - 1)"
        >
          上一页
        </Button>
        <span class="text-sm">{{ pageIndex + 1 }} / {{ pageCount }}</span>
        <Button
          type="button"
          variant="outline"
          :disabled="pageIndex + 1 >= pageCount || loading"
          @click="changePage(pageIndex + 1)"
        >
          下一页
        </Button>
      </div>
    </div>

    <AlertDialog :open="kickOpen" @update:open="onKickOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>强制下线</AlertDialogTitle>
          <AlertDialogDescription v-if="kickTarget">
            {{ kickCopy(kickTarget) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p v-if="kickError" role="alert" class="text-destructive text-sm">{{ kickError }}</p>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="kicking">取消</AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="kicking" @click="confirmKick">
            <Spinner v-if="kicking" />
            {{ kicking ? '正在下线' : '下线' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
