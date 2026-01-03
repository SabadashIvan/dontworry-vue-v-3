/**
 * useNotifications Composable
 * Helper composable for showing toast notifications and managing notification state
 */

import { computed } from 'vue'
import { useNotificationsStore } from '@/stores/notifications/notifications'
import { useUiStore } from '@/stores/core/ui'

/**
 * Composable for notification-related operations
 */
export function useNotifications() {
  const notificationsStore = useNotificationsStore()
  const uiStore = useUiStore()

  /**
   * Show a toast notification
   */
  function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration?: number) {
    uiStore.showToast(message, type, duration)
  }

  /**
   * Refresh unread count
   */
  async function refreshUnreadCount() {
    await notificationsStore.fetchUnreadCount()
  }

  return {
    showNotification,
    refreshUnreadCount,
    unreadCount: computed(() => notificationsStore.unreadCount),
  }
}

