import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { getAccessToken } from '@/utils/request'
import { installMenuRoutes, removeRouteNames } from './menu-install'
import { viewLoaders } from './views'
import { LOGIN_NAME } from './meta'

let handlingNavigation = 0

export function readRedirect(value: unknown): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return null
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
    return null
  }
  if (
    candidate === '/login' ||
    candidate.startsWith('/login/') ||
    candidate.startsWith('/login?')
  ) {
    return null
  }
  return candidate
}

function loginLocation(redirect: string): RouteLocationRaw {
  return { name: LOGIN_NAME, query: { redirect } }
}

export function redirectToLogin(router: Router, redirect?: string) {
  if (router.currentRoute.value.name === LOGIN_NAME) return
  const query = redirect && redirect !== '/login' ? { redirect } : {}
  void router.replace({ name: LOGIN_NAME, query })
}

export function handleUnauthorized(router: Router) {
  const session = useSessionStore()
  const names = session.discard()
  removeRouteNames(router, names)
  if (handlingNavigation > 0) return
  const current = router.currentRoute.value.fullPath
  redirectToLogin(router, current === '/' ? undefined : current)
}

function ensureMenuRoutes(router: Router) {
  const session = useSessionStore()
  if (!session.profile || session.routesReady) return
  session.markRoutes(installMenuRoutes(router, session.profile.menus, viewLoaders))
}

async function resolveNavigation(
  router: Router,
  to: RouteLocationNormalized,
): Promise<RouteLocationRaw | string | true> {
  if (to.meta.public && to.name !== LOGIN_NAME) return true
  const session = useSessionStore()
  const token = getAccessToken()
  if (to.name === LOGIN_NAME) {
    if (!token) return true
    if (!session.profile) {
      const restored = await session.restore()
      if (restored === 'anonymous') return true
      if (restored === 'unavailable') return { name: 'home' }
    }
    ensureMenuRoutes(router)
    return readRedirect(to.query.redirect) ?? session.entryPath
  }
  if (!token) return loginLocation(to.fullPath)
  if (!session.profile) {
    const restored = await session.restore()
    if (restored === 'anonymous') return loginLocation(to.fullPath)
    if (restored === 'unavailable') return to.name === 'home' ? true : { name: 'home' }
  }
  if (session.profile && !session.routesReady) {
    ensureMenuRoutes(router)
    return to.fullPath
  }
  const permission = to.meta.permission
  if (to.name !== 'forbidden' && typeof permission === 'string' && !session.can(permission)) {
    return { name: 'forbidden' }
  }
  return true
}

export function installGuards(router: Router) {
  router.beforeEach(async (to) => {
    handlingNavigation += 1
    try {
      return await resolveNavigation(router, to)
    } finally {
      handlingNavigation -= 1
    }
  })
}
