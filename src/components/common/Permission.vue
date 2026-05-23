<!--
  权限组件 (Permission)

  功能：
  - 组件包裹方式的权限控制
  - 支持单个权限码
  - 支持多个权限码（OR 逻辑，满足任一即可）
  - 无权限时隐藏或禁用（可配置）

  使用示例：

  基础用法（无权限时隐藏）:
  <Permission code="sys:user:delete">
    <n-button type="error">删除</n-button>
  </Permission>

  多权限（满足任一即可）:
  <Permission :code="['sys:user:edit', 'sys:user:add']">
    <n-button>编辑</n-button>
  </Permission>

  无权限时禁用而非隐藏:
  <Permission code="sys:user:export" mode="disable">
    <n-button>导出</n-button>
  </Permission>
-->
<template>
  <template v-if="hasPermission">
    <slot></slot>
  </template>
  <template v-else-if="mode === 'disable'">
    <slot name="disabled">
      <span class="permission-disabled">
        <slot></slot>
      </span>
    </slot>
  </template>
</template>

<script setup lang="ts">
import { usePermissionStore } from '@/stores/permission'

defineOptions({
  name: 'Permission',
})

const props = withDefaults(
  defineProps<{
    /** 权限码，支持单个或数组（OR 逻辑） */
    code: string | string[]
    /** 无权限时的处理方式：hide-隐藏（默认），disable-禁用 */
    mode?: 'hide' | 'disable'
  }>(),
  {
    mode: 'hide',
  }
)

const permissionStore = usePermissionStore()

// 计算是否有权限
const hasPermission = computed(() => {
  if (!props.code) {
    return true
  }

  if (Array.isArray(props.code)) {
    return permissionStore.hasAnyPermission(props.code)
  }

  return permissionStore.hasPermission(props.code)
})
</script>

<style scoped lang="scss">
.permission-disabled {
  display: inline-block;
  cursor: not-allowed;
  opacity: 0.5;
  pointer-events: none;

  :deep(*) {
    pointer-events: none !important;
  }
}
</style>
