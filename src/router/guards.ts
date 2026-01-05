/**
 * Router Guards
 * Protects routes based on authentication and tenancy requirements
 */

import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/core/auth'
import { useTenantContextStore } from '@/stores/core/tenant-context'
import { redirectToCentral } from '@/core/tenancy/redirect'
import { getCentralDomains } from '@/core/tenancy/resolver'
import { normalizeHostname } from '@/core/tenancy/hostname'
import { tenantApi } from '@/core/api/tenant'
import { getToken } from '@/core/auth/token'
import type { ApiError } from '@/core/api/types'

const API_GUARD_TIMEOUT_MS = 8000
let validatedTenantHost: string | null = null
let validatedToken: string | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}

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
      await withTimeout(authStore.fetchMe(), API_GUARD_TIMEOUT_MS, 'auth fetch')
    } catch (error) {
      console.warn('[requiresAuth] Failed to fetch central user, allowing navigation', error)
      // If token is missing, redirect to login
      if (!authStore.token) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
      }
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
  const hostname = normalizeHostname(window.location.hostname)

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

  const token = getToken()
  if (validatedTenantHost === hostname && validatedToken === token) {
    console.log('[requiresTenant] Tenant already validated for host/token, skipping revalidation', {
      hostname,
      from: from.path,
      to: to.path,
    })
    return next()
  }

  // Validate tenant user mapping by calling /users/me
  // This ensures the user is actually a member of this tenant
  try {
    await withTimeout(tenantApi.get('/users/me'), API_GUARD_TIMEOUT_MS, 'tenant user validation')
    console.log('[requiresTenant] Tenant user validation successful')
    validatedTenantHost = hostname
    validatedToken = token
    return next()
  } catch (err) {
    const error = err as ApiError
    const apiBaseUrl = tenantApi.defaults.baseURL
    const currentProtocol = window.location.protocol
    const currentHostname = window.location.hostname

    console.error('[requiresTenant] Validation error:', {
      error,
      status: error.status,
      message: error.message,
      apiBaseUrl,
      currentProtocol,
      currentHostname,
      path: to.path,
    })

    // If 401, user is not a member of this tenant
    if (error.status === 401) {
      validatedTenantHost = null
      validatedToken = null
      // Prevent redirect loop: if we're already trying to go to tenant-select, allow it
      if (to.path.startsWith('/tenants/select') || to.name === 'tenant-select') {
        console.log('[requiresTenant] Already redirecting to tenant-select, allowing')
        return next()
      }

      const hostname = normalizeHostname(window.location.hostname)
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

    // For network/CORS errors, allow navigation but log with detailed info
    // This prevents infinite redirects if API is unreachable
    if (error.status === 0 || error.status >= 500) {
      console.warn('[requiresTenant] Tenant API unreachable, allowing navigation:', {
        status: error.status,
        message: error.message,
        apiBaseUrl,
        currentProtocol,
        currentHostname,
        hint: error.status === 0
          ? 'This might be a network/CORS issue or protocol mismatch (HTTP vs HTTPS). Check API URL and CORS settings.'
          : 'Server error occurred. Check backend logs.',
      })
      return next()
    }

    // Other errors - allow navigation but log with details
    console.error('[requiresTenant] Tenant user validation error:', {
      status: error.status,
      message: error.message,
      errors: error.errors,
      apiBaseUrl,
      currentProtocol,
      currentHostname,
    })
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
    // Redirect to central domain for central-only routes
    redirectToCentral(to.fullPath)
    return
  }

  next()
}
