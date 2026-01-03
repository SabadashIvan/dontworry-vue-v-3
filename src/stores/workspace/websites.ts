/**
 * Websites Store
 * Manages website state and CRUD operations
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { Website, WebsiteCreateDTO, WebsiteUpdateDTO } from '@/features/workspace/types'

interface ListCache {
  ids: number[]
  fetchedAt: number
}

export const useWebsitesStore = defineStore('workspace/websites', () => {
  // State
  const byId = ref<Record<number, Website>>({})
  const lists = ref<Record<string, ListCache>>({})
  const currentWebsite = ref<Website | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Get list cache key
   */
  function getListKey(clientId?: number, directoryId?: number): string {
    return JSON.stringify({ clientId, directoryId })
  }

  /**
   * Fetch websites
   */
  async function fetchWebsites(clientId?: number, directoryId?: number): Promise<Website[]> {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, unknown> = {}
      if (clientId) params.client_id = clientId
      if (directoryId) params.directory_id = directoryId

      const response = await tenantApi.get<ApiResponse<Website[]>>('/workspace/websites', {
        params,
      })

      const data = extractData(response)

      // Normalize and store
      const ids: number[] = []
      for (const website of data) {
        byId.value[website.id] = website
        ids.push(website.id)
      }

      // Cache list
      const listKey = getListKey(clientId, directoryId)
      lists.value[listKey] = {
        ids,
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
   * Fetch websites by directory
   */
  async function fetchWebsitesByDirectory(directoryId: number): Promise<Website[]> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Website[]>>(
        `/workspace/directories/${directoryId}/websites`
      )

      const data = extractData(response)

      // Normalize and store
      for (const website of data) {
        byId.value[website.id] = website
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
   * Fetch single website
   */
  async function fetchWebsite(id: number): Promise<Website> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Website>>(`/workspace/websites/${id}`)
      const website = extractData(response)

      // Store in cache
      byId.value[website.id] = website
      currentWebsite.value = website

      return website
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Create website
   */
  async function createWebsite(data: WebsiteCreateDTO): Promise<Website> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<Website>>('/workspace/websites', {
        client_id: data.client_id,
        directory_id: data.directory_id,
        host: data.host,
        parse_pages: data.parse_pages || false,
      })

      const website = extractData(response)

      // Store in cache
      byId.value[website.id] = website

      // Show notification about parse_pages
      if (data.parse_pages) {
        uiStore.showToast('Pages are being parsed. They will appear shortly.', 'info', 7000)
      } else {
        uiStore.showToast('Website created successfully', 'success')
      }

      return website
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError

      // Handle subscription limits
      if (apiError.message?.toLowerCase().includes('limit') || apiError.message?.toLowerCase().includes('reached')) {
        uiStore.showToast(
          apiError.message || 'Website limit reached. Please upgrade your plan.',
          'error',
          8000
        )
      } else {
        uiStore.showToast(apiError.message || 'Failed to create website', 'error')
      }

      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update website
   */
  async function updateWebsite(id: number, data: WebsiteUpdateDTO): Promise<Website> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<Website>>(`/workspace/websites/${id}`, {
        client_id: data.client_id,
        directory_id: data.directory_id ?? null,
        host: data.host,
        parse_pages: data.parse_pages,
      })

      const website = extractData(response)

      // Store in cache
      byId.value[website.id] = website

      uiStore.showToast('Website updated successfully', 'success')
      return website
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update website', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete website
   */
  async function deleteWebsite(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/workspace/websites/${id}`)

      // Remove from cache
      delete byId.value[id]

      if (currentWebsite.value?.id === id) {
        currentWebsite.value = null
      }

      // Invalidate all lists
      lists.value = {}

      uiStore.showToast('Website deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete website', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    lists,
    currentWebsite,
    loading,
    error,
    // Actions
    fetchWebsites,
    fetchWebsitesByDirectory,
    fetchWebsite,
    createWebsite,
    updateWebsite,
    deleteWebsite,
  }
})

