<template>
  <div class="online-page">
    <ProTable
      ref="tableRef"
      :columns="columns"
      :request="requestOnlineList"
      show-index
    >
      <!-- 操作列 -->
      <template #cell-actions="{ row }">
        <NSpace :size="4" :wrap="false">
          <ConfirmButton
            text
            type="error"
            confirm-text="确定要强制下线该会话吗？"
            @confirm="handleKickToken(row as OnlineRow)"
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
import { getOnlineList, kickByTokenId, kickByUserId, type OnlineUser } from '@/api/online'

defineOptions({
  name: 'OnlinePage',
})

type OnlineRow = OnlineUser & Record<string, unknown>

const message = useMessage()
const tableRef = ref<ProTableExpose | null>(null)

async function requestOnlineList(params: ProTableRequestParams) {
  const list = await getOnlineList({
    username: params.username as string | undefined,
    loginIp: params.loginIp as string | undefined,
  })
  return {
    records: list as unknown as Record<string, unknown>[],
    total: list.length,
    current: 1,
    size: list.length,
    pages: 1,
  }
}

const columns: ProTableColumn[] = [
  {
    key: 'username',
    title: '用户名',
    width: 140,
    search: { component: 'input' },
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
    search: { component: 'input' },
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
  },
  {
    key: 'actions',
    title: '操作',
    width: 220,
    fixed: 'right',
    align: 'center',
  },
]

async function handleKickToken(row: OnlineRow) {
  await kickByTokenId(row.tokenId)
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
