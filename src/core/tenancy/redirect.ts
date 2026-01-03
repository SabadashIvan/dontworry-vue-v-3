/**
 * Tenant Redirect Helpers
 * Handles hard redirects to tenant subdomains
 */

import { isCentralHost } from './resolver'
import { normalizeHostname } from './hostname'

/**
 * Extract base domain from a hostname
 * Always extracts the base domain, removing any subdomain
 * Example: "app.dontworry.cloud" -> "dontworry.cloud"
 * Example: "dontworry.cloud" -> "dontworry.cloud" (already base)
 * Example: "tenant1.dontworry.cloud" -> "dontworry.cloud"
 */
function extractBaseDomain(hostname: string): string {
  const normalizedHostname = normalizeHostname(hostname)
  const parts = normalizedHostname.split('.')

  // Single part (localhost, 127.0.0.1) - already base domain
  if (parts.length === 1) {
    return parts[0] || 'localhost'
  }

  // For 2 parts, check if it's a known central domain
  // If it's a central domain without subdomain (e.g., "dontworry.cloud"), use it as is
  if (parts.length === 2 && isCentralHost(hostname)) {
    return normalizedHostname
  }

  // For 2 parts where first is subdomain (e.g., "app.dontworry.cloud" or "tenant.localhost")
  if (parts.length === 2) {
    // First part is subdomain, second is base
    // "app.dontworry.cloud" -> "dontworry.cloud"
    // "tenant.localhost" -> "localhost"
    return parts[1] || 'localhost'
  }

  // For 3+ parts, first is subdomain, rest is base
  // "tenant1.dontworry.cloud" -> "dontworry.cloud"
  return parts.slice(1).join('.') || 'localhost'
}

/**
 * Build tenant URL from subdomain and optional path
 */
export function buildTenantUrl(subdomain: string, path: string = ''): string {
  if (!subdomain || subdomain === 'undefined') {
    throw new Error('Subdomain is required and cannot be undefined')
  }

  const scheme = window.location.protocol.replace(':', '')
  const hostname = window.location.hostname

  // Try to get base domain from VITE_CENTRAL_HOST first
  let baseDomain: string
  const centralHost = import.meta.env.VITE_CENTRAL_HOST

  if (centralHost) {
    // Extract base domain from central host (remove subdomain if present)
    baseDomain = extractBaseDomain(centralHost)
  } else {
    // Extract base domain from current hostname
    baseDomain = extractBaseDomain(hostname)
  }

  // Build tenant hostname
  const tenantHost = `${subdomain}.${baseDomain}`
  const port = window.location.port ? `:${window.location.port}` : ''

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${scheme}://${tenantHost}${port}${normalizedPath}`
}

/**
 * Perform hard redirect to tenant subdomain
 * This changes the hostname, so must be a full page navigation
 */
export function redirectToTenant(subdomain: string, path: string = ''): void {
  const url = buildTenantUrl(subdomain, path)
  window.location.href = url
}

/**
 * Get central domain URL
 */
export function getCentralUrl(path: string = ''): string {
  const scheme = window.location.protocol.replace(':', '')
  const centralHost = import.meta.env.VITE_CENTRAL_HOST

  if (centralHost) {
    const port = window.location.port ? `:${window.location.port}` : ''
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${scheme}://${centralHost}${port}${normalizedPath}`
  }

  // Fallback to current hostname (should be central)
  const hostname = window.location.hostname
  const port = window.location.port ? `:${window.location.port}` : ''
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${scheme}://${hostname}${port}${normalizedPath}`
}

/**
 * Redirect to central domain
 */
export function redirectToCentral(path: string = ''): void {
  const url = getCentralUrl(path)
  const currentUrl = window.location.href
  const urlWithoutQuery = url.split('?')[0] || url

  // Prevent infinite redirects - don't redirect if we're already on the target URL
  if (currentUrl === url || currentUrl.startsWith(urlWithoutQuery)) {
    console.warn('[redirectToCentral] Already on central domain, skipping redirect', { currentUrl, targetUrl: url })
    return
  }

  console.log('[redirectToCentral] Redirecting to central domain', { from: currentUrl, to: url })
  window.location.href = url
}
