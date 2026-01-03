/**
 * useField composable
 * Manages validation state for a single form field
 */

import { ref, watch } from 'vue'
import type { Validator } from '../utils/validators'

export interface UseFieldOptions<T = unknown> {
  initialValue?: T
  validators?: Validator[]
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export interface UseFieldReturn {
  value: ReturnType<typeof ref>
  error: ReturnType<typeof ref<string | null>>
  touched: ReturnType<typeof ref<boolean>>
  dirty: ReturnType<typeof ref<boolean>>
  validate: () => boolean
  reset: () => void
  setError: (error: string | null) => void
  clearError: () => void
  handleBlur: () => void
}

/**
 * Field validation composable
 */
export function useField<T = unknown>(options: UseFieldOptions<T> = {}): UseFieldReturn {
  const {
    initialValue = '',
    validators = [],
    validateOnChange = false,
    validateOnBlur = false,
  } = options

  // Store initialValue in a ref to avoid closure issues
  const initialValueRef = ref(initialValue)
  const value = ref(initialValue)
  const error = ref<string | null>(null)
  const touched = ref(false)
  const dirty = ref(false)

  /**
   * Validate field value
   */
  function validate(): boolean {
    if (validators.length === 0) {
      error.value = null
      return true
    }

    for (const validator of validators) {
      const result = validator(value.value)
      if (result !== true) {
        error.value = result
        return false
      }
    }

    error.value = null
    return true
  }

  /**
   * Reset field to initial state
   */
  function reset() {
    value.value = initialValueRef.value
    error.value = null
    touched.value = false
    dirty.value = false
  }

  /**
   * Set error manually (e.g., from API)
   */
  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Watch for value changes
   */
  watch(
    value,
    (newValue) => {
      // Mark as dirty if value changed from initial
      dirty.value = newValue !== initialValueRef.value

      // Validate on change if enabled
      if (validateOnChange && touched.value) {
        validate()
      }
    },
    { immediate: false, flush: 'post' }
  )

  /**
   * Handle blur event - mark as touched and validate if enabled
   */
  function handleBlur() {
    touched.value = true
    if (validateOnBlur) {
      validate()
    }
  }

  return {
    value,
    error,
    touched,
    dirty,
    validate,
    reset,
    setError,
    clearError,
    handleBlur,
  }
}

