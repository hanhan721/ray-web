<template>
  <NModal
    v-model:show="visible"
    preset="card"
    :title="`授权 - ${props.data?.roleName ?? ''}`"
    :style="{ width: '500px' }"
    :mask-closable="false"
    @after-leave="handleAfterLeave"
  >
    <NSpin :show="loading">
      <div class="auth-tree-wrapper">
        <div class="auth-tree-header">
          <NSpace>
            <NCheckbox
              :checked="isAllChecked"
              :indeterminate="isIndeterminate"
              @update:checked="handleCheckAll"
            >
              全选/全不选
            </NCheckbox>
            <NCheckbox v-model:checked="expandAll" @update:checked="handleExpandChange">
              展开/收起
            </NCheckbox>
          </NSpace>
        </div>
        <NTree
          :data="permissionTree"
          :checked-keys="checkedIds"
          :expanded-keys="expandedKeys"
          checkable
          cascade
          selectable
          block-line
          key-field="id"
          label-field="name"
          children-field="children"
          class="auth-tree"
          @update:checked-keys="handleCheckedKeysChange"
          @update:expanded-keys="handleExpandedKeysChange"
        />
      </div>
    </NSpin>

    <template #footer>
      <NSpace justify="end">
        <NButton @click="handleCancel">
          取消
        </NButton>
        <NButton type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { type Role } from '@/api/role'
import { getPermissionTree, getRolePermissions, saveRolePermissions } from '@/api/permission'
import type { PermissionTree } from '@/types/permission'

defineOptions({
  name: 'RoleAuth',
})

interface Props {
  show: boolean
  data: Role | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const message = useMessage()

// 弹窗可见性
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value),
})

// 加载状态
const loading = ref(false)
const submitting = ref(false)

// 权限树数据
const permissionTree = ref<PermissionTree[]>([])
const checkedIds = ref<number[]>([])
const expandedKeys = ref<number[]>([])
const expandAll = ref(true)

// 全选状态
const allPermissionIds = computed(() => {
  const ids: number[] = []
  function collect(nodes: PermissionTree[]) {
    for (const node of nodes) {
      ids.push(node.id)
      if (node.children?.length) collect(node.children)
    }
  }
  collect(permissionTree.value)
  return ids
})

const isAllChecked = computed(
  () => allPermissionIds.value.length > 0 && checkedIds.value.length === allPermissionIds.value.length
)

const isIndeterminate = computed(
  () => checkedIds.value.length > 0 && checkedIds.value.length < allPermissionIds.value.length
)

// 获取所有可展开节点 key
function getAllExpandableKeys(nodes: PermissionTree[]): number[] {
  const keys: number[] = []
  function collect(items: PermissionTree[]) {
    for (const item of items) {
      if (item.children?.length) {
        keys.push(item.id)
        collect(item.children)
      }
    }
  }
  collect(nodes)
  return keys
}

// 全选/全不选
function handleCheckAll(checked: boolean) {
  checkedIds.value = checked ? [...allPermissionIds.value] : []
}

// 展开/收起
function handleExpandChange(expand: boolean) {
  expandedKeys.value = expand ? getAllExpandableKeys(permissionTree.value) : []
}

// 选中节点变化
function handleCheckedKeysChange(keys: Array<string | number>) {
  checkedIds.value = keys as number[]
}

// 展开节点变化
function handleExpandedKeysChange(keys: Array<string | number>) {
  expandedKeys.value = keys as number[]
}

// 从权限 ID 列表中过滤出叶子节点 ID（cascade 模式下只需设置叶子，父级会自动半选/全选）
function onlyLeaves(ids: number[], nodes: PermissionTree[]): number[] {
  const parentIds = new Set<number>()
  function collectParents(items: PermissionTree[]) {
    for (const item of items) {
      if (item.children?.length) {
        parentIds.add(item.id)
        collectParents(item.children)
      }
    }
  }
  collectParents(nodes)
  return ids.filter((id) => !parentIds.has(id))
}

// 监听弹窗打开，加载数据
watch(
  () => props.show,
  async (newShow) => {
    if (newShow && props.data?.id) {
      loading.value = true
      try {
        const [tree, permissionIds] = await Promise.all([
          getPermissionTree(),
          getRolePermissions(props.data.id),
        ])
        permissionTree.value = tree
        expandedKeys.value = getAllExpandableKeys(tree)
        checkedIds.value = onlyLeaves(permissionIds || [], tree)
      } finally {
        loading.value = false
      }
    }
  }
)

// 取消
function handleCancel() {
  visible.value = false
}

// 弹窗关闭后重置
function handleAfterLeave() {
  permissionTree.value = []
  checkedIds.value = []
  expandedKeys.value = []
  expandAll.value = true
}

// 补全祖先节点 ID（NTree cascade 模式下只收集叶子，需手动补充父节点）
function withAncestors(ids: number[], nodes: PermissionTree[]): number[] {
  const parentMap = new Map<number, number>()
  function build(items: PermissionTree[], parentId?: number) {
    for (const item of items) {
      if (parentId !== undefined) parentMap.set(item.id, parentId)
      if (item.children?.length) build(item.children, item.id)
    }
  }
  build(nodes)

  const result = new Set(ids)
  for (const id of ids) {
    let cur = id
    while (parentMap.has(cur)) {
      const parent = parentMap.get(cur)!
      result.add(parent)
      cur = parent
    }
  }
  return Array.from(result)
}

// 提交授权
async function handleSubmit() {
  if (!props.data?.id) return
  submitting.value = true
  try {
    const ids = withAncestors(checkedIds.value, permissionTree.value)
    await saveRolePermissions(props.data.id, ids)
    message.success('授权成功')
    visible.value = false
    emit('success')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-tree-wrapper {
  border: 1px solid var(--n-border-color);
  border-radius: var(--n-border-radius);
  padding: $spacing-sm;

  .auth-tree-header {
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid var(--n-border-color);
    margin-bottom: $spacing-sm;
  }

  .auth-tree {
    max-height: 400px;
    overflow: auto;
  }
}
</style>
