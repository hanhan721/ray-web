import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import typescriptEslint from 'typescript-eslint'

export default typescriptEslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'pnpm-lock.yaml', '.agents'],
  },
  {
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: typescriptEslint.parser,
      },
    },
  },
  {
    files: ['vite.config.ts', 'src/**/test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
  {
    files: ['src/views/**/index.vue'],
    rules: {
      // 页面入口按目录使用 index.vue，名称由目录表达。
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['src/components/ui/**/*.vue'],
    rules: {
      // 组件名和可选 class 来自 shadcn-vue 生成结果，改名或补默认值会在下次生成时被覆盖。
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
    },
  },
)
