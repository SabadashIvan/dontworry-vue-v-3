/**
 * useForm composable
 * Manages form state, validation, and API error handling
 */

import { ref, computed, shallowReactive, type Ref, type ComputedRef } from 'vue'
import type { ApiError } from '@/core/api/types'
import type { Validator } from '../utils/validators'
import { useField, type UseFieldReturn } from './useField'

export interface FormFieldConfig {
  name: string
  initialValue?: unknown
  validators?: Validator[]
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export interface UseFormOptions {
  fields: FormFieldConfig[]
  onSubmit: (values: Record<string, unknown>) => Promise<unknown> | unknown
  onSuccess?: (data: unknown) => void
  onError?: (error: ApiError) => void
  resetOnSuccess?: boolean
}

export interface UseFormReturn {
  fields: Record<string, UseFieldReturn>
  values: ComputedRef<Record<string, unknown>>
  errors: ComputedRef<Record<string, string | null>>
  isSubmitting: Ref<boolean>
  isValid: ComputedRef<boolean>
  isDirty: ComputedRef<boolean>
  submit: () => Promise<void>
  validate: () => boolean
  reset: () => void
  setFieldError: (fieldName: string, error: string | null) => void
  setApiErrors: (apiError: ApiError) => void
  clearErrors: () => void
}

/**
 * Form management composable
 */
export function useForm(options: UseFormOptions): UseFormReturn {
  const {
    fields: fieldConfigs,
    onSubmit,
    onSuccess,
    onError,
    resetOnSuccess = false,
  } = options

  // Initialize fields
  const fields: Record<string, UseFieldReturn> = shallowReactive({})
  for (const config of fieldConfigs) {
    fields[config.name] = useField({
      initialValue: config.initialValue,
      validators: config.validators,
      validateOnChange: config.validateOnChange,
      validateOnBlur: config.validateOnBlur,
    })
  }

  const isSubmitting = ref(false)

  /**
   * Get all field values
   */
  const values = computed(() => {
    const result: Record<string, unknown> = {}
    console.log('📊 values computed - fields:', fields)
    for (const name in fields) {
      const field = fields[name]
      console.log(`📊 Processing field "${name}":`, {
        fieldExists: !!field,
        valueExists: !!field?.value,
        valueValue: field?.value?.value,
      })
      if (field && field.value) {
        result[name] = field.value.value
      } else {
        console.warn(`⚠️ Field "${name}" has no value:`, field)
      }
    }
    console.log('📊 values computed result:', result)
    return result
  })

  /**
   * Get all field errors
   */
  const errors = computed(() => {
    const result: Record<string, string | null> = {}
    for (const name in fields) {
      const field = fields[name]
      if (field && field.error) {
        result[name] = field.error.value ?? null
      } else {
        result[name] = null
      }
    }
    return result
  })

  /**
   * Check if form is valid
   */
  const isValid = computed(() => {
    for (const name in fields) {
      const field = fields[name]
      if (field && field.error && field.error.value) {
        return false
      }
    }
    return true
  })

  /**
   * Check if form is dirty
   */
  const isDirty = computed(() => {
    for (const name in fields) {
      const field = fields[name]
      if (field && field.dirty && field.dirty.value) {
        return true
      }
    }
    return false
  })

  /**
   * Validate all fields
   */
  function validate(): boolean {
    let valid = true
    for (const name in fields) {
      const field = fields[name]
      if (field) {
        const fieldValid = field.validate()
        if (!fieldValid) {
          valid = false
        }
      }
    }
    return valid
  }

  /**
   * Set error for a specific field
   */
  function setFieldError(fieldName: string, error: string | null) {
    const field = fields[fieldName]
    if (field && typeof field.setError === 'function') {
      field.setError(error)
    }
  }

  /**
   * Set errors from API response (422 validation errors)
   */
  function setApiErrors(apiError: ApiError) {
    if (apiError.status === 422 && apiError.errors) {
      // Clear all errors first
      clearErrors()

      // Set errors from API
      for (const fieldName in apiError.errors) {
        const fieldErrors = apiError.errors[fieldName]
        if (fieldErrors && fieldErrors.length > 0) {
          // Use first error message for the field
          setFieldError(fieldName, fieldErrors[0] ?? null)
        }
      }
    }
  }

  /**
   * Clear all field errors
   */
  function clearErrors() {
    for (const name in fields) {
      const field = fields[name]
      if (field) {
        field.clearError()
      }
    }
  }

  /**
   * Reset form to initial state
   */
  function reset() {
    for (const name in fields) {
      const field = fields[name]
      if (field) {
        field.reset()
      }
    }
    isSubmitting.value = false
  }

  /**
   * Submit form
   */
  async function submit(): Promise<void> {
    console.log('🟢 useForm.submit() called')
    console.log('📊 Current values:', values.value)
    console.log('✅ isValid:', isValid.value)
    console.log('❌ Current errors:', errors.value)

    // Clear previous errors
    clearErrors()
    console.log('🧹 Cleared errors')

    // Validate all fields
    const isValidForm = validate()
    console.log('🔍 Validation result:', isValidForm)
    console.log('❌ Errors after validation:', errors.value)

    if (!isValidForm) {
      console.log('⛔ Validation failed, aborting submit')
      return
    }

    console.log('⏳ Setting isSubmitting = true')
    isSubmitting.value = true

    try {
      console.log('📤 Calling onSubmit with values:', values.value)
      const result = await onSubmit(values.value)
      console.log('✅ onSubmit completed, result:', result)

      // Reset form if configured
      if (resetOnSuccess) {
        console.log('🔄 Resetting form')
        reset()
      }

      // Call success callback
      if (onSuccess) {
        console.log('🎉 Calling onSuccess callback')
        onSuccess(result)
      }
    } catch (error: unknown) {
      console.error('❌ Error in submit:', error)
      // Handle API errors
      const err = error as { status?: number; message?: string; errors?: Record<string, string[]> }
      const apiError: ApiError = {
        status: err.status || 500,
        message: err.message || 'An error occurred',
        errors: err.errors,
      }

      console.log('📋 API Error details:', apiError)

      // Set field errors from API response (422)
      if (apiError.status === 422) {
        console.log('🔧 Setting API errors to fields')
        setApiErrors(apiError)
      }

      // Call error callback
      if (onError) {
        console.log('📞 Calling onError callback')
        onError(apiError)
      }

      // Re-throw for component handling
      throw apiError
    } finally {
      console.log('🏁 Setting isSubmitting = false')
      isSubmitting.value = false
    }
  }

  return {
    fields,
    values,
    errors,
    isSubmitting,
    isValid,
    isDirty,
    submit,
    validate,
    reset,
    setFieldError,
    setApiErrors,
    clearErrors,
  }
}
