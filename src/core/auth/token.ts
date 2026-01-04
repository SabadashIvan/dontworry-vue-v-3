/**
 * Token Storage Management
 * Handles storage and retrieval of Sanctum Bearer token
 */

import { normalizeHostname } from '@/core/tenancy/hostname'

const TOKEN_STORAGE_KEY = 'dontworry_auth_token'

function getCookieDomain(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const centralHost = import.meta.env.VITE_CENTRAL_HOST
  const hostname = normalizeHostname(centralHost || window.location.hostname)
  const parts = hostname.split('.')

  if (parts.length <= 1) {
    return null
  }

  return `.${parts.slice(-2).join('.')}`
}

function setTokenCookie(token: string): void {
  if (typeof document === 'undefined') {
    return
  }

  const domain = getCookieDomain()
  const secure = window.location.protocol === 'https:' ? ' Secure;' : ''
  const domainAttr = domain ? ` Domain=${domain};` : ''

  document.cookie = `${TOKEN_STORAGE_KEY}=${encodeURIComponent(token)}; Path=/;${domainAttr}${secure} SameSite=Lax;`
}

function getTokenCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';').map((cookie) => cookie.trim())
  const entry = cookies.find((cookie) => cookie.startsWith(`${TOKEN_STORAGE_KEY}=`))

  if (!entry) {
    return null
  }

  return decodeURIComponent(entry.split('=').slice(1).join('='))
}

function clearTokenCookie(): void {
  if (typeof document === 'undefined') {
    return
  }

  const domain = getCookieDomain()
  const domainAttr = domain ? ` Domain=${domain};` : ''
  document.cookie = `${TOKEN_STORAGE_KEY}=; Path=/;${domainAttr} Max-Age=0; SameSite=Lax;`
}

/**
 * Save token to localStorage
 */
export function saveToken(token: string): void {
  if (typeof localStorage === 'undefined') {
    console.warn('localStorage is not available')
    return
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  setTokenCookie(token)
}

/**
 * Sync token to localStorage without touching cookies.
 * Useful when token is restored from a cross-subdomain cookie.
 */
export function syncTokenToLocalStorage(token: string): void {
  if (typeof localStorage === 'undefined') {
    console.warn('localStorage is not available')
    return
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/**
 * Get token from localStorage
 */
export function getToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return getTokenCookie()
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY) || getTokenCookie()
}

/**
 * Remove token from localStorage
 */
export function removeToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
  clearTokenCookie()
}

/**
 * Check if token exists
 */
export function hasToken(): boolean {
  return getToken() !== null
}

/**
 * Clear all cookies from the current domain
 * This function attempts to delete all cookies by setting them with Max-Age=0
 * It tries different combinations of domain and path to ensure complete cleanup
 */
export function clearAllCookies(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  // Get all cookies
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim())

  // Get domain options
  const domain = getCookieDomain()
  const hostname = window.location.hostname

  // Common paths to try
  const paths = ['/', window.location.pathname]

  // Domain options: without domain (host-only), with domain, with parent domain
  const domainOptions: (string | null)[] = [null]
  if (domain) {
    domainOptions.push(domain)
  }
  if (hostname.includes('.')) {
    const parentDomain = `.${hostname.split('.').slice(-2).join('.')}`
    if (parentDomain !== domain) {
      domainOptions.push(parentDomain)
    }
  }

  // For each cookie, try to delete it with different domain/path combinations
  for (const cookie of cookies) {
    const [name] = cookie.split('=')
    if (!name) continue

    const decodedName = decodeURIComponent(name.trim())

    // Try all combinations
    for (const domainOption of domainOptions) {
      for (const path of paths) {
        const domainAttr = domainOption ? ` Domain=${domainOption};` : ''
        const secure = window.location.protocol === 'https:' ? ' Secure;' : ''

        // Try with SameSite=Lax
        document.cookie = `${decodedName}=; Path=${path};${domainAttr} Max-Age=0; SameSite=Lax;${secure}`
        // Try with SameSite=Strict
        document.cookie = `${decodedName}=; Path=${path};${domainAttr} Max-Age=0; SameSite=Strict;${secure}`
        // Try with SameSite=None (requires Secure)
        if (window.location.protocol === 'https:') {
          document.cookie = `${decodedName}=; Path=${path};${domainAttr} Max-Age=0; SameSite=None; Secure;`
        }
        // Try with Expires in the past (alternative method)
        document.cookie = `${decodedName}=; Path=${path};${domainAttr} Expires=Thu, 01 Jan 1970 00:00:00 GMT;${secure}`
      }
    }
  }
}
