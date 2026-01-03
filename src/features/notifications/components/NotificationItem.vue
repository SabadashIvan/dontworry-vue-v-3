<template>
  <div
    :class="['notification-item', { 'notification-item--read': notification.read_at, 'notification-item--unread': !notification.read_at }]"
    @click="$emit('click', notification)"
  >
    <div class="notification-content">
      <div class="notification-header">
        <h4 class="notification-type">{{ notification.type }}</h4>
        <Badge v-if="!notification.read_at" variant="info" size="sm">New</Badge>
        <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
      </div>
      <p class="notification-message">{{ notification.message }}</p>
    </div>
    <div v-if="!notification.read_at" class="notification-actions">
      <Button size="sm" variant="ghost" @click.stop="$emit('mark-read', notification.id)">Mark as read</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import type { Notification } from '@/features/notifications/types'

export interface NotificationItemProps {
  notification: Notification
}

const props = defineProps<NotificationItemProps>()

defineEmits<{
  click: [notification: Notification]
  'mark-read': [id: number]
}>()

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
</script>

<style scoped>
.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 16px;
}

.notification-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.notification-item--unread {
  border-left: 4px solid #007bff;
  background: #f8f9ff;
}

.notification-item--read {
  opacity: 0.8;
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.notification-type {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-transform: capitalize;
}

.notification-time {
  margin-left: auto;
  font-size: 12px;
  color: #666;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.notification-actions {
  flex-shrink: 0;
}
</style>

