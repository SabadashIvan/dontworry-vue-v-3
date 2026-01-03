/**
 * useFileUpload composable
 * Manages file upload state and FormData creation
 */

import { ref } from 'vue'
import type { AxiosInstance, AxiosProgressEvent } from 'axios'
import type { ApiError } from '@/core/api/types'
import { createFormData as createFormDataHelper } from '@/core/api/helpers'

export interface FileUploadOptions {
  apiClient: AxiosInstance
  endpoint: string
  fieldName?: string
  onProgress?: (progress: number) => void
  onSuccess?: (data: unknown) => void
  onError?: (error: ApiError) => void
}

export interface FileUploadReturn {
  file: ReturnType<typeof ref<File | null>>
  uploading: ReturnType<typeof ref<boolean>>
  progress: ReturnType<typeof ref<number>>
  error: ReturnType<typeof ref<string | null>>
  upload: (file: File, additionalData?: Record<string, unknown>) => Promise<unknown>
  reset: () => void
  setError: (error: string | null) => void
}

/**
 * File upload composable
 */
export function useFileUpload(options: FileUploadOptions): FileUploadReturn {
  const { apiClient, endpoint, fieldName = 'file', onProgress, onSuccess, onError } = options

  const file = ref<File | null>(null)
  const uploading = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  /**
   * Upload file to server
   */
  async function upload(
    fileToUpload: File,
    additionalData?: Record<string, unknown>
  ): Promise<unknown> {
    file.value = fileToUpload
    uploading.value = true
    progress.value = 0
    error.value = null

    try {
      const formData = createFormDataHelper(fileToUpload, fieldName, additionalData)

      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            progress.value = percentCompleted
            if (onProgress) {
              onProgress(percentCompleted)
            }
          }
        },
      })

      uploading.value = false
      progress.value = 100

      // Extract data from response envelope
      const responseData = response.data?.data ?? response.data

      if (onSuccess) {
        onSuccess(responseData)
      }

      return responseData
    } catch (err: unknown) {
      uploading.value = false
      progress.value = 0

      const apiError: ApiError = {
        status: (err as { status?: number }).status || 500,
        message: (err as { message?: string }).message || 'Upload failed',
        errors: (err as { errors?: Record<string, string[]> }).errors,
      }

      error.value = apiError.message

      if (onError) {
        onError(apiError)
      }

      throw apiError
    }
  }

  /**
   * Reset upload state
   */
  function reset() {
    file.value = null
    uploading.value = false
    progress.value = 0
    error.value = null
  }

  /**
   * Set error manually
   */
  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }

  return {
    file,
    uploading,
    progress,
    error,
    upload,
    reset,
    setError,
  }
}

