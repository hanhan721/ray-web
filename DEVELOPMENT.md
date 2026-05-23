# Ray Web 前端开发规范

## 技术栈

- **框架**: Vue 3.5+ (Composition API + `<script setup>`)
- **语言**: TypeScript 5.7+
- **构建工具**: Vite 6+
- **包管理器**: pnpm 8+
- **路由**: Vue Router 4
- **状态管理**: Pinia 2
- **HTTP 请求**: Axios
- **CSS 预处理**: Sass/SCSS
- **代码规范**: ESLint + Prettier

---

## 项目结构

```
ray-web/
├── public/                    # 静态资源（不会被构建处理）
├── src/
│   ├── api/                   # API 接口模块
│   │   ├── modules/           # 按业务模块划分
│   │   └── index.ts           # 统一导出
│   ├── assets/                # 静态资源（会被构建处理）
│   │   ├── images/
│   │   └── fonts/
│   ├── components/            # 公共组件
│   │   ├── common/            # 通用基础组件
│   │   └── business/          # 业务公共组件
│   ├── composables/           # 组合式函数（hooks）
│   ├── directives/            # 自定义指令
│   ├── layouts/               # 布局组件
│   ├── router/                # 路由配置
│   ├── stores/                # Pinia 状态管理
│   │   └── modules/           # 按模块划分的 store
│   ├── styles/                # 全局样式
│   │   ├── _variables.scss    # 变量
│   │   ├── _reset.scss        # 重置样式
│   │   ├── _common.scss       # 公共工具类
│   │   └── index.scss         # 入口
│   ├── types/                 # TypeScript 类型定义
│   ├── utils/                 # 工具函数
│   ├── views/                 # 页面组件
│   ├── App.vue                # 根组件
│   └── main.ts                # 入口文件
├── .env                       # 环境变量
├── .env.development           # 开发环境变量
├── .env.production            # 生产环境变量
├── eslint.config.js           # ESLint 配置
├── .prettierrc                # Prettier 配置
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
└── package.json
```

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase 或 kebab-case 目录 + index.vue | `UserProfile.vue` 或 `user-profile/index.vue` |
| TypeScript 文件 | camelCase | `userService.ts`, `formatDate.ts` |
| 样式文件 | kebab-case，私有文件加 `_` 前缀 | `_variables.scss`, `index.scss` |
| 常量文件 | camelCase | `constants.ts` |
| 类型定义文件 | camelCase + `.d.ts` 后缀 | `global.d.ts`, `env.d.ts` |

### 代码命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `UserProfile`, `DataTable` |
| 组合式函数 | camelCase + use 前缀 | `useUserInfo`, `useLoading` |
| Store | camelCase + use 前缀 + Store 后缀 | `useUserStore`, `useAppStore` |
| 常量 | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE`, `API_BASE_URL` |
| 变量/函数 | camelCase | `userName`, `getUserInfo` |
| 接口/类型 | PascalCase | `UserInfo`, `ApiResponse` |
| 枚举 | PascalCase，枚举值 UPPER_SNAKE_CASE | `enum Status { ACTIVE, INACTIVE }` |
| CSS 类名 | kebab-case | `.user-profile`, `.btn-primary` |

---

## Vue 组件规范

### 基本结构

```vue
<script setup lang="ts">
// 1. 导入语句
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/modules/user'
import type { UserInfo } from '@/types'

// 2. 组件选项
defineOptions({
  name: 'UserProfile',
})

// 3. Props 定义
interface Props {
  userId: string
  showAvatar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
})

// 4. Emits 定义
interface Emits {
  (e: 'update', value: UserInfo): void
  (e: 'delete', id: string): void
}

const emit = defineEmits<Emits>()

// 5. 响应式状态
const loading = ref(false)
const userInfo = ref<UserInfo | null>(null)

// 6. 计算属性
const fullName = computed(() => {
  return userInfo.value ? `${userInfo.value.firstName} ${userInfo.value.lastName}` : ''
})

// 7. Store 和路由
const router = useRouter()
const userStore = useUserStore()

// 8. 方法
async function fetchUserInfo() {
  loading.value = true
  try {
    // API 调用
  } finally {
    loading.value = false
  }
}

function handleUpdate() {
  if (userInfo.value) {
    emit('update', userInfo.value)
  }
}

// 9. 生命周期
onMounted(() => {
  fetchUserInfo()
})

// 10. 暴露给父组件的方法/属性
defineExpose({
  refresh: fetchUserInfo,
})
</script>

<template>
  <div class="user-profile">
    <!-- 模板内容 -->
  </div>
</template>

<style scoped lang="scss">
.user-profile {
  // 样式
}
</style>
```

### Props 规范

```typescript
// 使用 TypeScript 接口定义 props
interface Props {
  // 必填属性
  id: string
  // 可选属性
  title?: string
  // 带默认值的属性
  size?: 'small' | 'medium' | 'large'
  // 复杂类型
  data?: UserInfo[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '默认标题',
  size: 'medium',
  data: () => [],
})
```

### Emits 规范

```typescript
// 使用 TypeScript 接口定义 emits
interface Emits {
  (e: 'change', value: string): void
  (e: 'submit', data: FormData): void
  (e: 'cancel'): void
}

const emit = defineEmits<Emits>()

// 使用
emit('change', 'new value')
emit('submit', formData)
emit('cancel')
```

---

## Pinia Store 规范

使用 Composition API 风格（Setup Store）定义 Store：

```typescript
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useExampleStore = defineStore('example', () => {
  // State - 使用 ref
  const items = ref<Item[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters - 使用 computed
  const itemCount = computed(() => items.value.length)
  const hasItems = computed(() => items.value.length > 0)

  // Actions - 普通函数
  async function fetchItems() {
    loading.value = true
    error.value = null
    try {
      const response = await api.getItems()
      items.value = response.data
    } catch (e) {
      error.value = '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  function addItem(item: Item) {
    items.value.push(item)
  }

  function removeItem(id: string) {
    items.value = items.value.filter(item => item.id !== id)
  }

  function reset() {
    items.value = []
    loading.value = false
    error.value = null
  }

  // 返回需要暴露的状态和方法
  return {
    // State
    items,
    loading,
    error,
    // Getters
    itemCount,
    hasItems,
    // Actions
    fetchItems,
    addItem,
    removeItem,
    reset,
  }
})
```

---

## API 请求规范

### 目录结构

```
src/api/
├── modules/
│   ├── auth.ts      # 认证相关
│   ├── user.ts      # 用户相关
│   └── product.ts   # 产品相关
└── index.ts         # 统一导出
```

### API 模块示例

```typescript
// src/api/modules/user.ts
import { get, post, put, del } from '@/utils/request'

// 类型定义
export interface User {
  id: string
  username: string
  email: string
}

export interface CreateUserParams {
  username: string
  email: string
  password: string
}

export interface UpdateUserParams {
  username?: string
  email?: string
}

export interface UserListParams extends PageParams {
  keyword?: string
  status?: number
}

// API 方法
export function getUserList(params: UserListParams) {
  return get<PageResult<User>>('/users', params)
}

export function getUserById(id: string) {
  return get<User>(`/users/${id}`)
}

export function createUser(data: CreateUserParams) {
  return post<User>('/users', data)
}

export function updateUser(id: string, data: UpdateUserParams) {
  return put<User>(`/users/${id}`, data)
}

export function deleteUser(id: string) {
  return del(`/users/${id}`)
}
```

---

## 组合式函数 (Composables) 规范

```typescript
// src/composables/useLoading.ts
import { ref } from 'vue'

export function useLoading(initialValue = false) {
  const loading = ref(initialValue)

  function startLoading() {
    loading.value = true
  }

  function stopLoading() {
    loading.value = false
  }

  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    startLoading()
    try {
      return await fn()
    } finally {
      stopLoading()
    }
  }

  return {
    loading,
    startLoading,
    stopLoading,
    withLoading,
  }
}
```

```typescript
// src/composables/usePagination.ts
import { ref, computed } from 'vue'

export interface PaginationOptions {
  page?: number
  pageSize?: number
  total?: number
}

export function usePagination(options: PaginationOptions = {}) {
  const page = ref(options.page ?? 1)
  const pageSize = ref(options.pageSize ?? 10)
  const total = ref(options.total ?? 0)

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
  const hasMore = computed(() => page.value < totalPages.value)

  function setPage(newPage: number) {
    page.value = newPage
  }

  function setPageSize(newPageSize: number) {
    pageSize.value = newPageSize
    page.value = 1
  }

  function setTotal(newTotal: number) {
    total.value = newTotal
  }

  function reset() {
    page.value = 1
    total.value = 0
  }

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore,
    setPage,
    setPageSize,
    setTotal,
    reset,
  }
}
```

---

## TypeScript 规范

### 类型定义位置

- **全局类型**: `src/types/global.d.ts`
- **环境变量类型**: `src/types/env.d.ts`
- **业务类型**: 就近定义，放在对应模块目录下

### 类型导入导出

```typescript
// 使用 type 关键字导入类型
import type { UserInfo, ApiResponse } from '@/types'

// 使用 type 关键字导出类型
export type { UserInfo }
export type { ApiResponse }

// 混合导出
export { fetchUser, type UserParams }
```

### 避免 any

```typescript
// 不推荐
const data: any = response.data

// 推荐
const data: UserInfo = response.data

// 如果确实不知道类型，使用 unknown
const data: unknown = response.data
if (isUserInfo(data)) {
  // 类型收窄后使用
}
```

---

## CSS/SCSS 规范

### 使用 scoped 样式

```vue
<style scoped lang="scss">
.component-name {
  // 样式
}
</style>
```

### BEM 命名（推荐）

```scss
.user-card {
  &__header {
    // Block__Element
  }

  &__content {
    // Block__Element
  }

  &--active {
    // Block--Modifier
  }

  &__button {
    &--primary {
      // Block__Element--Modifier
    }
  }
}
```

### 使用变量

```scss
// 使用全局变量
.button {
  color: $primary-color;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius-md;
}
```

---

## Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式（不影响代码运行的变动） |
| refactor | 重构（既不是新增功能，也不是修复 bug） |
| perf | 性能优化 |
| test | 测试相关 |
| build | 构建系统或外部依赖变更 |
| ci | CI 配置文件和脚本变更 |
| chore | 其他不修改 src 或 test 文件的变更 |

### 示例

```bash
feat(user): 添加用户登录功能

- 实现登录表单组件
- 添加登录 API 接口
- 集成 token 存储逻辑

Closes #123
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 类型检查
pnpm type-check
```
