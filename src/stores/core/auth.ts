/**
 * Authentication Store
 * Manages central user authentication state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { centralApi } from '@/core/api/central'
import { extractData } from '@/core/api/client'
import { saveToken, getToken, removeToken, clearAllCookies } from '@/core/auth/token'
import { fetchCsrfCookie } from '@/core/auth/csrf'
import type { CentralUser, ApiResponse, ApiError } from '@/core/api/types'
import { redirectToCentral } from '@/core/tenancy/redirect'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface AuthResponse {
  user: CentralUser
  token: string
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(getToken())
  const centralUser = ref<CentralUser | null>(null)
  const isReady = ref(false)

  // Getters
  const isAuthenticated = computed(() => {
    return token.value !== null && centralUser.value !== null
  })

  /**
   * Login user
   */
  async function login(credentials: LoginCredentials): Promise<void> {
    try {
      // Fetch CSRF cookie before login
      await fetchCsrfCookie()

      const response = await centralApi.post<ApiResponse<AuthResponse>>(
        '/users/auth/login',
        credentials
      )

      const { user, token: newToken } = extractData(response)

      // Save token and user
      saveToken(newToken)
      token.value = newToken
      centralUser.value = user
    } catch (error) {
      const apiError = error as ApiError
      throw apiError
    }
  }

  /**
   * Register new user
   */
  async function register(data: RegisterData): Promise<void> {
    try {
      // Fetch CSRF cookie before register
      await fetchCsrfCookie()

      const response = await centralApi.post<ApiResponse<AuthResponse>>(
        '/users/auth/register',
        data
      )

      const { user, token: newToken } = extractData(response)

      // Save token and user
      saveToken(newToken)
      token.value = newToken
      centralUser.value = user
    } catch (error) {
      const apiError = error as ApiError
      throw apiError
    }
  }

  /**
   * Logout user
   */
  async function logout(): Promise<void> {
    try {
      if (token.value) {
        // Call logout endpoint
        await centralApi.post('/users/auth/logout')
      }
    } catch (error) {
      // Even if logout fails, clear local state
      console.error('Logout error:', error)
    } finally {
      // Clear local state
      removeToken()
      token.value = null
      centralUser.value = null

      // Clear all cookies to prevent issues when logging in with different account
      clearAllCookies()

      // Redirect to central login
      redirectToCentral('/login')
    }
  }

  /**
   * Fetch current user (central)
   * Used to verify authentication status
   */
  async function fetchMe(): Promise<void> {
    try {
      if (!token.value) {
        throw new Error('No token available')
      }

      const response = await centralApi.get<ApiResponse<CentralUser>>('/users/me/central')
      centralUser.value = extractData(response)
    } catch (error) {
      // If fetch fails, clear auth state
      const apiError = error as ApiError
      if (apiError.status === 401) {
        removeToken()
        token.value = null
        centralUser.value = null
      }
      throw apiError
    }
  }

  /**
   * Hydrate store from localStorage on app start
   */
  async function hydrateFromStorage(): Promise<void> {
    const storedToken = getToken()

    if (storedToken) {
      token.value = storedToken

      // Try to fetch user to verify token is still valid
      try {
        await fetchMe()
      } catch {
        // Token is invalid, clear it
        removeToken()
        token.value = null
      }
    }

    isReady.value = true
  }

  return {
    // State
    token,
    centralUser,
    isReady,
    // Getters
    isAuthenticated,
    // Actions
    login,
    register,
    logout,
    fetchMe,
    hydrateFromStorage,
  }
})

