/**
 * Tenant Redirect Helpers
 * Handles hard redirects to tenant subdomains
 */

/**
 * Build tenant URL from subdomain and optional path
 */
export function buildTenantUrl(subdomain: string, path: string = ''): string {
  const scheme = window.location.protocol.replace(':', '')
  const hostname = window.location.hostname

  // Extract base domain from current hostname
  // Example: "acme.dontworry.test" -> "dontworry.test"
  // Example: "tenant.localhost" -> "localhost"
  const parts = hostname.split('.')
  let baseDomain: string

  if (parts.length === 1) {
    // Single part (localhost, 127.0.0.1)
    baseDomain = parts[0] || 'localhost'
  } else {
    // Multiple parts - take everything except first (subdomain)
    baseDomain = parts.slice(1).join('.') || 'localhost'
  }

  // If we're already on a subdomain, replace it
  // Otherwise, prepend the subdomain
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
  window.location.href = url
}

