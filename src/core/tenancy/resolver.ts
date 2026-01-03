/**
 * Tenancy Resolver
 * Extracts tenant subdomain and determines host type
 */

import { normalizeHostname } from './hostname'

/**
 * Extract subdomain from hostname
 * Example: "acme.dontworry.test" -> "acme"
 * Example: "localhost" -> null
 */
export function extractSubdomain(hostname: string): string | null {
  const normalizedHostname = normalizeHostname(hostname)

  // Split by dot
  const parts = normalizedHostname.split('.')

  // If only one part (e.g., "localhost"), no subdomain
  if (parts.length <= 1) {
    return null
  }

  // If two parts (e.g., "dontworry.test"), check if first part is a subdomain
  // For local development, we might have "tenant.localhost" or "tenant.127.0.0.1"
  // For production, we have "tenant.dontworry.com"

  // Check if first part is a known central domain
  const centralDomains = getCentralDomains()
  const isCentralDomain = centralDomains.includes(normalizedHostname)

  if (isCentralDomain) {
    return null
  }

  // First part is the subdomain
  return parts[0] || null
}

/**
 * Get list of central domains from environment
 */
export function getCentralDomains(): string[] {
  const envValue = import.meta.env.VITE_CENTRAL_DOMAINS
  const centralHost = import.meta.env.VITE_CENTRAL_HOST

  const domains = envValue
    ? (envValue as string)
      .split(',')
      .map(domain => normalizeHostname(domain))
      .filter(domain => domain.length > 0)
    : ['localhost', '127.0.0.1']

  const normalizedCentralHost = centralHost ? normalizeHostname(centralHost) : ''

  if (normalizedCentralHost && !domains.includes(normalizedCentralHost)) {
    domains.unshift(normalizedCentralHost)
  }

  return Array.from(new Set(domains))
}

/**
 * Check if hostname is a central domain
 */
export function isCentralHost(hostname: string): boolean {
  const normalizedHostname = normalizeHostname(hostname)
  const centralDomains = getCentralDomains()
  return centralDomains.includes(normalizedHostname)
}

/**
 * Get current tenant subdomain from window.location
 */
export function getTenantSubdomain(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return extractSubdomain(window.location.hostname)
}
