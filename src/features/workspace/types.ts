/**
 * Workspace Module Types
 * Types for Clients (Projects), Directories, Websites, and Pages
 */

/**
 * Client (Project in UI)
 * Top-level container for organizing websites
 */
export interface Client {
  id: number
  title: string
  description?: string
  tags: string[]
  avatar?: string // Appended only in read endpoints
  created_at: string
  updated_at: string
}

/**
 * Directory
 * Optional folder for grouping websites within a project
 */
export interface Directory {
  id: number
  client_id: number
  title: string
  parent_id: number | null
  created_at: string
  updated_at: string
}

/**
 * Website
 * Domain/host associated to a Project (and optionally a Directory)
 */
export interface Website {
  id: number
  client_id: number
  directory_id: number | null
  host: string
  created_at: string
  updated_at: string
}

/**
 * Page
 * A page within a Website (slug), used as a target for checks
 */
export interface Page {
  id: number
  website_id: number
  title: string
  slug: string
  created_at: string
  updated_at: string
}

/**
 * DTO Types for API requests
 */

export interface ClientCreateDTO {
  title: string
  description?: string
  avatar?: File
  tags?: string[]
}

export interface ClientUpdateDTO {
  title?: string
  description?: string
  avatar?: File
  tags?: string[] | null
}

export interface DirectoryCreateDTO {
  client_id: number
  title: string
  parent_id?: number | null
}

export interface DirectoryUpdateDTO {
  client_id?: number
  title?: string
  parent_id?: number | null
}

export interface WebsiteCreateDTO {
  client_id: number
  directory_id: number
  host: string
  parse_pages?: boolean
}

export interface WebsiteUpdateDTO {
  client_id?: number
  directory_id?: number | null
  host?: string
  parse_pages?: boolean
}

export interface PageCreateDTO {
  website_id: number
  title: string
  slug?: string // Auto-generated if omitted
}

export interface PageUpdateDTO {
  website_id?: number
  title?: string
  slug?: string
}

