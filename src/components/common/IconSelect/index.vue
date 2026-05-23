<!--
  图标选择器组件 (IconSelect)

  功能：
  - 图标列表展示
  - 搜索过滤
  - 分组快速选择
  - 预览选中图标
  - 支持 @vicons/ionicons5

  使用示例：
  <IconSelect v-model="form.icon" />

  禁用状态：
  <IconSelect v-model="form.icon" disabled />

  自定义占位文字：
  <IconSelect v-model="form.icon" placeholder="选择菜单图标" />
-->
<template>
  <NPopover
    trigger="click"
    placement="bottom-start"
    :disabled="disabled"
    :width="420"
    @update:show="handlePopoverShow"
  >
    <template #trigger>
      <NInput
        :value="modelValue || ''"
        :placeholder="placeholder"
        :disabled="disabled"
        readonly
        :clearable="clearable"
        style="cursor: pointer"
        @clear="handleClear"
      >
        <template v-if="modelValue && currentIconComponent" #prefix>
          <NIcon :component="currentIconComponent" :size="18" />
        </template>
        <template #suffix>
          <NIcon :component="ChevronDownOutline" :size="16" />
        </template>
      </NInput>
    </template>

    <div class="icon-select">
      <!-- 搜索框 -->
      <NInput
        v-model:value="searchKeyword"
        placeholder="搜索图标..."
        clearable
        size="small"
      >
        <template #prefix>
          <NIcon :component="SearchOutline" :size="16" />
        </template>
      </NInput>

      <!-- 分组标签 -->
      <NSpace class="icon-select__groups" size="small">
        <NTag
          v-for="group in groupNames"
          :key="group"
          :type="currentGroup === group ? 'primary' : 'default'"
          :bordered="currentGroup !== group"
          size="small"
          style="cursor: pointer"
          @click="handleGroupChange(group)"
        >
          {{ group }}
        </NTag>
      </NSpace>

      <!-- 图标列表 -->
      <NScrollbar style="max-height: 280px">
        <div v-if="displayIcons.length > 0" class="icon-select__grid">
          <div
            v-for="icon in displayIcons"
            :key="icon"
            class="icon-select__item"
            :class="{ 'icon-select__item--active': modelValue === icon }"
            :title="icon"
            @click="handleSelect(icon)"
          >
            <NIcon :component="getIconComponent(icon)" :size="22" />
          </div>
        </div>
        <NEmpty v-else description="未找到匹配的图标" />
      </NScrollbar>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="icon-select__pagination">
        <NSpace justify="center" align="center">
          <NButton
            size="tiny"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            上一页
          </NButton>
          <span class="icon-select__page-info">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <NButton
            size="tiny"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            下一页
          </NButton>
        </NSpace>
      </div>
    </div>
  </NPopover>
</template>

<script setup lang="ts">
import * as icons from '@vicons/ionicons5'
import { SearchOutline, ChevronDownOutline } from '@vicons/ionicons5'
import { outlineIcons, iconGroups, type IconName } from './icons'

defineOptions({
  name: 'IconSelect',
})

const props = withDefaults(
  defineProps<{
    /** 占位文字 */
    placeholder?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 是否可清除 */
    clearable?: boolean
    /** 每页显示数量 */
    pageSize?: number
  }>(),
  {
    placeholder: '请选择图标',
    disabled: false,
    clearable: true,
    pageSize: 60,
  }
)

const emit = defineEmits<{
  /** 选择图标后触发 */
  (e: 'select', icon: string): void
}>()

const modelValue = defineModel<string | null>({ default: null })

// 搜索关键词
const searchKeyword = ref('')
// 当前分组
const currentGroup = ref<string>('全部')
// 当前页码
const currentPage = ref(1)

// 分组名称列表
const groupNames = computed(() => ['全部', ...Object.keys(iconGroups)])

// 过滤后的图标列表
const filteredIcons = computed(() => {
  let result: readonly string[] = outlineIcons

  // 按分组过滤
  if (currentGroup.value !== '全部') {
    result = iconGroups[currentGroup.value as keyof typeof iconGroups] || []
  }

  // 按关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((icon) => icon.toLowerCase().includes(keyword))
  }

  return result
})

// 总页数
const totalPages = computed(() =>
  Math.ceil(filteredIcons.value.length / props.pageSize)
)

// 当前页显示的图标
const displayIcons = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return filteredIcons.value.slice(start, end)
})

// 当前选中图标的组件
const currentIconComponent = computed(() => {
  if (!modelValue.value) return null
  return getIconComponent(modelValue.value)
})

// 获取图标组件
function getIconComponent(name: string) {
  return icons[name as keyof typeof icons] || null
}

// 处理分组切换
function handleGroupChange(group: string) {
  currentGroup.value = group
  currentPage.value = 1
}

// 处理选择图标
function handleSelect(icon: string) {
  modelValue.value = icon
  emit('select', icon)
}

// 处理清除
function handleClear() {
  modelValue.value = null
}

// 处理弹出框显示
function handlePopoverShow(show: boolean) {
  if (show) {
    // 重置状态
    searchKeyword.value = ''
    currentPage.value = 1
  }
}

// 监听过滤条件变化，重置页码
watch([searchKeyword, currentGroup], () => {
  currentPage.value = 1
})
</script>

<style scoped lang="scss">
.icon-select {
  padding: 8px 0;

  &__groups {
    margin: 12px 0;
    flex-wrap: wrap;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    padding: 8px 0;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    border: 1px solid var(--n-border-color);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--n-color-target);
      color: var(--n-color-target);
      background-color: var(--n-color-target-suppl);
    }

    &--active {
      border-color: var(--n-color-target);
      color: var(--n-color-target);
      background-color: var(--n-color-target-suppl);
    }
  }

  &__pagination {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--n-border-color);
  }

  &__page-info {
    font-size: 12px;
    color: var(--n-text-color-3);
  }
}
</style>
