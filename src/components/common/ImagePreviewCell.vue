<template>
  <NImageGroup
    :show="showPreview"
    :current="currentIndex"
    :render-toolbar="renderToolbar"
    @update:show="showPreview = $event"
    @update:current="currentIndex = $event"
  >
    <div class="image-preview-cell" @click="handleClick">
      <NImage
        :src="urls[0]"
        :width="80"
        :height="80"
        object-fit="cover"
        preview-disabled
        style="cursor: pointer; border-radius: 4px"
      />
      <span v-if="urls.length > 1" class="image-preview-cell__count">{{ urls.length }}</span>
    </div>
    <!-- 隐藏的图片供 NImageGroup 注册预览列表 -->
    <NImage
      v-for="(url, i) in urls.slice(1)"
      :key="i"
      :src="url"
      style="display: none"
    />
  </NImageGroup>
</template>

<script setup lang="ts">
import { h, type VNode, type VNodeChild } from 'vue'
import { NImage, NImageGroup } from 'naive-ui'

defineOptions({
  name: 'ImagePreviewCell',
})

defineProps<{
  urls: string[]
}>()

const showPreview = ref(false)
const currentIndex = ref(0)

function handleClick() {
  currentIndex.value = 0
  showPreview.value = true
}

function renderToolbar({ nodes }: { nodes: Record<string, VNode> }): VNodeChild {
  return h('div', { style: 'display: flex; flex-direction: column; align-items: center; gap: 8px' }, [
    h('div', { style: 'display: flex; gap: 12px' }, [
      nodes.prev,
      nodes.rotateCounterclockwise,
      nodes.rotateClockwise,
      nodes.zoomOut,
      nodes.zoomIn,
      nodes.resizeToOriginalSize,
      nodes.download,
      nodes.close,
      nodes.next,
    ]),
  ])
}
</script>

<style scoped lang="scss">
.image-preview-cell {
  position: relative;
  display: inline-block;

  &__count {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    color: #fff;
    text-align: center;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 9px;
  }
}
</style>
