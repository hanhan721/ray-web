<!--
  P2 组件测试页面

  本页面用于测试和演示 P2 组件的用法：
  - ConfirmButton: 确认按钮组件
  - IconSelect: 图标选择器组件
  - DeptTreeSelect: 部门树选择器组件

  调试方式：
  1. 打开 Chrome DevTools (F12)
  2. 在 Vue DevTools 中查看组件状态
  3. 在 Network 面板查看 API 请求
-->
<template>
  <div class="p2-component-test">
    <!-- ConfirmButton 测试 -->
    <NCard title="ConfirmButton 确认按钮组件">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            点击弹出确认框，支持自定义文案和 loading 状态
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          基础用法
        </NDivider>
        <NSpace>
          <ConfirmButton
            type="error"
            confirm-text="确定要删除该用户吗？此操作不可恢复。"
            @confirm="handleDelete"
            @cancel="handleCancel"
          >
            删除用户
          </ConfirmButton>

          <ConfirmButton
            type="warning"
            confirm-text="确定要重置密码吗？"
            @confirm="handleResetPassword"
          >
            重置密码
          </ConfirmButton>
        </NSpace>

        <NDivider title-placement="left">
          自定义文案
        </NDivider>
        <NSpace>
          <ConfirmButton
            confirm-title="警告"
            confirm-text="此操作将清除所有缓存数据，确定继续吗？"
            positive-text="继续"
            negative-text="返回"
            @confirm="handleClearCache"
          >
            清除缓存
          </ConfirmButton>
        </NSpace>

        <NDivider title-placement="left">
          Loading 状态
        </NDivider>
        <NSpace align="center">
          <ConfirmButton
            type="primary"
            :loading="confirmLoading"
            confirm-text="确定要提交吗？"
            @confirm="handleSubmitWithLoading"
          >
            提交（带 Loading）
          </ConfirmButton>
          <span v-if="confirmLoading">处理中...</span>
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="confirmButtonCode" language="vue" />
      </NSpace>
    </NCard>

    <!-- IconSelect 测试 -->
    <NCard title="IconSelect 图标选择器组件" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            从 Ionicons 图标库中选择图标，支持搜索和分组
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          基础用法
        </NDivider>
        <NSpace align="center">
          <span>选择图标：</span>
          <IconSelect v-model="selectedIcon" style="width: 250px" />
          <span>当前值：{{ selectedIcon || '未选择' }}</span>
        </NSpace>

        <NDivider title-placement="left">
          图标预览
        </NDivider>
        <NSpace v-if="selectedIcon" align="center">
          <span>预览效果：</span>
          <NIcon :component="getIconComponent(selectedIcon)" :size="24" />
          <NIcon :component="getIconComponent(selectedIcon)" :size="32" />
          <NIcon :component="getIconComponent(selectedIcon)" :size="48" />
        </NSpace>
        <NAlert v-else type="info">
          请先选择一个图标
        </NAlert>

        <NDivider title-placement="left">
          禁用状态
        </NDivider>
        <NSpace align="center">
          <span>禁用选择器：</span>
          <IconSelect v-model="selectedIcon" disabled style="width: 250px" />
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="iconSelectCode" language="vue" />
      </NSpace>
    </NCard>

    <!-- DeptTreeSelect 测试 -->
    <NCard title="DeptTreeSelect 部门树选择器组件" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            自动加载部门树，支持单选和多选模式
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          单选模式
        </NDivider>
        <NSpace align="center">
          <span>选择部门：</span>
          <DeptTreeSelect
            v-model="selectedDept"
            placeholder="请选择部门"
            style="width: 300px"
            @load="handleDeptLoad"
          />
          <span>当前值：{{ selectedDept ?? '未选择' }}</span>
        </NSpace>

        <NDivider title-placement="left">
          多选模式
        </NDivider>
        <NSpace align="center">
          <span>选择多个部门：</span>
          <DeptTreeSelect
            v-model="selectedDepts"
            multiple
            checkable
            check-strategy="child"
            placeholder="请选择部门"
            style="width: 400px"
          />
          <span>当前值：{{ selectedDepts?.join(', ') || '未选择' }}</span>
        </NSpace>

        <NDivider title-placement="left">
          仅启用部门
        </NDivider>
        <NSpace align="center">
          <span>仅显示启用：</span>
          <DeptTreeSelect
            v-model="selectedEnabledDept"
            enabled-only
            placeholder="仅显示启用的部门"
            style="width: 300px"
          />
        </NSpace>

        <NDivider title-placement="left">
          加载状态
        </NDivider>
        <NAlert v-if="deptLoadInfo" :type="deptLoadInfo.type">
          {{ deptLoadInfo.message }}
        </NAlert>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="deptTreeSelectCode" language="vue" />
      </NSpace>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import * as icons from '@vicons/ionicons5'
import type { DeptTree } from '@/api/dept'

defineOptions({
  name: 'P2ComponentTest',
})

const message = useMessage()

// ============ ConfirmButton 测试 ============
const confirmLoading = ref(false)

function handleDelete() {
  message.success('删除操作已确认')
}

function handleCancel() {
  message.info('操作已取消')
}

function handleResetPassword() {
  message.success('密码已重置')
}

function handleClearCache() {
  message.warning('缓存已清除')
}

async function handleSubmitWithLoading() {
  confirmLoading.value = true
  await new Promise((resolve) => setTimeout(resolve, 2000))
  confirmLoading.value = false
  message.success('提交成功')
}

// ============ IconSelect 测试 ============
const selectedIcon = ref<string | null>(null)

function getIconComponent(name: string) {
  return icons[name as keyof typeof icons] || null
}

// ============ DeptTreeSelect 测试 ============
const selectedDept = ref<number | null>(null)
const selectedDepts = ref<number[]>([])
const selectedEnabledDept = ref<number | null>(null)
const deptLoadInfo = ref<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null)

function handleDeptLoad(data: DeptTree[]) {
  const count = countDepts(data)
  deptLoadInfo.value = {
    type: 'success',
    message: `部门树加载完成，共 ${count} 个部门`,
  }
}

function countDepts(nodes: DeptTree[]): number {
  return nodes.reduce((sum, node) => {
    return sum + 1 + (node.children ? countDepts(node.children) : 0)
  }, 0)
}

// ============ 代码示例 ============
const confirmButtonCode = `<!-- 基础用法 -->
<ConfirmButton
  type="error"
  confirm-text="确定要删除该用户吗？"
  @confirm="handleDelete"
>
  删除
</ConfirmButton>

<!-- 自定义文案 -->
<ConfirmButton
  confirm-title="警告"
  confirm-text="此操作不可恢复"
  positive-text="继续"
  negative-text="返回"
  @confirm="handleDanger"
>
  危险操作
</ConfirmButton>

<!-- Loading 状态 -->
<ConfirmButton
  :loading="isLoading"
  @confirm="handleSubmit"
>
  提交
</ConfirmButton>`

const iconSelectCode = `<!-- 基础用法 -->
<IconSelect v-model="form.icon" />

<!-- 自定义占位文字 -->
<IconSelect
  v-model="form.icon"
  placeholder="选择菜单图标"
/>

<!-- 禁用状态 -->
<IconSelect v-model="form.icon" disabled />

<!-- 获取图标组件进行渲染 -->
<script setup>
import * as icons from '@vicons/ionicons5'

function getIconComponent(name: string) {
  return icons[name]
}
<\/script>

<template>
  <NIcon :component="getIconComponent(iconName)" />
</template>`

const deptTreeSelectCode = `<!-- 单选 -->
<DeptTreeSelect v-model="form.deptId" />

<!-- 多选 -->
<DeptTreeSelect
  v-model="form.deptIds"
  multiple
  checkable
  check-strategy="child"
/>

<!-- 仅启用部门 -->
<DeptTreeSelect
  v-model="form.deptId"
  enabled-only
/>

<!-- 监听加载完成 -->
<DeptTreeSelect
  v-model="form.deptId"
  @load="handleDeptLoad"
/>

<!-- 手动刷新 -->
<script setup>
const deptRef = ref()

function refresh() {
  deptRef.value?.refresh()
}
<\/script>

<template>
  <DeptTreeSelect ref="deptRef" v-model="form.deptId" />
</template>`
</script>

<style scoped lang="scss">
.p2-component-test {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}
</style>
