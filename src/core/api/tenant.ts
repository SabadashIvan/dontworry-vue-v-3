/**
 * Tenant API Client
 * For endpoints that require tenant context (workspace, monitoring, notifications)
 */

import { createApiClient } from './client'
import { getApiBaseUrl } from '../tenancy/context'

/**
 * Tenant API client instance
 * Base URL always uses current hostname (tenant subdomain)
 */
export const tenantApi = createApiClient(getApiBaseUrl('tenant'))

