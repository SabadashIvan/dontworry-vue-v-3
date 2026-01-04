/**
 * Checkers Store
 * Manages checker state and CRUD operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError, PaginatorMeta } from '@/core/api/types'
import type {
  Checker,
  CheckerCreateDTO,
  CheckerUpdateDTO,
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

export const useCheckersStore = defineStore('monitoring/checkers', () => {
  // State
  const byId = ref<Record<number, Checker>>({})
  const lists = ref<Record<string, ListCache>>({})
  const currentChecker = ref<Checker | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  // Getters
  const checkers = computed(() => {
    return Object.values(byId.value)
  })

  /**
   * Get list cache key
   */
  function getListKey(params?: ListParams): string {
    return JSON.stringify(params || {})
  }

  /**
   * Fetch checkers list
   * Note: If direct access to /monitoring/checkers returns 403,
   * we can try to get checkers from existing checks
   */
  async function fetchCheckers(params?: ListParams): Promise<Checker[]> {
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

      const response = await tenantApi.get<ApiResponse<Checker[]>>('/monitoring/checkers', {
        params: requestParams,
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const checker of data) {
        byId.value[checker.id] = checker
        ids.push(checker.id)
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

      // If 403, try to get checkers from existing checks as fallback
      if (apiError.status === 403) {
        try {
          return await fetchCheckersFromChecks(params?.clientId)
        } catch {
          // If fallback also fails, throw original error
          error.value = apiError
          throw apiError
        }
      }

      error.value = apiError

      // For other errors, show toast
      if (apiError.status !== 403) {
        const uiStore = useUiStore()
        uiStore.showToast(apiError.message || 'Failed to fetch checkers', 'error')
      }

      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Fallback: Fetch checkers from existing checks
   * This works because checks include checker relation
   * Note: This only works if user has existing checks
   */
  async function fetchCheckersFromChecks(clientId?: number): Promise<Checker[]> {
    const { useChecksStore } = await import('./checks')
    const checksStore = useChecksStore()

    try {
      // Try to fetch checks to get their checkers
      // We need at least one check to get checkers
      const checks = await checksStore.fetchChecks({ perPage: 1000, clientId })

      // Extract unique checkers from checks
      const checkerMap = new Map<number, Checker>()
      for (const check of checks) {
        if (check.checker && !checkerMap.has(check.checker.id)) {
          checkerMap.set(check.checker.id, check.checker)
          byId.value[check.checker.id] = check.checker
        }
      }

      const uniqueCheckers = Array.from(checkerMap.values())

      if (uniqueCheckers.length === 0) {
        // No checks exist yet, cannot get checkers this way
        throw new Error('No checks available to extract checkers from')
      }

      // Cache the result
      const listKey = getListKey({})
      lists.value[listKey] = {
        ids: uniqueCheckers.map((c) => c.id),
        fetchedAt: Date.now(),
      }

      return uniqueCheckers
    } catch (err) {
      // If we can't get checkers from checks, re-throw to show original 403 error
      throw err
    }
  }

  /**
   * Fetch single checker (with config_fields and result_fields)
   */
  async function fetchChecker(id: number): Promise<Checker> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Checker>>(`/monitoring/checkers/${id}`)
      const checker = extractData(response)

      // Store in cache
      byId.value[checker.id] = checker
      currentChecker.value = checker

      return checker
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Create checker
   */
  async function createChecker(data: CheckerCreateDTO): Promise<Checker> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<Checker>>('/monitoring/checkers', {
        title: data.title,
        service: data.service,
        config: data.config || {},
        is_active: data.is_active !== undefined ? data.is_active : true,
      })

      const checker = extractData(response)

      // Store in cache
      byId.value[checker.id] = checker

      uiStore.showToast('Checker created successfully', 'success')
      return checker
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to create checker', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update checker
   */
  async function updateChecker(id: number, data: CheckerUpdateDTO): Promise<Checker> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<Checker>>(`/monitoring/checkers/${id}`, {
        title: data.title,
        service: data.service,
        config: data.config,
        is_active: data.is_active,
      })

      const checker = extractData(response)

      // Store in cache
      byId.value[checker.id] = checker

      uiStore.showToast('Checker updated successfully', 'success')
      return checker
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update checker', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete checker
   */
  async function deleteChecker(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/monitoring/checkers/${id}`)

      // Remove from cache
      delete byId.value[id]

      if (currentChecker.value?.id === id) {
        currentChecker.value = null
      }

      // Remove from all lists
      for (const key in lists.value) {
        const list = lists.value[key]
        if (list) {
          list.ids = list.ids.filter((listId) => listId !== id)
        }
      }

      uiStore.showToast('Checker deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete checker', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    lists,
    currentChecker,
    loading,
    error,
    // Getters
    checkers,
    // Actions
    fetchCheckers,
    fetchChecker,
    createChecker,
    updateChecker,
    deleteChecker,
  }
})
