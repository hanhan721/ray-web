/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

// Vue <script setup> 编译器宏 —— WSL 远程开发时 IDE 可能无法自动识别
declare global {
  const defineProps: typeof import('vue').defineProps
  const defineEmits: typeof import('vue').defineEmits
  const defineOptions: typeof import('vue').defineOptions
  const defineExpose: typeof import('vue').defineExpose
  const defineSlots: typeof import('vue').defineSlots
  const withDefaults: typeof import('vue').withDefaults
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_ENV: 'development' | 'staging' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
