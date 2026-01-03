/**
 * Notification Preferences Store
 * Manages notification preferences matrix
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type {
  PreferencesMatrix,
  UpdatePreferencesDTO,
  UpdateSinglePreferenceDTO,
} from '@/features/notifications/types'

export const useNotificationPreferencesStore = defineStore('notifications/preferences', () => {
  // State
  const matrix = ref<PreferencesMatrix | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Fetch preferences matrix
   */
  async function fetchPreferences(): Promise<PreferencesMatrix> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<PreferencesMatrix>>('/notifications/preferences')
      const data = extractData(response)
      matrix.value = data
      return data
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update preferences matrix (bulk)
   */
  async function updatePreferences(data: UpdatePreferencesDTO): Promise<PreferencesMatrix> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<PreferencesMatrix>>('/notifications/preferences', {
        preferences: data.preferences,
      })

      const updatedMatrix = extractData(response)
      matrix.value = updatedMatrix

      uiStore.showToast('Preferences updated successfully', 'success')
      return updatedMatrix
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update preferences', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update single preference
   */
  async function updateSinglePreference(data: UpdateSinglePreferenceDTO): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.put('/notifications/preferences/single', {
        group: data.group,
        channel: data.channel,
        enabled: data.enabled,
        settings: data.settings,
      })

      // Update local matrix
      if (matrix.value) {
        const groupKey = String(data.group)
        const channelKey = String(data.channel)

        if (!matrix.value[groupKey]) {
          matrix.value[groupKey] = {}
        }

        matrix.value[groupKey][channelKey] = {
          enabled: data.enabled,
          settings: data.settings,
        }
      }

      uiStore.showToast('Preference updated successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update preference', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    matrix,
    loading,
    error,
    // Actions
    fetchPreferences,
    updatePreferences,
    updateSinglePreference,
  }
})

