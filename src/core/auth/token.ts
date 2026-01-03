/**
 * Token Storage Management
 * Handles storage and retrieval of Sanctum Bearer token
 */

const TOKEN_STORAGE_KEY = 'dontworry_auth_token'

function getCookieDomain(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const centralHost = import.meta.env.VITE_CENTRAL_HOST
  const hostname = centralHost || window.location.hostname
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
