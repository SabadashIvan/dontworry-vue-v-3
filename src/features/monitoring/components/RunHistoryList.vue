<template>
  <div class="run-history-list">
    <div v-if="runHistory && runHistory.length > 0" class="history-items">
      <div
        v-for="(job, index) in runHistory"
        :key="job.id || index"
        class="history-item"
      >
        <div class="history-item-header">
          <div class="history-item-status">
            <Badge :variant="getStatusVariant(job.status)" size="sm">
              {{ job.status }}
            </Badge>
          </div>
          <div class="history-item-time">
            <span class="time-label">Started:</span>
            <span class="time-value">{{ formatDate(job.created_at) }}</span>
          </div>
          <div v-if="job.finished_at" class="history-item-time">
            <span class="time-label">Finished:</span>
            <span class="time-value">{{ formatDate(job.finished_at) }}</span>
          </div>
          <div v-if="job.finished_at && job.created_at" class="history-item-duration">
            <span class="duration-label">Duration:</span>
            <span class="duration-value">{{ calculateDuration(job.created_at, job.finished_at) }}</span>
          </div>
        </div>
        <div v-if="job.error" class="history-item-error">
          <strong>Error:</strong> {{ job.error }}
        </div>
      </div>
    </div>
    <div v-else class="no-history">
      <p>No run history available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import Badge from '@/shared/ui/Badge.vue'
import type { JobDTO } from '@/features/monitoring/types'

export interface RunHistoryListProps {
  runHistory?: JobDTO[]
}

withDefaults(defineProps<RunHistoryListProps>(), {
  runHistory: () => [],
})

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function calculateDuration(start: string, end: string): string {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  const durationMs = endTime - startTime
  const durationSeconds = Math.floor(durationMs / 1000)

  if (durationSeconds < 60) {
    return `${durationSeconds}s`
  }
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  return `${minutes}m ${seconds}s`
}

function getStatusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
  const lowerStatus = status.toLowerCase()
  if (lowerStatus.includes('completed') || lowerStatus.includes('success') || lowerStatus === 'finished') {
    return 'success'
  }
  if (lowerStatus.includes('failed') || lowerStatus.includes('error')) {
    return 'danger'
  }
  if (lowerStatus.includes('processing') || lowerStatus.includes('running') || lowerStatus === 'pending') {
    return 'warning'
  }
  return 'info'
}
</script>

<style scoped>
.run-history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.history-item-status {
  flex-shrink: 0;
}

.history-item-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.time-label {
  color: #666;
  font-weight: 500;
}

.time-value {
  color: #333;
}

.history-item-duration {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-left: auto;
}

.duration-label {
  color: #666;
  font-weight: 500;
}

.duration-value {
  color: #333;
  font-weight: 600;
}

.history-item-error {
  margin-top: 12px;
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  font-size: 14px;
}

.no-history {
  padding: 40px;
  text-align: center;
  color: #666;
  font-style: italic;
}
</style>

