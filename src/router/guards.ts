/**
 * Router Guards
 * Protects routes based on authentication and tenancy requirements
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/core/auth'
import { useTenantContextStore } from '@/stores/core/tenant-context'
import { redirectToCentral } from '@/core/tenancy/redirect'
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

  // Check if we're on tenant host
  if (!tenantContextStore.isTenantHost) {
    // Redirect to tenant selection on central domain
    redirectToCentral('/tenants/select')
    return
  }

  // Validate tenant user mapping by calling /users/me
  // This ensures the user is actually a member of this tenant
  try {
    await tenantApi.get('/users/me')
    next()
  } catch (err) {
    const error = err as ApiError
    // If 401 with "Could not define tenant user", user is not a member
    if (error.status === 401) {
      redirectToCentral('/tenants/select')
      return
    }

    // Other errors - allow navigation but log
    console.error('Tenant user validation error:', error)
    next()
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
    next({ name: 'tenant-dashboard' })
    return
  }

  next()
}

