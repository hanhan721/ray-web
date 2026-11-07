import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { installGuards } from './guard'
import { LOGIN_NAME } from './meta'

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/login',
        name: LOGIN_NAME,
        component: () => import('@/views/login/index.vue'),
        meta: { public: true, title: '登录' },
      },
      {
        path: '/style-guide',
        name: 'style-guide',
        component: () => import('@/views/style-guide/StyleGuide.vue'),
        meta: { public: true, title: '风格校验' },
      },
      {
        path: '/',
        name: 'admin',
        component: AdminLayout,
        children: [
          {
            path: '',
            name: 'home',
            component: () => import('@/views/home/index.vue'),
            meta: { title: '工作台' },
          },
          {
            path: 'file',
            name: 'file-page',
            component: () => import('@/views/system/file/index.vue'),
            meta: { title: '文件' },
          },
          {
            path: 'forbidden',
            name: 'forbidden',
            component: () => import('@/views/forbidden/index.vue'),
            meta: { title: '没有访问权限' },
          },
          {
            path: 'denied',
            name: 'denied',
            component: () => import('@/views/forbidden/index.vue'),
            meta: { title: '没有访问权限', permission: 'stage4:missing' },
          },
          {
            path: ':pathMatch(.*)*',
            name: 'not-found',
            component: () => import('@/views/not-found/index.vue'),
            meta: { title: '没有这个页面' },
          },
        ],
      },
    ],
  })
  installGuards(router)
  return router
}
