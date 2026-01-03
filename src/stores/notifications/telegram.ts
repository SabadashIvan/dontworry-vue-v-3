/**
 * Telegram Store
 * Manages Telegram connection state and operations
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { TelegramConnection, TelegramConnectDTO } from '@/features/notifications/types'

export const useTelegramStore = defineStore('notifications/telegram', () => {
  // State
  const connection = ref<TelegramConnection>({ connected: false })
  const connectionLink = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Generate connection link
   */
  async function generateConnectionLink(): Promise<string> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.post<ApiResponse<{ link: string }>>(
        '/notifications/telegram/connection-link'
      )
      const data = extractData(response)
      connectionLink.value = data.link
      return data.link
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Connect Telegram by token
   */
  async function connect(data: TelegramConnectDTO): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<TelegramConnection>>('/notifications/telegram/connect', {
        token: data.token,
      })

      const connectionData = extractData(response)
      connection.value = connectionData

      uiStore.showToast('Telegram connected successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to connect Telegram', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Disconnect Telegram
   */
  async function disconnect(): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.post('/notifications/telegram/disconnect')

      connection.value = { connected: false }
      connectionLink.value = null

      uiStore.showToast('Telegram disconnected successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to disconnect Telegram', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    connection,
    connectionLink,
    loading,
    error,
    // Actions
    generateConnectionLink,
    connect,
    disconnect,
  }
})

