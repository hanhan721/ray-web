import type { RouteRecordRaw } from 'vue-router'
import { AdminLayout } from '@/layouts'

/**
 * 静态路由 - 无需权限即可访问
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
    },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: {
      title: '无权限',
      requiresAuth: false,
    },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '页面不存在',
      requiresAuth: false,
    },
  },
]

/**
 * 基础路由 - 需要登录但不需要动态权限
 * Dashboard 作为默认首页，在动态路由加载前就可访问
 */
export const basicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Root',
    component: AdminLayout,
    redirect: '/dashboard',
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '首页',
          icon: 'HomeOutline',
          requiresAuth: true,
        },
      },
      // 组件测试页面（仅开发环境）
      ...(import.meta.env.DEV
        ? [
            {
              path: 'test',
              name: 'TestIndex',
              component: () => import('@/views/test/index.vue'),
              meta: {
                title: '组件测试',
                icon: 'ConstructOutline',
                requiresAuth: true,
              },
            },
            {
              path: 'test/dict',
              name: 'DictTest',
              component: () => import('@/views/test/DictTest.vue'),
              meta: {
                title: '字典组件测试',
                requiresAuth: true,
              },
            },
            {
              path: 'test/permission',
              name: 'PermissionTest',
              component: () => import('@/views/test/PermissionTest.vue'),
              meta: {
                title: '权限组件测试',
                requiresAuth: true,
              },
            },
            {
              path: 'test/pro-table',
              name: 'ProTableTest',
              component: () => import('@/views/test/ProTableTest.vue'),
              meta: {
                title: 'ProTable组件测试',
                requiresAuth: true,
              },
            },
            {
              path: 'test/p2-component',
              name: 'P2ComponentTest',
              component: () => import('@/views/test/P2ComponentTest.vue'),
              meta: {
                title: 'P2组件测试',
                requiresAuth: true,
              },
            },
          ]
        : []),
    ],
  },
]

/**
 * 404 兜底路由 - 必须最后添加
 */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'NotFoundRedirect',
  redirect: '/404',
}
