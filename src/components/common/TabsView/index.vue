<template>
  <div v-if="appStore.themeConfig.showTabs" class="tabs-view">
    <div ref="scrollContainer" class="tabs-container" @wheel.prevent="handleWheel">
      <TransitionGroup name="tab" tag="div" class="tabs-list">
        <div
          v-for="(tab, index) in tabsStore.tabs"
          :key="tab.path"
          class="tab-item"
          :class="{ active: tab.path === tabsStore.activeTab }"
          draggable="true"
          @click="handleTabClick(tab)"
          @contextmenu.prevent="handleContextMenu($event, tab, index)"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
        >
          <NIcon v-if="tab.affix" :component="PinOutline" class="tab-icon" />
          <span class="tab-title">{{ tab.title }}</span>
          <NIcon
            v-if="!tab.affix"
            :component="CloseOutline"
            class="tab-close"
            @click.stop="handleClose(tab.path)"
          />
        </div>
      </TransitionGroup>
    </div>

    <!-- 右键菜单 -->
    <div
      v-show="contextMenu.visible"
      ref="contextMenuRef"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-menu-item" @click="handleMenuAction('refresh')">
        <NIcon :component="RefreshOutline" />
        <span>刷新页面</span>
      </div>
      <div
        class="context-menu-item"
        :class="{ disabled: contextMenu.tab?.affix }"
        @click="handleMenuAction('close')"
      >
        <NIcon :component="CloseOutline" />
        <span>关闭当前</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('closeOther')">
        <NIcon :component="RemoveCircleOutline" />
        <span>关闭其他</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('closeLeft')">
        <NIcon :component="ArrowBackOutline" />
        <span>关闭左侧</span>
      </div>
      <div class="context-menu-item" @click="handleMenuAction('closeRight')">
        <NIcon :component="ArrowForwardOutline" />
        <span>关闭右侧</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('closeAll')">
        <NIcon :component="TrashOutline" />
        <span>关闭全部</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import {
  PinOutline,
  CloseOutline,
  RefreshOutline,
  RemoveCircleOutline,
  ArrowBackOutline,
  ArrowForwardOutline,
  TrashOutline,
} from '@vicons/ionicons5'
import { useAppStore } from '@/stores/app'
import { useTabsStore } from '@/stores/tabs'
import type { TabItem } from '@/types/theme'

defineOptions({
  name: 'TabsView',
})

const router = useRouter()
const appStore = useAppStore()
const tabsStore = useTabsStore()

const scrollContainer = ref<HTMLElement | null>(null)
const contextMenuRef = ref<HTMLElement | null>(null)

// 右键菜单状态
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  tab: null as TabItem | null,
  index: -1,
})

// 拖拽状态
const dragState = reactive({
  dragging: false,
  fromIndex: -1,
})

// 点击标签
function handleTabClick(tab: TabItem) {
  if (tab.path !== tabsStore.activeTab) {
    tabsStore.setActiveTab(tab.path)
    router.push(tab.path)
  }
}

// 关闭标签
function handleClose(path: string) {
  const nextPath = tabsStore.removeTab(path)
  if (nextPath && nextPath !== router.currentRoute.value.path) {
    router.push(nextPath)
  }
}

// 鼠标滚轮横向滚动
function handleWheel(e: WheelEvent) {
  if (scrollContainer.value) {
    scrollContainer.value.scrollLeft += e.deltaY
  }
}

// 右键菜单
function handleContextMenu(e: MouseEvent, tab: TabItem, index: number) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.tab = tab
  contextMenu.index = index
}

// 右键菜单操作
function handleMenuAction(action: string) {
  const tab = contextMenu.tab
  if (!tab) return

  switch (action) {
    case 'refresh':
      tabsStore.refreshTab(tab.path)
      break
    case 'close':
      if (!tab.affix) {
        handleClose(tab.path)
      }
      break
    case 'closeOther':
      tabsStore.closeOther(tab.path)
      router.push(tab.path)
      break
    case 'closeLeft':
      tabsStore.closeLeft(tab.path)
      break
    case 'closeRight':
      tabsStore.closeRight(tab.path)
      break
    case 'closeAll': {
      const nextPath = tabsStore.closeAll()
      if (nextPath) {
        router.push(nextPath)
      }
      break
    }
  }

  contextMenu.visible = false
}

// 关闭右键菜单
function closeContextMenu(e: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(e.target as Node)) {
    contextMenu.visible = false
  }
}

// 拖拽开始
function handleDragStart(e: DragEvent, index: number) {
  dragState.dragging = true
  dragState.fromIndex = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

// 拖拽经过
function handleDragOver(e: DragEvent, index: number) {
  if (dragState.dragging && dragState.fromIndex !== index) {
    e.dataTransfer!.dropEffect = 'move'
  }
}

// 放下
function handleDrop(_e: DragEvent, toIndex: number) {
  if (dragState.dragging && dragState.fromIndex !== toIndex) {
    tabsStore.reorderTabs(dragState.fromIndex, toIndex)
  }
}

// 拖拽结束
function handleDragEnd() {
  dragState.dragging = false
  dragState.fromIndex = -1
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
})
</script>

<style scoped lang="scss">
.tabs-view {
  position: relative;
  height: var(--tabs-height, 40px);
  background: linear-gradient(180deg, var(--bg-color-container) 0%, var(--bg-color) 100%);
  border-bottom: 1px solid var(--border-color-light);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}

.tabs-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 12px, #000 calc(100% - 12px), transparent);

  &::-webkit-scrollbar {
    height: 0;
    display: none;
  }
}

.tabs-list {
  display: flex;
  gap: 6px;
  height: 100%;
  align-items: center;
  padding: 0 4px;
}

.tab-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: var(--bg-color-container);
  border: 1px solid var(--border-color-light);
  border-radius: var(--border-radius, 8px);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  font-size: 13px;
  transition:
    all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  // 底部高亮指示器
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 60%;
    height: 2px;
    background: var(--primary-color);
    border-radius: 2px 2px 0 0;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    background: var(--bg-color-hover);
    border-color: var(--border-color);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .tab-close {
      opacity: 1;
      transform: scale(1);
    }

    &::after {
      transform: translateX(-50%) scaleX(0.5);
    }
  }

  &.active {
    background: linear-gradient(135deg, var(--primary-color-suppl) 0%, var(--bg-color-container) 100%);
    border-color: var(--primary-color);
    color: var(--primary-color);
    font-weight: 500;
    box-shadow: 0 2px 12px var(--primary-color-suppl);

    &::after {
      transform: translateX(-50%) scaleX(1);
    }

    .tab-icon {
      color: var(--primary-color);
    }

    .tab-close {
      opacity: 1;
      transform: scale(1);
    }
  }

  &[draggable='true'] {
    cursor: grab;

    &:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
  }
}

.tab-icon {
  font-size: 14px;
  color: var(--text-color-disabled);
  transition: color 0.2s, transform 0.2s;

  .tab-item:hover & {
    transform: rotate(-10deg);
  }
}

.tab-title {
  font-size: 13px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: var(--text-color-disabled);
  opacity: 0;
  transform: scale(0.8);
  transition:
    all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  margin-left: 2px;

  &:hover {
    color: #fff;
    background-color: var(--error-color);
    transform: scale(1.1) !important;
  }
}

// 右键菜单
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  background-color: var(--bg-color-container);
  border: 1px solid var(--border-color-light);
  border-radius: var(--border-radius, 8px);
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  padding: 6px;
  animation: contextMenuFadeIn 0.15s ease-out;
}

@keyframes contextMenuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--text-color-primary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background-color: var(--primary-color-suppl);
    color: var(--primary-color);

    .n-icon {
      transform: scale(1.1);
    }
  }

  &.disabled {
    color: var(--text-color-disabled);
    cursor: not-allowed;

    &:hover {
      background-color: transparent;
      color: var(--text-color-disabled);
    }
  }

  .n-icon {
    font-size: 16px;
    transition: transform 0.2s;
  }
}

.context-menu-divider {
  height: 1px;
  background-color: var(--border-color-light);
  margin: 6px 4px;
}

// 标签过渡动画
.tab-enter-active,
.tab-leave-active {
  transition:
    all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.9);
}

.tab-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.9);
}

.tab-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
