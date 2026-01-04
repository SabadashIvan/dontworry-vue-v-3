<template>
  <div class="colleagues-list">
    <div class="colleagues-header">
      <h3>Your Colleagues</h3>
      <button class="kebab-menu" aria-label="More options">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div v-if="loading" class="colleagues-loading">
      <span>Loading...</span>
    </div>

    <div v-else-if="colleagues.length === 0" class="colleagues-empty">
      <span>No colleagues yet</span>
    </div>

    <div v-else class="colleagues-table">
      <table>
        <thead>
          <tr>
            <th class="col-name">Name</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="colleague in colleagues" :key="colleague.id" class="colleague-row">
            <td class="col-name">
              <div class="colleague-info">
                <div class="colleague-avatar">
                  <div class="avatar-placeholder">
                    {{ getInitials(colleague.email) }}
                  </div>
                </div>
                <div class="colleague-details">
                  <div class="colleague-name">
                    {{ colleague.invitedBy?.name || colleague.email.split('@')[0] }}
                  </div>
                  <div class="colleague-email">{{ colleague.email }}</div>
                </div>
              </div>
            </td>
            <td class="col-actions">
              <button class="kebab-menu" aria-label="More options">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="13" r="1.5" fill="currentColor" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Invitation } from '@/core/api/types'

export interface ColleaguesListProps {
  colleagues: Invitation[]
  loading?: boolean
}

const props = withDefaults(defineProps<ColleaguesListProps>(), {
  loading: false,
})

function getInitials(email: string): string {
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}
</script>

<style scoped>
.colleagues-list {
  width: 100%;
}

.colleagues-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.colleagues-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.kebab-menu {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.kebab-menu:hover {
  background-color: #f0f0f0;
  color: #333;
}

.colleagues-loading,
.colleagues-empty {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.colleagues-table {
  width: 100%;
}

.colleagues-table table {
  width: 100%;
  border-collapse: collapse;
}

.colleagues-table thead th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
}

.colleagues-table tbody tr {
  border-bottom: 1px solid #e0e0e0;
}

.colleagues-table tbody tr:hover {
  background-color: #f8f9fa;
}

.colleagues-table tbody td {
  padding: 12px 16px;
}

.col-name {
  width: 100%;
}

.col-actions {
  width: 48px;
  text-align: right;
}

.colleague-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.colleague-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.colleague-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #007bff;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.colleague-details {
  flex: 1;
  min-width: 0;
}

.colleague-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  margin-bottom: 2px;
}

.colleague-email {
  font-size: 13px;
  color: #666;
}
</style>

