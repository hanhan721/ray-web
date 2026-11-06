/// <reference types="vitest/config" />

import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // 后端控制器映射在 /api 下，且没有 servlet context-path，因此原样转发。
      '/api': {
        target: 'http://127.0.0.1:9527',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // 浏览器会带上开发服务器的 Origin。后端只放行 5173 和 3000，
            // 5173 被占用时改用其他端口会被 Spring 回 403。代理本身已是同源转发，
            // 去掉 Origin 后不再按跨域拒绝。
            proxyReq.removeHeader('origin')
          })
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/test/**/*.test.ts'],
  },
})
