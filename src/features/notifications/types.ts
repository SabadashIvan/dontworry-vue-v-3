/**
 * Notifications Module Types
 * Types for Notifications, Preferences, Telegram, and related entities
 */

/**
 * NotificationGroup
 * Enum for notification groups (integer enum from backend)
 * Since exact values are not specified in documentation, using number type
 */
export type NotificationGroup = number

/**
 * NotificationChannel
 * Enum for notification channels (string enum from backend)
 * Common values: 'email', 'telegram', 'web', etc.
 */
export type NotificationChannel = string

/**
 * Notification
 * Notification model
 */
export interface Notification {
  id: number
  type: string
  message: string
  data?: Record<string, unknown>
  read_at: string | null
  created_at: string
  updated_at: string
}

/**
 * NotificationPreference
 * Single preference entry in the preferences matrix
 */
export interface NotificationPreference {
  enabled: boolean
  settings?: Record<string, unknown>
}

/**
 * PreferencesMatrix
 * Matrix of preferences: groups × channels
 * Structure: Record<group, Record<channel, NotificationPreference>>
 */
export type PreferencesMatrix = Record<string, Record<string, NotificationPreference>>

/**
 * TelegramConnection
 * Telegram connection status and information
 */
export interface TelegramConnection {
  connected: boolean
  username?: string
  chat_id?: number
}

/**
 * DTO Types for API requests
 */

export interface UpdatePreferencesDTO {
  preferences: PreferencesMatrix
}

export interface UpdateSinglePreferenceDTO {
  group: NotificationGroup
  channel: NotificationChannel
  enabled: boolean
  settings?: Record<string, unknown>
}

export interface TelegramConnectDTO {
  token: string
}

