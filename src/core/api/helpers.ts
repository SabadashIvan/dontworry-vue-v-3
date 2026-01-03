/**
 * API Helper Functions
 */

import { centralApi } from './central'
import { tenantApi } from './tenant'
import type { AppMode } from '../tenancy/context'
import { getAppMode } from '../tenancy/context'
import type { AxiosInstance } from 'axios'

/**
 * Get appropriate API client based on mode
 */
export function getApiClient(mode?: AppMode): AxiosInstance {
  const currentMode = mode || getAppMode()
  return currentMode === 'central' ? centralApi : tenantApi
}

/**
 * Create FormData with file and additional fields
 * Useful for multipart/form-data requests (file uploads)
 *
 * @param file - File to upload
 * @param fieldName - Field name for the file (default: 'file')
 * @param additionalData - Additional fields to include in FormData
 * @returns FormData instance ready for upload
 *
 * @example
 * ```ts
 * const formData = createFormData(file, 'avatar', { name: 'John' })
 * await apiClient.post('/upload', formData, {
 *   headers: { 'Content-Type': 'multipart/form-data' }
 * })
 * ```
 */
export function createFormData(
  file: File,
  fieldName: string = 'file',
  additionalData?: Record<string, unknown>
): FormData {
  const formData = new FormData()
  formData.append(fieldName, file)

  if (additionalData) {
    for (const key in additionalData) {
      const value = additionalData[key]
      if (value !== null && value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value)
        } else if (typeof value === 'object' && !(value instanceof Date)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value))
        }
      }
    }
  }

  return formData
}

