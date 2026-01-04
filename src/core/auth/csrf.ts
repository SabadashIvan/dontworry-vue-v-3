/**
 * CSRF Cookie Management for Laravel Sanctum
 *
 * Sanctum requires CSRF cookie to be fetched before any stateful request.
 * The cookie is set by backend at /sanctum/csrf-cookie endpoint.
 */

import { normalizeHostname } from '@/core/tenancy/hostname'

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'

/**
 * Get CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === CSRF_COOKIE_NAME && value) {
      return decodeURIComponent(value)
    }
  }

  return null
}

/**
 * Fetch CSRF cookie from backend
 * Must be called before first stateful request (login, register, etc.)
 */
export async function fetchCsrfCookie(): Promise<void> {
  // Check if explicit backend URL is provided
  const explicitBackendUrl = import.meta.env.VITE_API_BASE_URL
  let apiBase: string

  if (explicitBackendUrl) {
    // Remove path prefix if present (CSRF endpoint is at root)
    apiBase = explicitBackendUrl.replace(/\/v\d+$/, '')
  } else {
    // Build API base URL dynamically (same host as frontend)
    const apiScheme = import.meta.env.VITE_API_SCHEME || 'http'
    const apiPort = import.meta.env.VITE_API_PORT || '8000'
    const currentHost = normalizeHostname(window.location.hostname || 'localhost')
    apiBase = `${apiScheme}://${currentHost}:${apiPort}`
  }

  try {
    const response = await fetch(`${apiBase}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF cookie: ${response.status}`)
    }
  } catch (error) {
    console.error('CSRF cookie fetch error:', error)
    throw error
  }
}

/**
 * Get CSRF header value for requests
 */
export function getCsrfHeader(): string | null {
  return getCsrfToken()
}

/**
 * CSRF header name for axios
 */
export const CSRF_HEADER = CSRF_HEADER_NAME
