<template>
  <div class="online-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestOnlineSessions"
      row-key="sessionId"
      show-index
    >
      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4" :wrap="false">
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要强制下线该会话吗？"
            @confirm="handleKickSession(row as OnlineRow)"
          >
            <template #icon>
              <NIcon><LogOutOutline /></NIcon>
            </template>
            强制下线
          </ConfirmButton>
          <NTooltip trigger="hover" placement="top">
            <template #trigger>
              <ConfirmButton
                text
                type="warning"
                confirm-text="确定要踢出该用户的所有会话吗？"
                @confirm="handleKickUser(row as OnlineRow)"
              >
                <template #icon>
                  <NIcon><BanOutline /></NIcon>
                </template>
                踢出全部
              </ConfirmButton>
            </template>
            踢出该用户名下的所有在线会话
          </NTooltip>
        </NSpace>
      </template>
    </ProTable>
  </div>
</template>

<script setup lang="ts">
import { NIcon, NSpace, NTooltip } from 'naive-ui'
import { LogOutOutline, BanOutline } from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose, ProTableRequestParams } from '@/components/common/ProTable/types'
import { getOnlineSessionPage, kickBySessionId, kickByUserId, type OnlineUser } from '@/api/online'

defineOptions({
  name: 'OnlinePage',
})

type OnlineRow = OnlineUser & Record<string, unknown>

const message = useMessage()
const tableRef = ref<ProTableExpose | null>(null)

/**
 * 将日期范围的时间戳转为后端接受的 ISO 本地日期时间。
 */
function formatLocalDateTime(timestamp: number, endOfDay = false) {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return endOfDay ? `${day}T23:59:59.999` : `${day}T00:00:00`
}

async function requestOnlineSessions(params: ProTableRequestParams) {
  const range = params.loginTime as [number, number] | undefined
  const result = await getOnlineSessionPage({
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    startTime: range?.[0] != null ? formatLocalDateTime(range[0]) : undefined,
    endTime: range?.[1] != null ? formatLocalDateTime(range[1], true) : undefined,
  })
  return {
    ...result,
    records: result.records as unknown as Record<string, unknown>[],
  }
}

const columns: ProTableColumn[] = [
  {
    key: 'username',
    title: '用户名',
    width: 140,
  },
  {
    key: 'nickname',
    title: '昵称',
    width: 120,
  },
  {
    key: 'loginIp',
    title: '登录 IP',
    width: 160,
  },
  {
    key: 'browser',
    title: '浏览器',
    minWidth: 160,
    ellipsis: true,
  },
  {
    key: 'os',
    title: '操作系统',
    width: 140,
    ellipsis: true,
  },
  {
    key: 'loginTime',
    title: '登录时间',
    width: 180,
    search: { component: 'date-range', label: '登录时间' },
  },
  {
    key: 'actions',
    title: '操作',
    width: 220,
    fixed: 'right',
    align: 'center',
  },
]

async function handleKickSession(row: OnlineRow) {
  await kickBySessionId(row.sessionId)
  message.success('已强制下线该会话')
  tableRef.value?.refresh()
}

async function handleKickUser(row: OnlineRow) {
  await kickByUserId(row.userId)
  message.success('已踢出该用户所有会话')
  tableRef.value?.refresh()
}
</script>

<style scoped lang="scss">
.online-page {
  padding: $spacing-lg;
}
</style>
