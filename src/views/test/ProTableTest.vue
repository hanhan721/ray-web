<!--
  ProTable 完整用法演示页面

  覆盖功能：
  - 基础表格 + 分页
  - 搜索表单（input / select / dict-select / date-range）
  - 列渲染：render 函数、dictType 字典、cell 插槽
  - 列配置持久化（pageKey / configLocked / hideInTable）
  - 序号列、固定列、排序列、省略号
  - 工具栏插槽 + 刷新 + 列设置
  - 暴露方法：refresh / reset / getSearchParams
-->
<template>
  <div class="pro-table-test">
    <!-- 1. 基础用法：搜索 + 表格 + 分页 -->
    <NCard title="基础用法">
      <template #header-extra>
        <NSpace>
          <NButton size="small" @click="basicTableRef?.refresh()">
            手动刷新
          </NButton>
          <NButton size="small" @click="basicTableRef?.reset()">
            重置搜索
          </NButton>
          <NButton size="small" @click="handleGetParams">
            获取搜索参数
          </NButton>
        </NSpace>
      </template>

      <ProTable
        ref="basicTableRef"
        :columns="basicColumns"
        :request="mockRequest"
        show-index
      >
        <template #toolbar>
          <NButton type="primary" @click="message.info('点击新增')">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            新增
          </NButton>
        </template>

        <!-- cell 插槽渲染 -->
        <template #cell-actions="{ row }">
          <NSpace :size="4">
            <NButton text type="primary" @click="message.info(`编辑: ${(row as MockRow).username}`)">
              编辑
            </NButton>
            <NButton text type="error" @click="message.warning(`删除: ${(row as MockRow).username}`)">
              删除
            </NButton>
          </NSpace>
        </template>
      </ProTable>

      <NAlert v-if="searchParams" type="info" style="margin-top: 12px">
        当前搜索参数: {{ JSON.stringify(searchParams) }}
      </NAlert>
    </NCard>

    <!-- 2. 列配置持久化：pageKey + configLocked + hideInTable -->
    <NCard title="列配置持久化" style="margin-top: 16px">
      <NDescriptions :column="1" label-placement="left" size="small" style="margin-bottom: 12px">
        <NDescriptionsItem label="pageKey">
          传入 page-key 即开启列配置持久化，工具栏出现齿轮按钮
        </NDescriptionsItem>
        <NDescriptionsItem label="configLocked">
          操作列标记为 configLocked，在列设置中锁定不可修改
        </NDescriptionsItem>
        <NDescriptionsItem label="hideInTable">
          备注列默认隐藏，可在列设置中开启
        </NDescriptionsItem>
        <NDescriptionsItem label="列宽拖拽">
          开启 pageKey 后非锁定列可拖拽调宽，宽度自动持久化
        </NDescriptionsItem>
      </NDescriptions>

      <ProTable
        :columns="persistColumns"
        :request="mockRequest"
        page-key="test:persist"
        show-index
      >
        <template #toolbar>
          <NButton type="primary" @click="message.info('新增')">
            新增
          </NButton>
        </template>

        <template #cell-enabled="{ row }">
          <NTag :type="(row as MockRow).enabled ? 'success' : 'error'" size="small">
            {{ (row as MockRow).enabled ? '启用' : '禁用' }}
          </NTag>
        </template>

        <template #cell-actions="{ row }">
          <NButton text type="primary" @click="message.info(`操作: ${(row as MockRow).username}`)">
            详情
          </NButton>
        </template>
      </ProTable>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import type { ProTableColumn, ProTableExpose } from '@/components/common/ProTable/types'

defineOptions({
  name: 'ProTableTest',
})

const message = useMessage()

// ============ 通用 Mock 数据 ============

interface MockRow extends Record<string, unknown> {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  gender: string
  enabled: boolean
  remark: string
  createTime: string
}

async function mockRequest(params: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const pageNum = (params.pageNum as number) || 1
  const pageSize = (params.pageSize as number) || 10
  const total = 56

  const records: MockRow[] = []
  const start = (pageNum - 1) * pageSize
  const genders = ['MALE', 'FEMALE', 'SECRET']
  for (let i = 0; i < pageSize && start + i < total; i++) {
    const idx = start + i + 1
    records.push({
      id: idx,
      username: `user${idx}`,
      nickname: `用户${idx}`,
      email: `user${idx}@example.com`,
      phone: `138000${String(idx).padStart(5, '0')}`,
      gender: genders[idx % 3],
      enabled: idx % 4 !== 0,
      remark: idx % 5 === 0 ? `这是一段很长的备注文本，用于测试省略号功能，编号 ${idx}` : '',
      createTime: `2025-0${(idx % 9) + 1}-${String((idx % 28) + 1).padStart(2, '0')} 12:00:00`,
    })
  }

  return { records, total, current: pageNum, size: pageSize, pages: Math.ceil(total / pageSize) }
}

// ============ 1. 基础用法 ============

const basicTableRef = ref<ProTableExpose | null>(null)
const searchParams = ref<Record<string, unknown> | null>(null)

function handleGetParams() {
  searchParams.value = basicTableRef.value?.getSearchParams() ?? null
}

const basicColumns: ProTableColumn<MockRow>[] = [
  {
    key: 'username',
    title: '用户名',
    width: 120,
    // search: true 使用 key 对应的默认 input 搜索
    search: true,
  },
  {
    key: 'nickname',
    title: '昵称',
    width: 120,
  },
  {
    key: 'email',
    title: '邮箱',
    minWidth: 180,
    // 省略号 + tooltip（默认开启）
    ellipsis: true,
  },
  {
    key: 'gender',
    title: '性别',
    width: 80,
    align: 'center',
    // dictType：自动使用 DictTag 渲染
    dictType: 'sys_gender',
    // search 对象形式：指定 dict-select 搜索
    search: { component: 'dict-select', dictType: 'sys_gender' },
  },
  {
    key: 'enabled',
    title: '状态',
    width: 100,
    align: 'center',
    // render 函数：自定义渲染
    render: (row) =>
      h(NTag, { type: row.enabled ? 'success' : 'error', size: 'small' }, () => (row.enabled ? '启用' : '禁用')),
    // search 对象形式：指定 select + options
    search: {
      component: 'select',
      props: {
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false },
        ],
      },
    },
  },
  {
    key: 'createTime',
    title: '创建时间',
    width: 180,
    // sorter：支持排序
    sorter: true,
    // search 对象形式：日期范围
    search: { component: 'date-range', label: '创建日期' },
  },
  {
    key: 'actions',
    title: '操作',
    width: 150,
    // fixed：固定在右侧
    fixed: 'right',
    align: 'center',
  },
]

// ============ 2. 列配置持久化 ============

const persistColumns: ProTableColumn<MockRow>[] = [
  {
    key: 'username',
    title: '用户名',
    width: 120,
    search: true,
  },
  {
    key: 'nickname',
    title: '昵称',
    width: 120,
  },
  {
    key: 'email',
    title: '邮箱',
    width: 180,
  },
  {
    key: 'phone',
    title: '手机号',
    width: 140,
  },
  {
    key: 'gender',
    title: '性别',
    width: 80,
    align: 'center',
    dictType: 'sys_gender',
  },
  {
    key: 'enabled',
    title: '状态',
    width: 100,
    align: 'center',
    search: {
      component: 'select',
      props: {
        options: [
          { label: '启用', value: true },
          { label: '禁用', value: false },
        ],
      },
    },
  },
  {
    key: 'remark',
    title: '备注',
    minWidth: 200,
    ellipsis: true,
    // hideInTable：默认在表格中隐藏，可通过列设置开启
    hideInTable: true,
  },
  {
    key: 'createTime',
    title: '创建时间',
    width: 180,
    sorter: true,
  },
  {
    key: 'actions',
    title: '操作',
    width: 120,
    fixed: 'right',
    align: 'center',
    // configLocked：列设置中锁定不可操作
    configLocked: true,
  },
]
</script>

<style scoped lang="scss">
.pro-table-test {
  padding: $spacing-lg;
}
</style>
