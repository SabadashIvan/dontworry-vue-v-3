/**
 * Router Guards
 * Protects routes based on authentication and tenancy requirements
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/core/auth'
import { useTenantContextStore } from '@/stores/core/tenant-context'
import { redirectToCentral } from '@/core/tenancy/redirect'
import { getCentralDomains } from '@/core/tenancy/resolver'
import { tenantApi } from '@/core/api/tenant'
import type { ApiError } from '@/core/api/types'

/**
 * Require authentication
 * Redirects to login if not authenticated
 */
export async function requiresAuth(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const authStore = useAuthStore()

  // If no token, redirect to login
  if (!authStore.token) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // If user not loaded, try to fetch
  if (!authStore.centralUser) {
    try {
      await authStore.fetchMe()
    } catch {
      // Token is invalid, redirect to login
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }

  next()
}

/**
 * Require tenant context
 * Redirects to tenant selection if not on tenant subdomain
 * Also validates tenant user mapping
 */
export async function requiresTenant(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  const tenantContextStore = useTenantContextStore()
  const hostname = window.location.hostname

  // Debug logging
  console.log('[requiresTenant]', {
    hostname,
    isTenantHost: tenantContextStore.isTenantHost,
    path: to.path,
    fromPath: from.path,
  })

  // Check if we're on tenant host
  if (!tenantContextStore.isTenantHost) {
    console.log('[requiresTenant] Not on tenant host, checking central domains...')
    // Use router redirect instead of hard redirect to avoid infinite loops
    // Only redirect if we're not already going to a central route
    if (!to.path.startsWith('/tenants/select') && !to.path.startsWith('/login')) {
      // Check if we're actually on central domain before redirecting
      const centralDomains = getCentralDomains()

      console.log('[requiresTenant] Central domains:', centralDomains, 'Current hostname:', hostname)

      if (centralDomains.includes(hostname)) {
        // We're on central domain, redirect via router
        console.log('[requiresTenant] Redirecting to tenant-select via router')
        return next({ name: 'tenant-select' })
      } else {
        // We're on unknown domain, do hard redirect to central
        console.log('[requiresTenant] Redirecting to central domain')
        redirectToCentral('/tenants/select')
        return
      }
    } else {
      // Already going to central route, allow it
      console.log('[requiresTenant] Already going to central route, allowing')
      return next()
    }
  }

  console.log('[requiresTenant] On tenant host, validating user...')

  // Skip validation if we're navigating between tenant routes
  // This prevents infinite loops during redirects (e.g., / -> /dashboard)
  // Also skip if we're on the same path (can happen during redirects)
  // Skip if navigating from root to any tenant route
  if (
    from.path === to.path ||
    (from.path === '/' && !to.path.startsWith('/tenants') && !to.path.startsWith('/login') && !to.path.startsWith('/register'))
  ) {
    console.log('[requiresTenant] Navigating within tenant routes, skipping validation to prevent loops', {
      from: from.path,
      to: to.path,
    })
    return next()
  }

  // Validate tenant user mapping by calling /users/me
  // This ensures the user is actually a member of this tenant
  try {
    await tenantApi.get('/users/me')
    return next()
  } catch (err) {
    const error = err as ApiError
    console.error('[requiresTenant] Validation error:', error)

    // If 401, user is not a member of this tenant
    if (error.status === 401) {
      // Prevent redirect loop: if we're already trying to go to tenant-select, allow it
      if (to.path.startsWith('/tenants/select') || to.name === 'tenant-select') {
        console.log('[requiresTenant] Already redirecting to tenant-select, allowing')
        return next()
      }

      const hostname = window.location.hostname
      const centralDomains = getCentralDomains()

      if (centralDomains.includes(hostname)) {
        // Already on central, use router redirect
        console.log('[requiresTenant] Redirecting to tenant-select (on central domain)')
        next({ name: 'tenant-select' })
      } else {
        // Need to go to central domain
        console.log('[requiresTenant] Redirecting to central domain (tenant-select)')
        redirectToCentral('/tenants/select')
      }
      return
    }

    // For network/CORS errors, allow navigation but log
    // This prevents infinite redirects if API is unreachable
    if (error.status === 0 || error.status >= 500) {
      console.warn('Tenant API unreachable, allowing navigation:', error)
      return next()
    }

    // Other errors - allow navigation but log
    console.error('Tenant user validation error:', error)
    return next()
  }
}

/**
 * Require central context
 * Redirects to tenant dashboard if on tenant subdomain
 */
export function requiresCentral(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
): void {
  const tenantContextStore = useTenantContextStore()

  if (tenantContextStore.isTenantHost) {
    // Redirect to tenant dashboard
    next({ name: 'dashboard' })
    return
  }

  next()
}
