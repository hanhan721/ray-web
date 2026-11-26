<!--
  搜索表单组件 (SearchForm)

  功能：
  - 根据 schema 配置渲染表单项
  - 支持展开/收起（超过 N 个时）
  - 搜索/重置按钮
  - 响应式布局（24 栅格，按控件语义分配宽度）
  - 支持 DictSelect 类型
  - 回车触发搜索

  使用示例：
  <SearchForm
    :schema="searchSchema"
    :model="searchParams"
    @search="handleSearch"
    @reset="handleReset"
  />
-->
<template>
  <NForm
    ref="formRef"
    :model="model"
    label-placement="left"
    :label-width="labelWidth"
    @keyup.enter="handleSearch"
  >
    <NGrid :cols="24" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
      <NGridItem
        v-for="item in visibleSchema"
        :key="item.field"
        :span="item.span || componentSpan(item.component)"
        class="search-form__item"
      >
        <NFormItem :label="item.label" :path="item.field">
          <!-- 输入框 -->
          <NInput
            v-if="item.component === 'input'"
            v-model:value="(model[item.field] as string)"
            :placeholder="(item.props?.placeholder as string) || `请输入${item.label}`"
            clearable
            v-bind="item.props"
          />
          <!-- 选择器 -->
          <NSelect
            v-else-if="item.component === 'select'"
            v-model:value="(model[item.field] as string | number | null)"
            :placeholder="(item.props?.placeholder as string) || `请选择${item.label}`"
            :options="(item.props?.options as any[]) || []"
            clearable
            v-bind="item.props"
          />
          <!-- 字典选择器 -->
          <DictSelect
            v-else-if="item.component === 'dict-select'"
            v-model="(model[item.field] as string | number | null)"
            :type="item.dictType!"
            :placeholder="(item.props?.placeholder as string) || `请选择${item.label}`"
            v-bind="item.props"
          />
          <!-- 树选择器 -->
          <NTreeSelect
            v-else-if="item.component === 'tree-select'"
            v-model:value="(model[item.field] as string | number | null)"
            :placeholder="(item.props?.placeholder as string) || `请选择${item.label}`"
            :options="(unref(item.props?.options) as any[]) || []"
            :key-field="(item.props?.keyField as string) || undefined"
            :label-field="(item.props?.labelField as string) || undefined"
            :children-field="(item.props?.childrenField as string) || undefined"
            clearable
            style="width: 100%"
          />
          <!-- 日期选择器 -->
          <NDatePicker
            v-else-if="item.component === 'date-picker'"
            v-model:value="(model[item.field] as number | null)"
            type="date"
            :placeholder="(item.props?.placeholder as string) || `请选择${item.label}`"
            clearable
            style="width: 100%"
            v-bind="item.props"
          />
          <!-- 日期范围选择器 -->
          <NDatePicker
            v-else-if="item.component === 'date-range'"
            v-model:value="(model[item.field] as [number, number] | null)"
            type="daterange"
            clearable
            style="width: 100%"
            v-bind="item.props"
          />
        </NFormItem>
      </NGridItem>

      <!-- 操作按钮 -->
      <NGridItem suffix :span="ACTION_SPAN" class="search-form__buttons">
        <NSpace justify="end">
          <NButton @click="handleReset">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            重置
          </NButton>
          <NButton type="primary" @click="handleSearch">
            <template #icon>
              <NIcon><SearchOutline /></NIcon>
            </template>
            搜索
          </NButton>
          <NButton
            v-if="schema.length > collapseCount"
            text
            type="primary"
            @click="collapsed = !collapsed"
          >
            {{ collapsed ? '展开' : '收起' }}
            <template #icon>
              <NIcon>
                <ChevronDownOutline v-if="collapsed" />
                <ChevronUpOutline v-else />
              </NIcon>
            </template>
          </NButton>
        </NSpace>
      </NGridItem>
    </NGrid>
  </NForm>
</template>

<script setup lang="ts">
import { unref } from 'vue'
import { SearchOutline, RefreshOutline, ChevronDownOutline, ChevronUpOutline } from '@vicons/ionicons5'
import type { FormInst } from 'naive-ui'

defineOptions({
  name: 'SearchForm',
})

/** 搜索表单项配置 */
export interface SearchFormItem {
  /** 字段名 */
  field: string
  /** 标签 */
  label: string
  /** 组件类型 */
  component: 'input' | 'select' | 'dict-select' | 'tree-select' | 'date-picker' | 'date-range'
  /** 组件 props */
  props?: Record<string, unknown>
  /** 字典类型（component 为 dict-select 时使用） */
  dictType?: string
  /** 默认值 */
  defaultValue?: unknown
  /**
   * 栅格占比，默认按控件类型分配
   * 支持断点写法，如 `24 s:12 m:8 l:6 xl:6 xxl:4`
   */
  span?: number | string
}

const props = withDefaults(
  defineProps<{
    /** 表单配置 */
    schema: SearchFormItem[]
    /** 表单数据 */
    model: Record<string, unknown>
    /** 标签宽度 */
    labelWidth?: number | string
    /** 未知控件类型的兜底栅格占比 */
    defaultSpan?: number
    /** 超过多少个收起 */
    collapseCount?: number
  }>(),
  {
    labelWidth: 80,
    defaultSpan: 6,
    collapseCount: 3,
  }
)

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()

const formRef = ref<FormInst | null>(null)
const collapsed = ref(true)

/**
 * 不同控件的语义化栅格占比：
 * - 文本类控件保持常规输入宽度
 * - 下拉类控件收窄，避免状态/分类选择框过长
 * - 日期范围需要完整展示起止日期，占用更宽
 */
const COMPONENT_SPANS: Record<SearchFormItem['component'], string> = {
  input: '24 s:12 m:8 l:6 xl:6 xxl:5',
  select: '24 s:12 m:8 l:6 xl:5 xxl:4',
  'dict-select': '24 s:12 m:8 l:6 xl:5 xxl:4',
  'tree-select': '24 s:12 m:8 l:6 xl:6 xxl:5',
  'date-picker': '24 s:12 m:8 l:6 xl:6 xxl:5',
  'date-range': '24 s:24 m:12 l:8 xl:8 xxl:6',
}

/** 操作区固定到行尾；当前行放不下时自动换行到下一行右侧 */
const ACTION_SPAN = '24 s:24 m:8 l:6 xl:6 xxl:5'

function componentSpan(component: SearchFormItem['component']) {
  return COMPONENT_SPANS[component] || String(props.defaultSpan)
}

// 可见的表单项
const visibleSchema = computed(() => {
  if (collapsed.value && props.schema.length > props.collapseCount) {
    return props.schema.slice(0, props.collapseCount)
  }
  return props.schema
})

// 搜索
function handleSearch() {
  emit('search')
}

// 重置
function handleReset() {
  // 重置为默认值
  props.schema.forEach((item) => {
    props.model[item.field] = item.defaultValue ?? null
  })
  emit('reset')
}

// 暴露方法
defineExpose({
  /** 获取表单实例 */
  getFormRef: () => formRef.value,
  /** 重置表单 */
  reset: handleReset,
})
</script>

<style scoped lang="scss">
.search-form__item {
  min-width: 0;
}

// 桌面端限制输入控件宽度，避免超宽屏下输入框被拉得过长
@media (min-width: 1280px) {
  .search-form__item :deep(.n-form-item-blank) {
    max-width: 320px;
  }
}

.search-form__buttons {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
