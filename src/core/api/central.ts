/**
 * Central API Client
 * For endpoints that don't require tenant context
 */

import { createApiClient } from './client'
import { getApiBaseUrl } from '../tenancy/context'

/**
 * Central API client instance
 * Base URL is determined by central host configuration
 */
export const centralApi = createApiClient(getApiBaseUrl('central'))

