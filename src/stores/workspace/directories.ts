/**
 * Directories Store
 * Manages directory state and CRUD operations
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { Directory, DirectoryCreateDTO, DirectoryUpdateDTO } from '@/features/workspace/types'

interface ListCache {
  ids: number[]
  fetchedAt: number
}

interface DirectoryNode extends Directory {
  children?: DirectoryNode[]
}

export const useDirectoriesStore = defineStore('workspace/directories', () => {
  // State
  const byId = ref<Record<number, Directory>>({})
  const lists = ref<Record<string, ListCache>>({})
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  /**
   * Get list cache key
   */
  function getListKey(clientId?: number): string {
    return `client_${clientId || 'all'}`
  }

  /**
   * Fetch directories
   */
  async function fetchDirectories(clientId?: number): Promise<Directory[]> {
    loading.value = true
    error.value = null

    try {
      const params = clientId ? { client_id: clientId } : {}
      const response = await tenantApi.get<ApiResponse<Directory[]>>('/workspace/directories', {
        params,
      })

      const data = extractData(response)

      // Normalize and store
      const ids: number[] = []
      for (const directory of data) {
        byId.value[directory.id] = directory
        ids.push(directory.id)
      }

      // Cache list
      const listKey = getListKey(clientId)
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
   * Create directory
   */
  async function createDirectory(data: DirectoryCreateDTO): Promise<Directory> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.post<ApiResponse<Directory>>('/workspace/directories', {
        client_id: data.client_id,
        title: data.title,
        parent_id: data.parent_id ?? null,
      })

      const directory = extractData(response)

      // Store in cache
      byId.value[directory.id] = directory

      // Invalidate list cache for this client
      const listKey = getListKey(data.client_id)
      delete lists.value[listKey]

      uiStore.showToast('Directory created successfully', 'success')
      return directory
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to create directory', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update directory
   */
  async function updateDirectory(id: number, data: DirectoryUpdateDTO): Promise<Directory> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await tenantApi.put<ApiResponse<Directory>>(`/workspace/directories/${id}`, {
        client_id: data.client_id,
        title: data.title,
        parent_id: data.parent_id ?? null,
      })

      const directory = extractData(response)

      // Store in cache
      byId.value[directory.id] = directory

      // Invalidate list cache
      if (directory.client_id) {
        const listKey = getListKey(directory.client_id)
        delete lists.value[listKey]
      }

      uiStore.showToast('Directory updated successfully', 'success')
      return directory
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update directory', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete directory
   */
  async function deleteDirectory(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const directory = byId.value[id]
      await tenantApi.delete(`/workspace/directories/${id}`)

      // Remove from cache
      delete byId.value[id]

      // Invalidate list cache
      if (directory) {
        const listKey = getListKey(directory.client_id)
        delete lists.value[listKey]
      }

      uiStore.showToast('Directory deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete directory', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Build tree structure from parent_id relationships
   */
  const treeByClientId = computed(() => {
    return (clientId: number): DirectoryNode[] => {
      const directories = Object.values(byId.value).filter((d) => d.client_id === clientId)

      // Create a map for quick lookup
      const directoryMap = new Map<number, DirectoryNode>()
      for (const dir of directories) {
        directoryMap.set(dir.id, { ...dir, children: [] })
      }

      // Build tree
      const roots: DirectoryNode[] = []
      for (const dir of directories) {
        const node = directoryMap.get(dir.id)!
        if (dir.parent_id === null || !directoryMap.has(dir.parent_id)) {
          roots.push(node)
        } else {
          const parent = directoryMap.get(dir.parent_id)!
          if (!parent.children) {
            parent.children = []
          }
          parent.children.push(node)
        }
      }

      return roots
    }
  })

  return {
    // State
    byId,
    lists,
    loading,
    error,
    // Getters
    treeByClientId,
    // Actions
    fetchDirectories,
    createDirectory,
    updateDirectory,
    deleteDirectory,
  }
})

