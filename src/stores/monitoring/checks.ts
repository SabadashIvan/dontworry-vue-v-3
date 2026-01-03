/**
 * Checks Store
 * Manages check state and CRUD operations, including run history
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError, PaginatorMeta } from '@/core/api/types'
import type {
  Check,
  CheckCreateDTO,
  CheckUpdateDTO,
  JobDTO,
} from '@/features/monitoring/types'

interface ListParams {
  clientId?: number
  page?: number
  perPage?: number
}

interface ListCache {
  ids: number[]
  paginator?: PaginatorMeta
  fetchedAt: number
}

export const useChecksStore = defineStore('monitoring/checks', () => {
  // State
  const byId = ref<Record<number, Check>>({})
  const lists = ref<Record<string, ListCache>>({})
  const currentCheck = ref<Check | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const runHistoryByCheckId = ref<Record<number, JobDTO[]>>({})

  // Getters
  const checks = computed(() => {
    return Object.values(byId.value)
  })

  /**
   * Get list cache key
   */
  function getListKey(params?: ListParams): string {
    return JSON.stringify(params || {})
  }

  /**
   * Fetch checks list
   */
  async function fetchChecks(params?: ListParams): Promise<Check[]> {
    loading.value = true
    error.value = null

    try {
      const requestParams: Record<string, unknown> = {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
      }
      if (params?.clientId) {
        requestParams.client_id = params.clientId
      }

      const response = await tenantApi.get<ApiResponse<Check[]>>('/monitoring/checks', {
        params: requestParams,
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const check of data) {
        byId.value[check.id] = check
        ids.push(check.id)
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
   * Fetch single check (with checker relation)
   */
  async function fetchCheck(id: number): Promise<Check> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Check>>(`/monitoring/checks/${id}`)
      const check = extractData(response)

      // Store in cache
      byId.value[check.id] = check
      currentCheck.value = check

      return check
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Create check
   */
  async function createCheck(data: CheckCreateDTO): Promise<Check> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<Check>>('/monitoring/checks', {
        client_id: data.client_id,
        title: data.title,
        checker_id: data.checker_id,
        page_ids: data.page_ids || [],
        config: data.config || {},
        is_active: data.is_active !== undefined ? data.is_active : true,
      })

      const check = extractData(response)

      // Store in cache
      byId.value[check.id] = check

      uiStore.showToast('Check created successfully', 'success')
      return check
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to create check', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update check
   */
  async function updateCheck(id: number, data: CheckUpdateDTO): Promise<Check> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<Check>>(`/monitoring/checks/${id}`, {
        client_id: data.client_id,
        title: data.title,
        checker_id: data.checker_id,
        page_ids: data.page_ids,
        config: data.config,
        is_active: data.is_active,
      })

      const check = extractData(response)

      // Store in cache
      byId.value[check.id] = check

      uiStore.showToast('Check updated successfully', 'success')
      return check
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update check', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete check
   */
  async function deleteCheck(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/monitoring/checks/${id}`)

      // Remove from cache
      delete byId.value[id]
      delete runHistoryByCheckId.value[id]

      if (currentCheck.value?.id === id) {
        currentCheck.value = null
      }

      // Remove from all lists
      for (const key in lists.value) {
        const list = lists.value[key]
        if (list) {
          list.ids = list.ids.filter((listId) => listId !== id)
        }
      }

      uiStore.showToast('Check deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete check', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Run check immediately
   */
  async function runCheck(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.post(`/monitoring/checks/${id}/run`)

      uiStore.showToast('Check run triggered successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to run check', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch run history for all checks
   */
  async function fetchRunHistory(params?: ListParams): Promise<Check[]> {
    loading.value = true
    error.value = null

    try {
      const requestParams: Record<string, unknown> = {
        page: params?.page || 1,
        per_page: params?.perPage || 20,
      }
      if (params?.clientId) {
        requestParams.client_id = params.clientId
      }

      const response = await tenantApi.get<ApiResponse<Check[]>>('/monitoring/checks/run-history', {
        params: requestParams,
      })

      const data = extractData(response)

      // Normalize and store checks
      for (const check of data) {
        byId.value[check.id] = check

        // Store run history if present
        if (check.runHistory) {
          runHistoryByCheckId.value[check.id] = check.runHistory
        }
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
   * Fetch run history for a specific check
   */
  async function fetchItemRunHistory(id: number, params?: { page?: number; perPage?: number }): Promise<Check> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Check>>(`/monitoring/checks/${id}/run-history`, {
        params: {
          page: params?.page || 1,
          per_page: params?.perPage || 20,
        },
      })

      const check = extractData(response)

      // Store in cache
      byId.value[check.id] = check
      currentCheck.value = check

      // Store run history if present
      if (check.runHistory) {
        runHistoryByCheckId.value[check.id] = check.runHistory
      }

      return check
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    lists,
    currentCheck,
    loading,
    error,
    runHistoryByCheckId,
    // Getters
    checks,
    // Actions
    fetchChecks,
    fetchCheck,
    createCheck,
    updateCheck,
    deleteCheck,
    runCheck,
    fetchRunHistory,
    fetchItemRunHistory,
  }
})

