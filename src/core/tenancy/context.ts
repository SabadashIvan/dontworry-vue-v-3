/**
 * Tenancy Context
 * Determines application mode (central/tenant) and builds API base URLs
 */

import { isCentralHost } from './resolver'

/**
 * Application mode
 */
export type AppMode = 'central' | 'tenant'

/**
 * Get current application mode based on hostname
 */
export function getAppMode(): AppMode {
  if (typeof window === 'undefined') {
    return 'central' // SSR fallback
  }

  const hostname = window.location.hostname
  return isCentralHost(hostname) ? 'central' : 'tenant'
}

/**
 * Get API base URL for the given mode
 */
export function getApiBaseUrl(mode: AppMode): string {
  // If explicit backend URL is provided (for production), use it
  const explicitBackendUrl = import.meta.env.VITE_API_BASE_URL
  if (explicitBackendUrl) {
    // For tenant mode, we still need to use current hostname (subdomain)
    // So explicit URL only works for central mode
    if (mode === 'central') {
      const pathPrefix = import.meta.env.VITE_API_PATH_PREFIX || '/v1'
      // Ensure explicit URL ends with path prefix
      return explicitBackendUrl.endsWith(pathPrefix)
        ? explicitBackendUrl
        : `${explicitBackendUrl}${pathPrefix}`
    }
    // For tenant mode, fall through to dynamic construction
  }

  // Dynamic URL construction (for local development)
  const scheme = import.meta.env.VITE_API_SCHEME || 'http'
  const port = import.meta.env.VITE_API_PORT || '8000'
  const pathPrefix = import.meta.env.VITE_API_PATH_PREFIX || '/v1'

  if (mode === 'central') {
    // Central API can use dedicated host or current hostname
    const centralHost = import.meta.env.VITE_CENTRAL_HOST
    const host = centralHost || window.location.hostname
    return `${scheme}://${host}:${port}${pathPrefix}`
  } else {
    // Tenant API must use current hostname (tenant subdomain)
    const hostname = window.location.hostname
    return `${scheme}://${hostname}:${port}${pathPrefix}`
  }
}

/**
 * Get current API base URL based on app mode
 */
export function getCurrentApiBaseUrl(): string {
  const mode = getAppMode()
  return getApiBaseUrl(mode)
}

