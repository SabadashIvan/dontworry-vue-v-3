/**
 * Main Router Configuration
 * Combines central and tenant routes with guards
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import centralRoutes from './central'
import tenantRoutes from './tenant'
import { requiresAuth, requiresTenant, requiresCentral } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...centralRoutes,
    ...tenantRoutes,
    {
      path: '/',
      redirect: () => {
        // Determine redirect based on app mode
        const hostname = window.location.hostname
        const centralDomains = (import.meta.env.VITE_CENTRAL_DOMAINS || 'localhost,127.0.0.1')
          .split(',')
          .map((d: string) => d.trim())

        if (centralDomains.includes(hostname)) {
          return '/login'
        } else {
          return '/app'
        }
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

// Global navigation guard
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const meta = to.meta || {}

    // Apply guards based on route meta
    if (meta.requiresAuth) {
      await requiresAuth(to, from, next)
      // If requiresAuth redirected, stop here
      if (!to.matched.length) {
        return
      }
    }

    if (meta.requiresTenant) {
      await requiresTenant(to, from, next)
      // If requiresTenant redirected, stop here
      if (!to.matched.length) {
        return
      }
    }

    if (meta.requiresCentral) {
      requiresCentral(to, from, next)
      // If requiresCentral redirected, stop here
      if (!to.matched.length) {
        return
      }
    }

    // No guards or all passed
    next()
  }
)

export default router
