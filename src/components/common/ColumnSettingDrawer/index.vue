<template>
  <NDrawer :show="show" :width="340" placement="right" @update:show="emit('update:show', $event)">
    <NDrawerContent title="列设置" :native-scrollbar="false">
      <VueDraggable
        v-model="localItems"
        :animation="200"
        handle=".col-drag-handle"
        @end="handleDragEnd"
      >
        <div
          v-for="item in localItems"
          :key="item.key"
          class="col-item"
          :class="{ 'col-item--locked': isLocked(item.key) }"
        >
          <!-- 拖拽手柄 -->
          <span v-if="!isLocked(item.key)" class="col-drag-handle">
            <NIcon size="16"><ReorderFourOutline /></NIcon>
          </span>
          <span v-else class="col-drag-placeholder"></span>

          <!-- 显隐开关 -->
          <NSwitch
            :value="item.visible"
            :disabled="isLocked(item.key)"
            size="small"
            @update:value="(val: boolean) => handleVisibleChange(item.key, val)"
          />

          <!-- 列名 -->
          <span class="col-label">{{ getTitle(item.key) }}</span>

          <!-- 固定列：锁定列显示锁图标，普通列显示图钉按钮（仅支持固定左侧） -->
          <NTooltip v-if="!isLocked(item.key)" :delay="300">
            <template #trigger>
              <NButton
                :quaternary="item.fixed !== 'left'"
                :secondary="item.fixed === 'left'"
                :type="item.fixed === 'left' ? 'primary' : 'default'"
                circle
                size="tiny"
                @click="handleFixedChange(item.key, item.fixed === 'left' ? null : 'left')"
              >
                <template #icon>
                  <NIcon>
                    <Pin v-if="item.fixed === 'left'" />
                    <PinOutline v-else />
                  </NIcon>
                </template>
              </NButton>
            </template>
            {{ item.fixed === 'left' ? '取消固定' : '固定左侧' }}
          </NTooltip>
          <span v-else class="col-lock">
            <NIcon size="14"><LockClosedOutline /></NIcon>
          </span>
        </div>
      </VueDraggable>

      <template #footer>
        <NSpace justify="end">
          <NPopconfirm @positive-click="handleReset">
            <template #trigger>
              <NButton size="small">
                恢复默认
              </NButton>
            </template>
            确定恢复为默认列配置吗？
          </NPopconfirm>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { ReorderFourOutline, LockClosedOutline, PinOutline, Pin } from '@vicons/ionicons5'
import type { ProTableColumn } from '@/components/common/ProTable/types'

defineOptions({ name: 'ColumnSettingDrawer' })

const props = defineProps<{
  show: boolean
  /** 全部列的当前配置状态（含隐藏列） */
  items: ColumnConfigItem[]
  /** 前端列定义，用于取 title 和 configLocked */
  columnDefs: ProTableColumn[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  /** 任何改动立即 emit，由父级防抖保存 */
  change: [items: ColumnConfigItem[]]
  reset: []
}>()

// 本地副本，抽屉内部操作
const localItems = ref<ColumnConfigItem[]>([])

watch(
  () => props.items,
  (items) => {
    localItems.value = items.map((i) => ({ ...i }))
  },
  { immediate: true, deep: true }
)

const defMap = computed(() => new Map(props.columnDefs.map((col) => [col.key, col])))

function isLocked(key: string) {
  return defMap.value.get(key)?.configLocked ?? false
}

function getTitle(key: string) {
  return defMap.value.get(key)?.title ?? key
}

function handleDragEnd() {
  emit(
    'change',
    localItems.value.map((item, index) => ({ ...item, sort: index }))
  )
}

function handleVisibleChange(key: string, val: boolean) {
  const item = localItems.value.find((i) => i.key === key)
  if (item) {
    item.visible = val
    emit(
      'change',
      localItems.value.map((i, index) => ({ ...i, sort: index }))
    )
  }
}

function handleFixedChange(key: string, side: 'left' | 'right' | null) {
  const item = localItems.value.find((i) => i.key === key)
  if (!item) return
  item.fixed = side
  emit(
    'change',
    localItems.value.map((i, index) => ({ ...i, sort: index }))
  )
}

function handleReset() {
  emit('reset')
}
</script>

<style scoped lang="scss">
.col-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: var(--n-color-hover);
  }

  &--locked {
    opacity: 0.5;
  }
}

.col-drag-handle {
  cursor: grab;
  color: var(--n-text-color-3);
  display: flex;
  align-items: center;

  &:active {
    cursor: grabbing;
  }
}

.col-drag-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.col-label {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.col-lock {
  color: var(--n-text-color-3);
  display: flex;
  align-items: center;
}


</style>
