<template>
  <div class="theme-color-picker">
    <div class="color-list">
      <div
        v-for="item in presetColors"
        :key="item.color"
        class="color-item"
        :class="{ active: modelValue === item.color }"
        :style="{ backgroundColor: item.color }"
        :title="item.name"
        @click="handleSelect(item.color)"
      >
        <NIcon v-if="modelValue === item.color" :component="CheckmarkOutline" />
      </div>
    </div>
    <div class="custom-color">
      <NInput
        v-model:value="customColor"
        placeholder="#1890ff"
        size="small"
        @blur="handleCustomColor"
        @keyup.enter="handleCustomColor"
      >
        <template #prefix>
          <div class="color-preview" :style="{ backgroundColor: customColor || modelValue }"></div>
        </template>
      </NInput>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NInput, NIcon } from 'naive-ui'
import { CheckmarkOutline } from '@vicons/ionicons5'
import { presetColors } from '@/types/theme'

defineOptions({
  name: 'ThemeColorPicker',
})

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const customColor = ref('')

// 监听外部值变化，更新自定义颜色输入框
watch(
  () => props.modelValue,
  (val: string) => {
    const isPreset = presetColors.some((item) => item.color === val)
    if (!isPreset) {
      customColor.value = val
    }
  },
  { immediate: true }
)

function handleSelect(color: string) {
  emit('update:modelValue', color)
  customColor.value = ''
}

function handleCustomColor() {
  const color = customColor.value.trim()
  if (color && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(color)) {
    emit('update:modelValue', color)
  }
}
</script>

<style scoped lang="scss">
.theme-color-picker {
  .color-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .color-item {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.2s,
      box-shadow 0.2s;

    &:hover {
      transform: scale(1.1);
    }

    &.active {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
    }

    .n-icon {
      color: #fff;
      font-size: 14px;
    }
  }

  .custom-color {
    .color-preview {
      width: 16px;
      height: 16px;
      border-radius: 2px;
      border: 1px solid var(--border-color);
    }
  }
}
</style>
