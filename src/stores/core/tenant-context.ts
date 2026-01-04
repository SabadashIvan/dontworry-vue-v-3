/**
 * Tenant Context Store
 * Manages tenant selection and subdomain detection
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getTenantSubdomain, isCentralHost } from '@/core/tenancy/resolver'
import { normalizeHostname } from '@/core/tenancy/hostname'
import { getAppMode } from '@/core/tenancy/context'
import { redirectToTenant } from '@/core/tenancy/redirect'
import type { AppMode } from '@/core/tenancy/context'

export interface TenantInfo {
  id: number
  title: string
  domain: string
  timezone?: string
}

export const useTenantContextStore = defineStore('tenantContext', () => {
  // State
  const selectedTenant = ref<TenantInfo | null>(null)
  const centralDomain = ref<string>(
    normalizeHostname(import.meta.env.VITE_CENTRAL_HOST || window.location.hostname)
  )

  // Getters
  const tenantSubdomain = computed(() => {
    return getTenantSubdomain()
  })

  const isTenantHost = computed(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return !isCentralHost(window.location.hostname)
  })

  const currentMode = computed<AppMode>(() => {
    return getAppMode()
  })

  /**
   * Set tenant from tenants list
   * This is called when user selects a tenant in central mode
   */
  function setTenantFromTenantsList(tenant: TenantInfo): void {
    selectedTenant.value = tenant
  }

  /**
   * Reset tenant context
   * Called on logout or when leaving tenant
   */
  function resetTenantContext(): void {
    selectedTenant.value = null
  }

  /**
   * Redirect to tenant subdomain
   */
  function redirectToTenantSubdomain(subdomain: string, path?: string): void {
    redirectToTenant(subdomain, path)
  }

  return {
    // State
    selectedTenant,
    centralDomain,
    // Getters
    tenantSubdomain,
    isTenantHost,
    currentMode,
    // Actions
    setTenantFromTenantsList,
    resetTenantContext,
    redirectToTenantSubdomain,
  }
})
