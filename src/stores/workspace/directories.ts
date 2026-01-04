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
   * Fetch single directory
   */
  async function fetchDirectory(id: number): Promise<Directory> {
    loading.value = true
    error.value = null

    try {
      const response = await tenantApi.get<ApiResponse<Directory>>(`/workspace/directories/${id}`)
      const directory = extractData(response)

      // Store in cache
      byId.value[directory.id] = directory

      return directory
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

  /**
   * Get full path of directory (array of all parents from root to current)
   */
  function getDirectoryPath(directoryId: number): Directory[] {
    const path: Directory[] = []
    let currentId: number | null = directoryId
    const visited = new Set<number>()

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId)
      const directory: Directory | undefined = byId.value[currentId]
      if (!directory) break

      path.unshift(directory)
      currentId = directory.parent_id
    }

    return path
  }

  /**
   * Get all descendants of a directory (recursively)
   */
  function getAllDescendants(directoryId: number): number[] {
    const descendants: number[] = []
    const directories = Object.values(byId.value)

    function collectChildren(parentId: number) {
      for (const dir of directories) {
        if (dir.parent_id === parentId) {
          descendants.push(dir.id)
          collectChildren(dir.id)
        }
      }
    }

    collectChildren(directoryId)
    return descendants
  }

  /**
   * Get directory label with indentation based on depth
   */
  function getDirectoryLabel(directoryId: number, indentSize: number = 2): string {
    const directory = byId.value[directoryId]
    if (!directory) return ''

    const path = getDirectoryPath(directoryId)
    const depth = path.length - 1
    const indent = ' '.repeat(depth * indentSize)

    return `${indent}${directory.title}`
  }

  /**
   * Get flat list of directories with hierarchical labels for a client
   */
  function flatListByClientId(clientId: number): Array<{ directory: Directory; label: string; depth: number }> {
    const directories = Object.values(byId.value).filter((d) => d.client_id === clientId)
    const result: Array<{ directory: Directory; label: string; depth: number }> = []

    // Helper function to recursively add directories
    function addDirectory(dir: Directory, depth: number): void {
      const label = getDirectoryLabel(dir.id)
      result.push({ directory: dir, label, depth })

      // Find and add children
      const children = directories.filter((d) => d.parent_id === dir.id)
      for (const child of children) {
        addDirectory(child, depth + 1)
      }
    }

    // Start with root directories (parent_id === null)
    const roots = directories.filter((d) => d.parent_id === null)
    for (const root of roots) {
      addDirectory(root, 0)
    }

    return result
  }

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
    fetchDirectory,
    createDirectory,
    updateDirectory,
    deleteDirectory,
    // Utilities
    getDirectoryPath,
    getAllDescendants,
    getDirectoryLabel,
    flatListByClientId,
  }
})

