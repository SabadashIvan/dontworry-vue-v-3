/**
 * Notifications Store
 * Manages notification state and operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError, PaginatorMeta } from '@/core/api/types'
import type { Notification } from '@/features/notifications/types'

interface ListParams {
  page?: number
  perPage?: number
}

interface ListCache {
  ids: number[]
  paginator?: PaginatorMeta
  fetchedAt: number
}

export const useNotificationsStore = defineStore('notifications/notifications', () => {
  // State
  const byId = ref<Record<number, Notification>>({})
  const lists = ref<Record<string, ListCache>>({})
  const unreadList = ref<{ ids: number[]; paginator?: PaginatorMeta } | null>(null)
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  // Getters
  const notifications = computed(() => {
    return Object.values(byId.value)
  })

  const unreadNotifications = computed(() => {
    if (!unreadList.value) return []
    return unreadList.value.ids.map((id) => byId.value[id]).filter(Boolean)
  })

  /**
   * Get list cache key
   */
  function getListKey(params?: ListParams): string {
    return JSON.stringify(params || {})
  }

  /**
   * Fetch all notifications
   */
  async function fetchNotifications(params?: ListParams): Promise<Notification[]> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Notification[]>>('/notifications', {
        params: {
          page: params?.page || 1,
          per_page: params?.perPage || 20,
        },
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const notification of data) {
        byId.value[notification.id] = notification
        ids.push(notification.id)
      }

      // Cache list
      const listKey = getListKey(params)
      lists.value[listKey] = {
        ids,
        paginator,
        fetchedAt: Date.now(),
      }

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
   * Fetch unread notifications
   */
  async function fetchUnread(params?: { page?: number; perPage?: number; limit?: number }): Promise<Notification[]> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Notification[]>>('/notifications/unread', {
        params: {
          page: params?.page || 1,
          per_page: params?.perPage || 20,
          limit: params?.limit,
        },
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const notification of data) {
        byId.value[notification.id] = notification
        ids.push(notification.id)
      }

      // Store unread list
      unreadList.value = {
        ids,
        paginator,
      }

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
   * Fetch unread count
   */
  async function fetchUnreadCount(): Promise<number> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<number>>('/notifications/unread/count')
      const count = extractData(response)
      unreadCount.value = count
      return count
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark notification as read
   */
  async function markAsRead(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.post(`/notifications/${id}/read`)

      // Update notification in cache
      if (byId.value[id]) {
        byId.value[id].read_at = new Date().toISOString()
      }

      // Remove from unread list if present
      if (unreadList.value) {
        unreadList.value.ids = unreadList.value.ids.filter((notificationId) => notificationId !== id)
      }

      // Decrement unread count
      if (unreadCount.value > 0) {
        unreadCount.value--
      }

      uiStore.showToast('Notification marked as read', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to mark notification as read', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark all notifications as read
   */
  async function markAllAsRead(): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.post('/notifications/mark-all-read')

      // Update all notifications in cache
      for (const id in byId.value) {
        if (!byId.value[id].read_at) {
          byId.value[id].read_at = new Date().toISOString()
        }
      }

      // Clear unread list
      unreadList.value = null
      unreadCount.value = 0

      uiStore.showToast('All notifications marked as read', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to mark all notifications as read', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    lists,
    unreadList,
    unreadCount,
    loading,
    error,
    // Getters
    notifications,
    unreadNotifications,
    // Actions
    fetchNotifications,
    fetchUnread,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
})

