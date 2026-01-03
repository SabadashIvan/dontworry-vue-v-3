/**
 * UI Store
 * Manages global UI state (toasts, dialogs, loading)
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

export const useUiStore = defineStore('ui', () => {
  // State
  const toasts = ref<Toast[]>([])
  const isLoading = ref(false)
  const loadingMessage = ref<string | null>(null)

  /**
   * Show toast notification
   */
  function showToast(message: string, type: Toast['type'] = 'info', duration: number = 5000): void {
    const id = Date.now().toString()
    const toast: Toast = { id, message, type, duration }

    toasts.value.push(toast)

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  /**
   * Remove toast
   */
  function removeToast(id: string): void {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * Clear all toasts
   */
  function clearToasts(): void {
    toasts.value = []
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean, message?: string): void {
    isLoading.value = loading
    loadingMessage.value = message || null
  }

  return {
    // State
    toasts,
    isLoading,
    loadingMessage,
    // Actions
    showToast,
    removeToast,
    clearToasts,
    setLoading,
  }
})

