/**
 * Clients (Projects) Store
 * Manages client/project state and CRUD operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { createFormData } from '@/core/api/helpers'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError, PaginatorMeta } from '@/core/api/types'
import type { Client, ClientCreateDTO, ClientUpdateDTO } from '@/features/workspace/types'

interface ListParams {
  page?: number
  perPage?: number
}

interface ListCache {
  ids: number[]
  paginator?: PaginatorMeta
  fetchedAt: number
}

export const useClientsStore = defineStore('workspace/clients', () => {
  // State
  const byId = ref<Record<number, Client>>({})
  const lists = ref<Record<string, ListCache>>({})
  const currentClient = ref<Client | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  // Getters
  const clients = computed(() => {
    return Object.values(byId.value)
  })

  /**
   * Get list cache key
   */
  function getListKey(params?: ListParams): string {
    return JSON.stringify(params || {})
  }

  /**
   * Fetch clients list
   */
  async function fetchClients(params?: ListParams): Promise<Client[]> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Client[]>>('/workspace/clients', {
        params: {
          page: params?.page || 1,
          per_page: params?.perPage || 20,
        },
      })

      const data = extractData(response)
      const paginator = response.data.meta?.paginator

      // Normalize and store
      const ids: number[] = []
      for (const client of data) {
        byId.value[client.id] = client
        ids.push(client.id)
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
   * Fetch single client
   */
  async function fetchClient(id: number): Promise<Client> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Client>>(`/workspace/clients/${id}`)
      const client = extractData(response)

      // Store in cache
      byId.value[client.id] = client
      currentClient.value = client

      return client
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Create client
   */
  async function createClient(data: ClientCreateDTO, avatarFile?: File): Promise<Client> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      let response

      if (avatarFile) {
        // Multipart request
        const formData = createFormData(avatarFile, 'avatar', {
          title: data.title,
          description: data.description || '',
          tags: data.tags ? JSON.stringify(data.tags) : '[]',
        })

        response = await tenantApi.post<ApiResponse<Client>>('/workspace/clients', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        // JSON request
        response = await tenantApi.post<ApiResponse<Client>>('/workspace/clients', {
          title: data.title,
          description: data.description,
          tags: data.tags || [],
        })
      }

      const client = extractData(response)

      // Store in cache
      byId.value[client.id] = client

      // If avatar was uploaded, refetch to get avatar URL
      if (avatarFile) {
        await fetchClient(client.id)
      }

      uiStore.showToast('Project created successfully', 'success')
      return client
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError

      // Handle subscription limits
      if (apiError.message?.toLowerCase().includes('limit')) {
        uiStore.showToast(apiError.message || 'Project limit reached', 'error')
      } else {
        uiStore.showToast(apiError.message || 'Failed to create project', 'error')
      }

      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update client
   */
  async function updateClient(id: number, data: ClientUpdateDTO, avatarFile?: File): Promise<Client> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      let response

      if (avatarFile) {
        // Multipart request
        const formData = createFormData(avatarFile, 'avatar', {
          title: data.title || '',
          description: data.description || '',
          tags: data.tags !== undefined ? JSON.stringify(data.tags) : '',
          _method: 'PUT',
        })

        response = await tenantApi.post<ApiResponse<Client>>(`/workspace/clients/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        // JSON request
        response = await tenantApi.put<ApiResponse<Client>>(`/workspace/clients/${id}`, {
          title: data.title,
          description: data.description,
          tags: data.tags,
        })
      }

      const client = extractData(response)

      // Store in cache
      byId.value[client.id] = client

      // If avatar was uploaded, refetch to get avatar URL
      if (avatarFile) {
        await fetchClient(id)
      }

      uiStore.showToast('Project updated successfully', 'success')
      return client
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update project', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete client
   */
  async function deleteClient(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/workspace/clients/${id}`)

      // Remove from cache
      delete byId.value[id]

      if (currentClient.value?.id === id) {
        currentClient.value = null
      }

      // Remove from all lists
      for (const key in lists.value) {
        const list = lists.value[key]
        if (list) {
          list.ids = list.ids.filter((listId) => listId !== id)
        }
      }

      uiStore.showToast('Project deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete project', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete client avatar
   */
  async function deleteAvatar(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await tenantApi.delete(`/workspace/clients/${id}/avatar`)

      // Refetch to update avatar field
      await fetchClient(id)

      uiStore.showToast('Avatar deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete avatar', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    lists,
    currentClient,
    loading,
    error,
    // Getters
    clients,
    // Actions
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    deleteClient,
    deleteAvatar,
  }
})

