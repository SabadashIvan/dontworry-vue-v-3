/**
 * API Response Types
 * Unified response envelope matching backend contract
 */

/**
 * Paginator metadata structure
 */
export interface PaginatorMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number
  to?: number
}

/**
 * Success response envelope
 */
export interface ApiResponse<T = any> {
  data: T
  message?: string
  meta?: {
    paginator?: PaginatorMeta
    [key: string]: any
  }
}

/**
 * Error response envelope
 */
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}

/**
 * Central User type
 */
export interface CentralUser {
  id: number
  name: string
  email: string
  email_verified_at?: string
  created_at: string
  updated_at: string
}

/**
 * Avatar media structure
 */
export interface AvatarMedia {
  thumb?: { url: string | null }
  avatar?: { url: string | null }
}

/**
 * Tenant User type
 */
export interface TenantUser {
  id: number
  central_user_id: number
  avatar?: string | AvatarMedia
  created_at: string
  updated_at: string
  central_user?: CentralUser
}

/**
 * Tenant Domain type (from API response)
 */
export interface TenantDomain {
  id: number
  domain: string
  tenant_id: number
}

/**
 * Tenant type
 */
export interface Tenant {
  id: number
  title: string
  domain: string | TenantDomain
  timezone?: string
  created_at: string
  updated_at: string
}

/**
 * Invitation type (tenant-scoped)
 */
export interface Invitation {
  id: number
  email: string
  tenant_id: number
  invited_by?: number
  accepted_at?: string
  created_at: string
  updated_at: string
  // Optional relations that may be loaded
  tenant?: Tenant
  invitedBy?: CentralUser
}

/**
 * Extract domain string from tenant domain field
 * Handles both string and object formats from API
 */
export function getTenantDomainString(domain: string | TenantDomain | undefined): string {
  if (!domain) {
    return ''
  }
  if (typeof domain === 'string') {
    return domain
  }
  return domain.domain || ''
}

