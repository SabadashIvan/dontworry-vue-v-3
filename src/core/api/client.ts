/**
 * Base API Client Factory
 * Creates configured axios instances with interceptors
 */

import axios from 'axios'
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { getCsrfToken, CSRF_HEADER } from '../auth/csrf'
import { getToken } from '../auth/token'
import type { ApiResponse, ApiError } from './types'

/**
 * Create configured axios instance
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    withCredentials: true, // Important for Sanctum cookies
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add Authorization header if token exists
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Add CSRF token if available
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        config.headers[CSRF_HEADER] = csrfToken
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      // Backend returns envelope { data, message, meta }
      // Return data directly for convenience
      return response
    },
    async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      // Handle specific error codes
      if (error.response) {
        const status = error.response.status
        const responseData = error.response.data

        // Create typed error
        const apiError: ApiError = {
          status,
          message: responseData?.message || error.message || 'An error occurred',
          errors: responseData?.errors,
        }

        // Handle 401 Unauthorized
        if (status === 401) {
          // Clear auth state (will be handled by auth store)
          // Redirect will be handled by router guard
          return Promise.reject(apiError)
        }

        // Handle 419 CSRF Token Mismatch
        if (status === 419) {
          // Try to refresh CSRF cookie and retry once
          try {
            const { fetchCsrfCookie } = await import('../auth/csrf')
            await fetchCsrfCookie()

            // Retry the original request
            const config = error.config
            if (config) {
              const csrfToken = getCsrfToken()
              if (csrfToken && config.headers) {
                config.headers[CSRF_HEADER] = csrfToken
              }
              return client.request(config)
            }
          } catch (csrfError) {
            console.error('Failed to refresh CSRF token:', csrfError)
          }

          return Promise.reject(apiError)
        }

        // Handle other errors (403, 422, 429, 5xx)
        return Promise.reject(apiError)
      }

      // Network error or other
      const networkError: ApiError = {
        status: 0,
        message: error.message || 'Network error',
      }

      return Promise.reject(networkError)
    }
  )

  return client
}

/**
 * Extract data from API response envelope
 */
export function extractData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data
}
