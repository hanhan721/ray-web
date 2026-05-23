# Ray-Web

Vue 3 + TypeScript 后台管理系统前端。

## 技术栈

Vue 3.5 | TypeScript 5.7 | Vite 6 | Pinia 2.3 | Vue Router 4.5 | Axios | Sass

## UI 库

### Naive UI
- 官网：https://www.naiveui.com/
- 版本：2.43.x
- 特点：TypeScript 友好、主题可定制、Vue 3 原生支持

### 图标库
- 使用 `@vicons/ionicons5`（Ionicons 5 图标）
- 用法：
```vue
<script setup lang="ts">
import { PersonOutline, LockClosedOutline } from '@vicons/ionicons5'
</script>

<template>
  <n-icon :component="PersonOutline" />
</template>
```

### 常用 Naive UI 组件
```vue
<!-- 布局 -->
<n-layout>、<n-card>、<n-space>、<n-grid>

<!-- 表单 -->
<n-form>、<n-input>、<n-select>、<n-date-picker>、<n-checkbox>

<!-- 数据展示 -->
<n-data-table>、<n-tag>、<n-descriptions>

<!-- 反馈 -->
<n-button>、<n-modal>、<n-message>、<n-notification>
```

### 全局 API（自动导入）
```ts
const message = useMessage()      // 消息提示
const dialog = useDialog()        // 对话框
const notification = useNotification()  // 通知
const loadingBar = useLoadingBar()      // 加载条
```

## 常用命令

```bash
pnpm dev              # 启动开发服务器 (localhost:3000)
pnpm build            # 构建生产版本
pnpm lint             # ESLint 检查修复
pnpm format           # Prettier 格式化
pnpm type-check       # TypeScript 类型检查
```

## 项目结构

```
src/
├── api/              # API 请求模块
├── components/       # 公共组件（自动注册）
├── hooks/            # 自定义组合式函数
├── router/           # 路由配置
├── stores/           # Pinia 状态管理
├── styles/           # 全局样式（_variables.scss 全局可用）
├── types/            # TypeScript 类型定义
├── utils/            # 工具函数
└── views/            # 页面视图
```

## 核心特性

- **自动导入**: Vue/Router/Pinia API 无需手动导入
- **组件自动注册**: `src/components/` 下组件自动全局注册
- **路径别名**: `@` 指向 `src/`
- **SCSS 变量**: `_variables.scss` 全局注入

## 页面开发简要规范

- **先复用，后新增**：开发页面前，先检查 `src/components/common`，优先使用已有通用组件，避免重复造轮子。
- 列表页默认使用 `ProTable`（搜索 + 表格 + 分页一体），不要在业务页重复实现搜索表单和分页逻辑。
- 常见交互统一复用：删除确认用 `ConfirmButton`，状态开关用 `StatusSwitch`，字典展示用 `DictTag`，字典筛选用 `DictSelect`。
- 页面目录保持一致：`src/views/模块/页面/index.vue`，页面内弹窗/抽屉表单放在同级 `components/`。
- 页面组件统一使用 `<script setup lang="ts">` + `defineOptions({ name: 'XxxPage' })`。
- API 统一走 `src/api/*.ts`，使用 `get/post/put/del` 封装，不在页面里直接写 axios。
- 类型优先复用现有类型；能不用 `any` 就不用，必要时用 `unknown` + 类型收窄。
- 异步操作统一 `try/catch`，成功/失败给出 `message` 提示；列表变更后调用 `tableRef.value?.refresh()` 刷新。
- 样式保持简洁：`scoped lang="scss"`，优先用全局变量（如 `$spacing-*`），不随意写全局覆盖样式。
- 新页面的交互和视觉尽量对齐已有系统页（`user/role/dict/dept/menu`），先保持一致性，再考虑差异化。

## 代码规范

### 组件结构
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 1. 导入
import { useUserStore } from '@/stores/user'
import type { FormInst, FormRules } from 'naive-ui'

// 2. 组件选项
defineOptions({
  name: 'PageName',
})

// 3. Props/Emits 定义
const props = defineProps<{ id: number }>()
const emit = defineEmits<{ (e: 'update', value: string): void }>()

// 4. 组合式函数
const router = useRouter()
const userStore = useUserStore()
const message = useMessage()

// 5. 响应式状态
const loading = ref(false)
const formData = reactive({ name: '', status: 1 })

// 6. 计算属性
const isValid = computed(() => formData.name.length > 0)

// 7. 函数方法
async function handleSubmit() { ... }

// 8. 生命周期
onMounted(() => { ... })
</script>

<style scoped lang="scss">
// 样式
</style>
```

### 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase 或 kebab-case | `UserList.vue` 或 `user-list.vue` |
| 组件 name | PascalCase | `defineOptions({ name: 'UserList' })` |
| 模板组件 | PascalCase | `<UserCard />` |
| 变量/函数 | camelCase | `const userList = ref([])` |
| 常量 | UPPER_SNAKE | `const MAX_SIZE = 100` |
| Props | camelCase | `defineProps<{ userId: number }>()` |
| Emits | camelCase | `emit('updateUser', user)` |
| CSS 类名 | kebab-case | `.user-card`, `.form-header` |

### ESLint 核心规则
```js
// TypeScript
'@typescript-eslint/no-explicit-any': 'warn'    // 避免 any，必要时可用
'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]

// Vue
'vue/component-name-in-template-casing': ['error', 'PascalCase']  // 模板中组件用 PascalCase
'vue/require-explicit-emits': 'error'           // 必须显式声明 emits
'vue/max-attributes-per-line': 'off'             // 不强制属性换行
'vue/padding-line-between-blocks': ['error', 'always']  // template/script/style 间空行

// 通用
'prefer-const': 'error'    // 优先 const
'no-var': 'error'          // 禁用 var
```

### Prettier 配置
```json
{
  "semi": false,           // 无分号
  "singleQuote": true,     // 单引号
  "tabWidth": 2,           // 2 空格缩进
  "printWidth": 120,       // 行宽 120
  "trailingComma": "es5"   // 尾逗号
}
```

### 最佳实践
- **类型声明**: Props、Emits、响应式变量尽量声明类型
- **组件命名**: 使用 `defineOptions({ name: 'XxxPage' })` 便于调试
- **样式隔离**: 始终使用 `scoped`，穿透用 `:deep()`
- **异步处理**: 使用 `async/await`，配合 try/catch/finally
- **表单验证**: 使用 Naive UI 的 `FormRules` 类型
- **避免 any**: 优先使用 `unknown`，必要时用 any 并加注释

## TypeScript 类型定义规范

### 何时定义 interface
**多处复用的核心实体**才定义 interface：
```typescript
// ✅ 核心实体，多个页面/组件复用
interface Admin {
  id: number
  username: string
  nickname?: string
  // ...
}

// ✅ 通用响应/分页结构
interface R<T> { code: number; msg: string; data: T }
interface IPage<T> { current: number; size: number; total: number; records: T[] }

// ✅ 树形结构
interface DeptTree extends Dept { children?: DeptTree[] }
```

### 何时使用 type
**枚举联合、类型别名、派生类型**使用 type：
```typescript
// ✅ 枚举联合
type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN'
type PermissionType = 'DIRECTORY' | 'MENU' | 'BUTTON'

// ✅ 派生类型（避免重复定义 CreateRequest/UpdateRequest）
type AdminForm = Partial<Omit<Admin, 'id' | 'createTime'>>
type WithChildren<T> = T & { children?: WithChildren<T>[] }

// ✅ 简单别名
type IdSet = Set<number>
```

### 何时直接用 any
**临时代码、第三方库无类型、快速原型**时可用 any：
```typescript
// ✅ 第三方库无类型定义
const chart: any = echarts.init(el)

// ✅ 复杂动态结构，类型收益低
function handleDynamicData(data: any) {
  // 内部做类型守卫
  if (typeof data.id === 'number') { ... }
}

// ❌ 避免：核心业务逻辑用 any
const user: any = await getUser()  // 应定义 User 类型
```

### 何时拆开参数手动传
**参数少于 3 个且不复用**时直接传参：
```typescript
// ✅ 参数少，直接传
function updateStatus(id: number, enabled: boolean) { ... }
function deleteByIds(ids: number[]) { ... }

// ✅ API 调用，Query 参数简单
api.get('/admin/page', { params: { pageNum, pageSize, username } })

// ❌ 避免：为 2 个参数定义 interface
interface UpdateStatusRequest { id: number; enabled: boolean }  // 过度封装
```

### 类型定义决策流程
```
需要定义类型吗？
    │
    ├─ 只用一次且参数 ≤3 个 → 直接传参数
    │
    ├─ 枚举值/联合类型 → type
    │
    ├─ 多处复用的对象结构 → interface
    │
    ├─ 基于现有类型派生 → type + 工具类型
    │
    └─ 第三方库/临时代码 → any（加注释说明）
```

### 类型文件组织
```
src/types/
├── global.d.ts      # 全局声明（R, IPage, PageQuery）
├── enums.ts         # 通用枚举（Gender, PermissionType, Status）
├── permission.ts    # 权限相关类型
└── [module].ts      # 其他模块类型（按需创建）
```

### 避免类型爆炸
```typescript
// ❌ 过度封装 - 为每个操作定义独立类型
interface AdminCreateRequest { ... }
interface AdminUpdateRequest { ... }
interface AdminQuery { ... }
interface AdminVO { ... }

// ✅ 精简方案 - 核心实体 + 工具类型派生
interface Admin { ... }
type AdminForm = Partial<Omit<Admin, 'id' | 'createTime'>>
type AdminQuery = PageQuery & { username?: string; enabled?: boolean }
```

### 样式规范
```scss
// 使用 :deep() 穿透组件样式
:deep(.n-input) {
  --n-height: 48px !important;
}

// BEM 风格命名
.user-card {
  &__header { ... }
  &__content { ... }
  &--active { ... }
}

// 响应式断点
@media (max-width: 480px) { ... }
@media (max-width: 768px) { ... }
@media (max-width: 1024px) { ... }
```

## 调试规范

**使用 Chrome DevTools 进行调试**，不要使用 `console.log` 调试。

### 调试方式
| 场景 | 方法 |
|------|------|
| 断点调试 | DevTools Sources 面板设置断点 |
| 条件断点 | 右键断点 → Add conditional breakpoint |
| DOM 变化 | Elements 面板 → Break on → subtree modifications |
| 网络请求 | Network 面板查看请求/响应 |
| Vue 状态 | 安装 Vue DevTools 扩展 |
| Pinia 状态 | Vue DevTools → Pinia 面板 |

### 代码中的调试
```typescript
// ✅ 使用 debugger 语句（调试完删除）
function handleSubmit() {
  debugger  // 浏览器会在此暂停
  // ...
}

// ❌ 避免提交 console.log
console.log('debug:', data)  // 调试完必须删除
```

### Vue DevTools
- 安装：Chrome 扩展商店搜索 "Vue.js devtools"
- 功能：组件树、状态检查、时间旅行、性能分析
- Pinia：可直接查看/修改 store 状态

### 常用 DevTools 快捷键
| 快捷键 | 功能 |
|--------|------|
| `F12` / `Ctrl+Shift+I` | 打开 DevTools |
| `Ctrl+Shift+C` | 选择元素 |
| `Ctrl+P` | 快速打开文件 |
| `Ctrl+Shift+P` | 命令面板 |
| `F8` | 暂停/继续执行 |
| `F10` | 单步跳过 |
| `F11` | 单步进入 |

## Git 提交

```
<type>(<scope>): <subject>
```
type: feat | fix | docs | style | refactor | perf | test | chore
