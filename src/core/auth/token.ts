/**
 * Token Storage Management
 * Handles storage and retrieval of Sanctum Bearer token
 */

const TOKEN_STORAGE_KEY = 'dontworry_auth_token'

/**
 * Save token to localStorage
 */
export function saveToken(token: string): void {
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
    return null
  }
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * Remove token from localStorage
 */
export function removeToken(): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * Check if token exists
 */
export function hasToken(): boolean {
  return getToken() !== null
}

