/**
 * Main Router Configuration
 * Combines central and tenant routes with guards
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import centralRoutes from './central'
import tenantRoutes from './tenant'
import { requiresAuth, requiresTenant, requiresCentral } from './guards'
import { getCentralDomains } from '@/core/tenancy/resolver'

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
        const centralDomains = getCentralDomains()

        if (centralDomains.includes(hostname)) {
          return '/login'
        } else {
          return '/dashboard'
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
    let guardRedirected = false

    // Wrapper to track if guard redirected
    const trackedNext: NavigationGuardNext = ((...args: Parameters<NavigationGuardNext>) => {
      if (args.length > 0) {
        guardRedirected = true
      }
      return next(...args)
    }) as NavigationGuardNext

    // Apply guards based on route meta
    if (meta.requiresAuth) {
      await requiresAuth(to, from, trackedNext)
      // If requiresAuth redirected, stop here
      if (guardRedirected || !to.matched.length) {
        return
      }
    }

    if (meta.requiresTenant) {
      await requiresTenant(to, from, trackedNext)
      // If requiresTenant redirected, stop here
      if (guardRedirected || !to.matched.length) {
        return
      }
    }

    if (meta.requiresCentral) {
      requiresCentral(to, from, trackedNext)
      // If requiresCentral redirected, stop here
      if (guardRedirected || !to.matched.length) {
        return
      }
    }

    // No guards or all passed - only call next if no guard redirected
    if (!guardRedirected) {
      next()
    }
  }
)

export default router
