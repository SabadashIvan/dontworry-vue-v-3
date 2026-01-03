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
 * Tenant User type
 */
export interface TenantUser {
  id: number
  central_user_id: number
  avatar?: string
  created_at: string
  updated_at: string
}

/**
 * Tenant type
 */
export interface Tenant {
  id: number
  title: string
  domain: string
  timezone?: string
  created_at: string
  updated_at: string
}

