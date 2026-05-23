<!--
  字典组件测试页面

  本页面用于测试和演示字典相关组件的用法：
  - DictTag: 字典标签组件
  - DictSelect: 字典选择器组件

  调试方式：
  1. 打开 Chrome DevTools (F12)
  2. 在 Sources 面板可以设置断点调试
  3. 在 Vue DevTools 中可以查看组件状态

  注意：需要后端提供字典数据 API
-->
<template>
  <div class="dict-test">
    <NCard title="DictTag 字典标签组件">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            根据字典类型 (type) 和字典值 (value) 显示对应的标签文本和颜色
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          基础用法
        </NDivider>
        <NSpace>
          <span>性别标签：</span>
          <DictTag type="sys_gender" value="1" />
          <DictTag type="sys_gender" value="2" />
          <DictTag type="sys_gender" value="0" />
        </NSpace>

        <NDivider title-placement="left">
          状态标签
        </NDivider>
        <NSpace>
          <span>状态标签：</span>
          <DictTag type="sys_status" value="1" />
          <DictTag type="sys_status" value="0" />
        </NSpace>

        <NDivider title-placement="left">
          空值处理
        </NDivider>
        <NSpace>
          <span>空值显示：</span>
          <DictTag type="sys_gender" :value="null" />
          <DictTag type="sys_gender" :value="undefined" />
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="dictTagCode" language="vue" />
      </NSpace>
    </NCard>

    <NCard title="DictSelect 字典选择器组件" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            根据字典类型 (type) 自动加载选项，支持单选和多选
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          单选模式
        </NDivider>
        <NSpace align="center">
          <span>选择性别：</span>
          <DictSelect
            v-model="genderValue"
            type="sys_gender"
            placeholder="请选择性别"
            style="width: 200px"
          />
          <span>当前值：{{ genderValue ?? '未选择' }}</span>
        </NSpace>

        <NDivider title-placement="left">
          多选模式
        </NDivider>
        <NSpace align="center">
          <span>选择状态：</span>
          <DictSelect
            v-model="statusValues"
            type="sys_status"
            multiple
            placeholder="请选择状态"
            style="width: 300px"
          />
          <span>当前值：{{ statusValues?.join(', ') || '未选择' }}</span>
        </NSpace>

        <NDivider title-placement="left">
          禁用状态
        </NDivider>
        <NSpace align="center">
          <span>禁用选择器：</span>
          <DictSelect
            v-model="genderValue"
            type="sys_gender"
            disabled
            style="width: 200px"
          />
        </NSpace>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="dictSelectCode" language="vue" />
      </NSpace>
    </NCard>

    <NCard title="DictStore 字典缓存" style="margin-top: 16px">
      <NSpace vertical size="large">
        <NDescriptions label-placement="left" :column="1">
          <NDescriptionsItem label="功能说明">
            字典数据统一管理，支持缓存和懒加载
          </NDescriptionsItem>
        </NDescriptions>

        <NDivider title-placement="left">
          缓存状态
        </NDivider>
        <NSpace>
          <NButton @click="checkCache">
            检查缓存状态
          </NButton>
          <NButton @click="refreshDict">
            刷新字典
          </NButton>
          <NButton type="warning" @click="clearCache">
            清除所有缓存
          </NButton>
        </NSpace>
        <NAlert v-if="cacheInfo" :type="cacheInfo.type">
          {{ cacheInfo.message }}
        </NAlert>

        <NDivider title-placement="left">
          代码示例
        </NDivider>
        <NCode :code="dictStoreCode" language="typescript" />
      </NSpace>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { useDictStore } from '@/stores/dict'

defineOptions({
  name: 'DictTest',
})

const dictStore = useDictStore()
const message = useMessage()

// 测试数据
const genderValue = ref<string | null>(null)
const statusValues = ref<string[]>([])
const cacheInfo = ref<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null)

// 检查缓存状态
function checkCache() {
  const genderCached = dictStore.isCached('sys_gender')
  const statusCached = dictStore.isCached('sys_status')
  cacheInfo.value = {
    type: genderCached || statusCached ? 'success' : 'info',
    message: `sys_gender: ${genderCached ? '已缓存' : '未缓存'}, sys_status: ${statusCached ? '已缓存' : '未缓存'}`,
  }
}

// 刷新字典
async function refreshDict() {
  await dictStore.refresh('sys_gender')
  message.success('字典已刷新')
  checkCache()
}

// 清除缓存
function clearCache() {
  dictStore.clearCache()
  message.success('缓存已清除')
  cacheInfo.value = { type: 'warning', message: '所有字典缓存已清除' }
}

// 代码示例
const dictTagCode = `<!-- 基础用法 -->
<DictTag type="sys_gender" :value="row.gender" />

<!-- 状态标签 -->
<DictTag type="sys_status" :value="row.status" />

<!-- 在表格中使用 -->
<NDataTable :columns="columns" :data="data">
  <template #status="{ row }">
    <DictTag type="sys_status" :value="row.status" />
  </template>
</NDataTable>`

const dictSelectCode = `<!-- 单选 -->
<DictSelect
  v-model="form.gender"
  type="sys_gender"
  placeholder="请选择性别"
/>

<!-- 多选 -->
<DictSelect
  v-model="form.tags"
  type="sys_tags"
  multiple
  placeholder="请选择标签"
/>

<!-- 禁用状态 -->
<DictSelect
  v-model="form.status"
  type="sys_status"
  disabled
/>`

const dictStoreCode = `import { useDictStore } from '@/stores/dict'

const dictStore = useDictStore()

// 获取字典列表（自动缓存）
const items = await dictStore.getDict('sys_gender')

// 获取字典标签
const label = await dictStore.getLabel('sys_gender', '1')

// 同步获取（需要先确保数据已加载）
const labelSync = dictStore.getLabelSync('sys_gender', '1')

// 刷新指定字典
await dictStore.refresh('sys_gender')

// 清除所有缓存
dictStore.clearCache()

// 检查是否已缓存
const cached = dictStore.isCached('sys_gender')`
</script>

<style scoped lang="scss">
.dict-test {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}
</style>
