<!--
  权限组件测试页面

  本页面用于测试和演示权限控制相关组件的用法：
  - v-permission: 权限指令
  - Permission: 权限组件

  调试方式：
  1. 打开 Chrome DevTools (F12)
  2. 在 Vue DevTools 中查看 permissionStore 状态
  3. 可以手动修改 permissions 来测试不同权限场景

  注意：需要先登录获取权限数据
-->
<template>
  <div class="permission-test">
    <NCard title="当前权限状态">
      <NSpace vertical>
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="当前用户">
            {{ userStore.nickname || '未登录' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="权限数量">
            {{ permissionStore.permissions.size }}
          </NDescriptionsItem>
        </NDescriptions>

        <NCollapse>
          <NCollapseItem title="查看所有权限" name="permissions">
            <NSpace vertical>
              <NTag v-for="code in permissionList" :key="code" size="small">
                {{ code }}
              </NTag>
              <NEmpty v-if="permissionList.length === 0" description="暂无权限" />
            </NSpace>
          </NCollapseItem>
        </NCollapse>

        <NDivider />

        <NSpace>
          <NInput v-model:value="testPermission" placeholder="输入权限码测试" style="width: 250px" />
          <NButton @click="checkPermission">
            检查权限
          </NButton>
        </NSpace>
        <NAlert v-if="checkResult !== null" :type="checkResult ? 'success' : 'error'">
          {{ testPermission }}: {{ checkResult ? '有权限' : '无权限' }}
        </NAlert>
      </NSpace>
    </NCard>

    <NCard title="v-permission 指令" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            通过指令方式控制元素显示，无权限时元素从 DOM 中移除
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          单个权限
        </NDivider>
        <NSpace>
          <NButton v-permission="'sys:user:add'" type="primary">
            新增用户 (sys:user:add)
          </NButton>
          <NButton v-permission="'sys:user:edit'">
            编辑用户 (sys:user:edit)
          </NButton>
          <NButton v-permission="'sys:user:delete'" type="error">
            删除用户 (sys:user:delete)
          </NButton>
        </NSpace>

        <NDivider title-placement="left">
          多个权限（OR 逻辑）
        </NDivider>
        <NSpace>
          <NButton v-permission="['sys:user:add', 'sys:user:edit']" type="primary">
            新增/编辑 (任一即可)
          </NButton>
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="directiveCode" language="vue" />
      </NSpace>
    </NCard>

    <NCard title="Permission 组件" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            通过组件包裹方式控制内容显示，支持隐藏和禁用两种模式
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          隐藏模式（默认）
        </NDivider>
        <NSpace>
          <Permission code="sys:role:add">
            <NButton type="primary">
              新增角色 (sys:role:add)
            </NButton>
          </Permission>
          <Permission code="sys:role:edit">
            <NButton>编辑角色 (sys:role:edit)</NButton>
          </Permission>
          <Permission code="sys:role:delete">
            <NButton type="error">
              删除角色 (sys:role:delete)
            </NButton>
          </Permission>
        </NSpace>

        <NDivider title-placement="left">
          禁用模式
        </NDivider>
        <NSpace>
          <Permission code="sys:menu:add" mode="disable">
            <NButton type="primary">
              新增菜单 (禁用模式)
            </NButton>
          </Permission>
          <Permission code="sys:menu:export" mode="disable">
            <NButton>导出菜单 (禁用模式)</NButton>
          </Permission>
        </NSpace>

        <NDivider title-placement="left">
          多个权限（OR 逻辑）
        </NDivider>
        <NSpace>
          <Permission :code="['sys:dept:add', 'sys:dept:edit']">
            <NButton type="primary">
              新增/编辑部门 (任一即可)
            </NButton>
          </Permission>
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="componentCode" language="vue" />
      </NSpace>
    </NCard>

    <NCard title="模拟权限测试" style="margin-top: 16px">
      <NAlert type="info" style="margin-bottom: 16px">
        以下操作仅用于测试，不会影响实际权限数据。刷新页面后恢复。
      </NAlert>
      <NSpace>
        <NButton @click="addTestPermission('sys:user:add')">
          添加 sys:user:add
        </NButton>
        <NButton @click="addTestPermission('sys:user:edit')">
          添加 sys:user:edit
        </NButton>
        <NButton @click="addTestPermission('sys:user:delete')">
          添加 sys:user:delete
        </NButton>
        <NButton @click="addTestPermission('sys:role:add')">
          添加 sys:role:add
        </NButton>
        <NButton type="warning" @click="clearTestPermissions">
          清除测试权限
        </NButton>
      </NSpace>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'

defineOptions({
  name: 'PermissionTest',
})

const userStore = useUserStore()
const permissionStore = usePermissionStore()
const message = useMessage()

const testPermission = ref('')
const checkResult = ref<boolean | null>(null)

// 权限列表
const permissionList = computed(() => Array.from(permissionStore.permissions))

// 检查权限
function checkPermission() {
  if (!testPermission.value) {
    message.warning('请输入权限码')
    return
  }
  checkResult.value = permissionStore.hasPermission(testPermission.value)
}

// 添加测试权限（仅用于演示）
function addTestPermission(code: string) {
  permissionStore.permissions.add(code)
  message.success(`已添加权限: ${code}`)
}

// 清除测试权限
function clearTestPermissions() {
  permissionStore.permissions.clear()
  message.success('测试权限已清除')
}

// 代码示例
const directiveCode = `<!-- 单个权限 -->
<n-button v-permission="'sys:user:add'">新增</n-button>

<!-- 多个权限（满足任一即可） -->
<n-button v-permission="['sys:user:edit', 'sys:user:add']">编辑</n-button>

<!-- 无权限时元素将从 DOM 中移除 -->`

const componentCode = `<!-- 基础用法（无权限时隐藏） -->
<Permission code="sys:user:delete">
  <n-button type="error">删除</n-button>
</Permission>

<!-- 多权限（满足任一即可） -->
<Permission :code="['sys:user:edit', 'sys:user:add']">
  <n-button>编辑</n-button>
</Permission>

<!-- 禁用模式（无权限时禁用而非隐藏） -->
<Permission code="sys:user:export" mode="disable">
  <n-button>导出</n-button>
</Permission>`
</script>

<style scoped lang="scss">
.permission-test {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}
</style>
