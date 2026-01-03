/**
 * Tenants Store
 * Manages tenant state and CRUD operations via central API
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { centralApi } from '@/core/api/central'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { Tenant } from '@/core/api/types'

export interface TenantCreateDTO {
  title: string
  domain: string
  timezone?: string
}

export interface TenantUpdateDTO {
  title?: string
  timezone?: string
}

export const useTenantsStore = defineStore('tenants', () => {
  // State
  const byId = ref<Record<number, Tenant>>({})
  const currentTenant = ref<Tenant | null>(null)
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  // Getters
  const tenants = computed(() => {
    return Object.values(byId.value)
  })

  /**
   * Fetch tenants list
   */
  async function fetchTenants(): Promise<Tenant[]> {
    loading.value = true
    error.value = null

    try {
      const response = await centralApi.get<ApiResponse<Tenant[]>>('/tenants')
      const data = extractData(response)

      // Normalize and store
      for (const tenant of data) {
        byId.value[tenant.id] = tenant
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
   * Fetch single tenant
   */
  async function fetchTenant(id: number): Promise<Tenant> {
    loading.value = true
    error.value = null

    try {
      const response = await centralApi.get<ApiResponse<Tenant>>(`/tenants/${id}`)
      const tenant = extractData(response)

      // Store in cache
      byId.value[tenant.id] = tenant
      currentTenant.value = tenant

      return tenant
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Create tenant
   */
  async function createTenant(data: TenantCreateDTO): Promise<Tenant> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await centralApi.post<ApiResponse<Tenant>>('/tenants', {
        title: data.title,
        domain: data.domain,
        timezone: data.timezone,
      })

      const tenant = extractData(response)

      // Store in cache
      byId.value[tenant.id] = tenant

      uiStore.showToast('Workspace created successfully', 'success')
      return tenant
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError

      // Handle validation errors (422) for domain uniqueness
      if (apiError.status === 422) {
        const domainError = apiError.errors?.domain?.[0]
        if (domainError) {
          uiStore.showToast(domainError, 'error')
        } else {
          uiStore.showToast(apiError.message || 'Validation failed', 'error')
        }
      } else {
        uiStore.showToast(apiError.message || 'Failed to create workspace', 'error')
      }

      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Update tenant
   */
  async function updateTenant(id: number, data: TenantUpdateDTO): Promise<Tenant> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      const response = await centralApi.put<ApiResponse<Tenant>>(`/tenants/${id}`, {
        title: data.title,
        timezone: data.timezone,
      })

      const tenant = extractData(response)

      // Store in cache
      byId.value[tenant.id] = tenant

      uiStore.showToast('Workspace updated successfully', 'success')
      return tenant
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to update workspace', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete tenant
   */
  async function deleteTenant(id: number): Promise<void> {
    loading.value = true
    error.value = null
    const uiStore = useUiStore()

    try {
      await centralApi.delete(`/tenants/${id}`)

      // Remove from cache
      delete byId.value[id]

      if (currentTenant.value?.id === id) {
        currentTenant.value = null
      }

      uiStore.showToast('Workspace deleted successfully', 'success')
    } catch (err: unknown) {
      const apiError = err as ApiError
      error.value = apiError
      uiStore.showToast(apiError.message || 'Failed to delete workspace', 'error')
      throw apiError
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    byId,
    currentTenant,
    loading,
    error,
    // Getters
    tenants,
    // Actions
    fetchTenants,
    fetchTenant,
    createTenant,
    updateTenant,
    deleteTenant,
  }
})

