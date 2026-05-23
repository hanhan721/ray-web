import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import * as parserVue from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

// 浏览器全局变量
const browserGlobals = {
  // DOM
  document: 'readonly',
  window: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  console: 'readonly',
  // 定时器
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  // 事件类型
  Event: 'readonly',
  MouseEvent: 'readonly',
  KeyboardEvent: 'readonly',
  WheelEvent: 'readonly',
  DragEvent: 'readonly',
  TouchEvent: 'readonly',
  FocusEvent: 'readonly',
  InputEvent: 'readonly',
  // DOM 类型
  HTMLElement: 'readonly',
  HTMLInputElement: 'readonly',
  HTMLFormElement: 'readonly',
  Element: 'readonly',
  Node: 'readonly',
  NodeList: 'readonly',
  // 其他
  FormData: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  fetch: 'readonly',
  AbortController: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  IntersectionObserver: 'readonly',
}

// global.d.ts 中 declare 的全局类型
const globalDeclareTypes = {
  R: 'readonly',
  IPage: 'readonly',
  PageQuery: 'readonly',
  WithChildren: 'readonly',
  FormType: 'readonly',
  IdSet: 'readonly',
  ColumnConfigItem: 'readonly',
}

// 自动导入的全局变量
const autoImportGlobals = {
  // Vue
  ref: 'readonly',
  computed: 'readonly',
  reactive: 'readonly',
  watch: 'readonly',
  watchEffect: 'readonly',
  onMounted: 'readonly',
  onUnmounted: 'readonly',
  onBeforeMount: 'readonly',
  onBeforeUnmount: 'readonly',
  onActivated: 'readonly',
  onDeactivated: 'readonly',
  nextTick: 'readonly',
  toRef: 'readonly',
  toRefs: 'readonly',
  toValue: 'readonly',
  unref: 'readonly',
  shallowRef: 'readonly',
  triggerRef: 'readonly',
  customRef: 'readonly',
  markRaw: 'readonly',
  toRaw: 'readonly',
  isRef: 'readonly',
  isProxy: 'readonly',
  isReactive: 'readonly',
  isReadonly: 'readonly',
  provide: 'readonly',
  inject: 'readonly',
  h: 'readonly',
  defineComponent: 'readonly',
  defineAsyncComponent: 'readonly',
  getCurrentInstance: 'readonly',
  useAttrs: 'readonly',
  useSlots: 'readonly',
  useCssModule: 'readonly',
  useCssVars: 'readonly',
  useModel: 'readonly',
  useTemplateRef: 'readonly',
  useId: 'readonly',
  // Vue Router
  useRoute: 'readonly',
  useRouter: 'readonly',
  useLink: 'readonly',
  onBeforeRouteLeave: 'readonly',
  onBeforeRouteUpdate: 'readonly',
  // Pinia
  defineStore: 'readonly',
  storeToRefs: 'readonly',
  // Naive UI
  useMessage: 'readonly',
  useDialog: 'readonly',
  useNotification: 'readonly',
  useLoadingBar: 'readonly',
}

export default [
  // 忽略文件
  {
    ignores: ['node_modules/**', 'dist/**', '*.d.ts', 'src/types/auto-imports.d.ts', 'src/types/components.d.ts'],
  },

  // JavaScript 基础规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // Vue 规则
  ...pluginVue.configs['flat/recommended'],

  // Vue 文件解析配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: 'module',
        ecmaVersion: 'latest',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...browserGlobals,
        ...autoImportGlobals,
        ...globalDeclareTypes,
      },
    },
  },

  // 自定义规则
  {
    files: ['**/*.{js,ts,vue}'],
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // Vue
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/require-explicit-emits': 'error',
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/custom-event-name-casing': ['error', 'camelCase'],
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'never', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/max-attributes-per-line': 'off',
      'vue/padding-line-between-blocks': ['error', 'always'],

      // 通用
      'no-console': 'off',
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
]
