/**
 * Reports Store
 * Manages report state and read/delete operations
 * Note: Reports are created automatically by checker runs, not via API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError, PaginatorMeta } from '@/core/api/types'
import type { Report } from '@/features/monitoring/types'

interface ReportFilters {
  checkId?: number
  pageId?: number
  websiteId?: number
  clientId?: number
  page?: number
  perPage?: number
}

interface ListCache {
  ids: number[]
  paginator?: PaginatorMeta
  fetchedAt: number
}

export const useReportsStore = defineStore('monitoring/reports', () => {
  // State
  const byId = ref<Record<number, Report>>({})
  const lists = ref<Record<string, ListCache>>({})
  const currentReport = ref<Report | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const filters = ref<ReportFilters>({})

  // Getters
  const reports = computed(() => {
    return Object.values(byId.value)
  })

  /**
   * Get list cache key
   */
  function getListKey(filters?: ReportFilters): string {
    return JSON.stringify(filters || {})
  }

  /**
   * Fetch reports list with optional filters
   */
  async function fetchReports(filters?: ReportFilters): Promise<Report[]> {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, unknown> = {
        page: filters?.page || 1,
        per_page: filters?.perPage || 20,
      }

      if (filters?.checkId) params.check_id = filters.checkId
      if (filters?.pageId) params.page_id = filters.pageId
      if (filters?.websiteId) params.website_id = filters.websiteId
      if (filters?.clientId) params.client_id = filters.clientId

      const response = await tenantApi.get<ApiResponse<Report[]>>('/monitoring/reports', {
        params,
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const report of data) {
        byId.value[report.id] = report
        ids.push(report.id)
      }

      // Cache list
      const listKey = getListKey(filters)
      lists.value[listKey] = {
        ids,
        paginator,
        fetchedAt: Date.now(),
      }

      // Store filters
      if (filters) {
        filters.value = { ...filters }
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
   * Fetch single report (with report_fields)
   */
  async function fetchReport(id: number): Promise<Report> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Report>>(`/monitoring/reports/${id}`)
      const report = extractData(response)

      // Store in cache
      byId.value[report.id] = report
      currentReport.value = report

      return report
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete report
   */
  async function deleteReport(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/monitoring/reports/${id}`)

      // Remove from cache
      delete byId.value[id]

      if (currentReport.value?.id === id) {
        currentReport.value = null
      }

      // Remove from all lists
      for (const key in lists.value) {
        const list = lists.value[key]
        if (list) {
          list.ids = list.ids.filter((listId) => listId !== id)
        }
      }

      uiStore.showToast('Report deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete report', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Set filters
   */
  function setFilters(newFilters: ReportFilters): void {
    filters.value = { ...newFilters }
  }

  /**
   * Clear filters
   */
  function clearFilters(): void {
    filters.value = {}
  }

  return {
    // State
    byId,
    lists,
    currentReport,
    loading,
    error,
    filters,
    // Getters
    reports,
    // Actions
    fetchReports,
    fetchReport,
    deleteReport,
    setFilters,
    clearFilters,
  }
})

