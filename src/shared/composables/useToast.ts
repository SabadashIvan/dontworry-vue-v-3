/**
 * Toast composable
 * Provides convenient methods for showing toast notifications
 */

import { useUiStore } from '@/stores/core/ui'
import type { Toast } from '@/stores/core/ui'

export function useToast() {
  const uiStore = useUiStore()

  function show(message: string, type: Toast['type'] = 'info', duration: number = 5000) {
    uiStore.showToast(message, type, duration)
  }

  function success(message: string, duration?: number) {
    show(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    show(message, 'error', duration)
  }

  function warning(message: string, duration?: number) {
    show(message, 'warning', duration)
  }

  function info(message: string, duration?: number) {
    show(message, 'info', duration)
  }

  function remove(id: string) {
    uiStore.removeToast(id)
  }

  function clear() {
    uiStore.clearToasts()
  }

  return {
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear,
    toasts: uiStore.toasts,
  }
}

