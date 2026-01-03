/**
 * useErrorHandler Composable
 * Centralized error handling for API errors
 */

import { useUiStore } from '@/stores/core/ui'
import type { ApiError } from '@/core/api/types'

/**
 * Handle API error with appropriate user feedback
 */
export function useErrorHandler() {
  const uiStore = useUiStore()

  /**
   * Handle API error
   */
  function handleError(error: unknown, defaultMessage?: string): void {
    const apiError = error as ApiError

    // Handle specific status codes
    switch (apiError.status) {
      case 401:
        // Unauthorized - token invalid or expired
        uiStore.showToast('Your session has expired. Please log in again.', 'error', 5000)
        // Optionally trigger logout
        break

      case 403:
        // Forbidden - insufficient permissions
        uiStore.showToast(
          apiError.message || 'You do not have permission to perform this action.',
          'error'
        )
        break

      case 422:
        // Validation error
        const validationMessage = apiError.errors
          ? Object.values(apiError.errors)
              .flat()
              .join(', ')
          : apiError.message || 'Validation failed. Please check your input.'
        uiStore.showToast(validationMessage, 'error', 5000)
        break

      case 429:
        // Too many requests
        uiStore.showToast('Too many requests. Please try again later.', 'error', 5000)
        break

      case 500:
      case 502:
      case 503:
        // Server errors
        uiStore.showToast(
          apiError.message || 'Server error. Please try again later.',
          'error',
          5000
        )
        break

      default:
        // Generic error
        uiStore.showToast(
          apiError.message || defaultMessage || 'An error occurred. Please try again.',
          'error'
        )
    }
  }

  /**
   * Handle error and return error object for form validation
   */
  function handleValidationError(error: unknown): Record<string, string | null> {
    const apiError = error as ApiError

    if (apiError.status === 422 && apiError.errors) {
      const errors: Record<string, string | null> = {}
      for (const field in apiError.errors) {
        const fieldErrors = apiError.errors[field]
        errors[field] = Array.isArray(fieldErrors) ? fieldErrors[0] : String(fieldErrors)
      }
      return errors
    }

    return {}
  }

  /**
   * Check if error is a specific status code
   */
  function isErrorStatus(error: unknown, status: number): boolean {
    const apiError = error as ApiError
    return apiError.status === status
  }

  return {
    handleError,
    handleValidationError,
    isErrorStatus,
  }
}

