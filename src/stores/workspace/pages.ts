/**
 * Pages Store
 * Manages page state and CRUD operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { Page, PageCreateDTO, PageUpdateDTO } from '@/features/workspace/types'
import type { Website } from '@/features/workspace/types'

interface ListCache {
  ids: number[]
  fetchedAt: number
}

export const usePagesStore = defineStore('workspace/pages', () => {
  // State
  const byId = ref<Record<number, Page>>({})
  const lists = ref<Record<string, ListCache>>({})
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Get list cache key
   */
  function getListKey(websiteId: number): string {
    return `website_${websiteId}`
  }

  /**
   * Fetch pages
   */
  async function fetchPages(websiteId: number): Promise<Page[]> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Page[]>>('/workspace/pages', {
        params: {
          website_id: websiteId,
        },
      })

      const data = extractData(response)

      // Normalize and store
      const ids: number[] = []
      for (const page of data) {
        byId.value[page.id] = page
        ids.push(page.id)
      }

      // Cache list
      const listKey = getListKey(websiteId)
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
   * Create page
   */
  async function createPage(data: PageCreateDTO): Promise<Page> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<Page>>('/workspace/pages', {
        website_id: data.website_id,
        title: data.title,
        slug: data.slug,
      })

      const page = extractData(response)

      // Store in cache
      byId.value[page.id] = page

      // Invalidate list cache
      const listKey = getListKey(data.website_id)
      delete lists.value[listKey]

      uiStore.showToast('Page created successfully', 'success')
      return page
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to create page', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update page
   */
  async function updatePage(id: number, data: PageUpdateDTO): Promise<Page> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<Page>>(`/workspace/pages/${id}`, {
        website_id: data.website_id,
        title: data.title,
        slug: data.slug,
      })

      const page = extractData(response)

      // Store in cache
      byId.value[page.id] = page

      // Invalidate list cache if website_id changed
      if (data.website_id) {
        const listKey = getListKey(data.website_id)
        delete lists.value[listKey]
      }

      uiStore.showToast('Page updated successfully', 'success')
      return page
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update page', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete page
   */
  async function deletePage(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const page = byId.value[id]
      await tenantApi.delete(`/workspace/pages/${id}`)

      // Remove from cache
      delete byId.value[id]

      // Invalidate list cache
      if (page) {
        const listKey = getListKey(page.website_id)
        delete lists.value[listKey]
      }

      uiStore.showToast('Page deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete page', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Get pages by website
   */
  const pagesByWebsite = computed(() => {
    return (websiteId: number): Page[] => {
      return Object.values(byId.value).filter((page) => page.website_id === websiteId)
    }
  })

  /**
   * Build full URL from page and website
   */
  function fullUrl(page: Page, website: Website): string {
    const host = website.host.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const slug = page.slug.startsWith('/') ? page.slug : `/${page.slug}`
    return `https://${host}${slug}`
  }

  return {
    // State
    byId,
    lists,
    loading,
    error,
    // Getters
    pagesByWebsite,
    // Actions
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    // Helpers
    fullUrl,
  }
})

