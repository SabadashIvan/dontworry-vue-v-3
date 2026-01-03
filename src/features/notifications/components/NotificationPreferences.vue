<template>
  <div v-if="matrix" class="notification-preferences">
    <h3>Notification Preferences</h3>
    <p class="description">Configure which notifications you want to receive and through which channels.</p>

    <div class="preferences-matrix">
      <table class="preferences-table">
        <thead>
          <tr>
            <th>Group</th>
            <th v-for="channel in channels" :key="channel" class="channel-header">
              {{ formatChannel(channel) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in groups" :key="group">
            <td class="group-cell">{{ formatGroup(group) }}</td>
            <td v-for="channel in channels" :key="`${group}-${channel}`" class="preference-cell">
              <Checkbox
                :model-value="getPreference(group, channel)?.enabled ?? false"
                :label="getPreference(group, channel)?.enabled ? 'Enabled' : 'Disabled'"
                @update:model-value="handleToggle(group, channel, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="form-actions">
      <Button :loading="loading" :disabled="loading" @click="handleSave">Save Preferences</Button>
    </div>
  </div>
  <div v-else-if="loading" class="loading-state">
    <Spinner />
    <span>Loading preferences...</span>
  </div>
  <div v-else class="error-state">
    <p>Failed to load preferences</p>
    <Button @click="loadPreferences">Retry</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNotificationPreferencesStore } from '@/stores/notifications/preferences'
import Checkbox from '@/shared/ui/Checkbox.vue'
import Button from '@/shared/ui/Button.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import type { PreferencesMatrix, NotificationGroup, NotificationChannel } from '@/features/notifications/types'

const preferencesStore = useNotificationPreferencesStore()

const loading = computed(() => preferencesStore.loading)
const matrix = computed(() => preferencesStore.matrix)
const localMatrix = ref<PreferencesMatrix | null>(null)

// Extract groups and channels from matrix
const groups = computed(() => {
  if (!matrix.value) return []
  return Object.keys(matrix.value)
})

const channels = computed(() => {
  if (!matrix.value) return []
  const channelSet = new Set<string>()
  for (const group in matrix.value) {
    for (const channel in matrix.value[group]) {
      channelSet.add(channel)
    }
  }
  return Array.from(channelSet).sort()
})

onMounted(async () => {
  if (!matrix.value) {
    await loadPreferences()
  }
  // Initialize local matrix for editing
  if (matrix.value) {
    localMatrix.value = JSON.parse(JSON.stringify(matrix.value))
  }
})

// Watch for matrix changes
watch(
  matrix,
  (newMatrix) => {
    if (newMatrix) {
      localMatrix.value = JSON.parse(JSON.stringify(newMatrix))
    }
  },
  { immediate: true }
)

async function loadPreferences() {
  try {
    await preferencesStore.fetchPreferences()
    if (preferencesStore.matrix) {
      localMatrix.value = JSON.parse(JSON.stringify(preferencesStore.matrix))
    }
  } catch {
    // Error handling is done in store
  }
}

function getPreference(group: string, channel: string) {
  if (!localMatrix.value) return null
  return localMatrix.value[group]?.[channel] || null
}

function handleToggle(group: string, channel: string, enabled: boolean) {
  if (!localMatrix.value) return

  if (!localMatrix.value[group]) {
    localMatrix.value[group] = {}
  }

  localMatrix.value[group][channel] = {
    enabled,
    settings: localMatrix.value[group][channel]?.settings,
  }
}

async function handleSave() {
  if (!localMatrix.value) return

  try {
    await preferencesStore.updatePreferences({
      preferences: localMatrix.value,
    })
  } catch {
    // Error handling is done in store
  }
}

function formatGroup(group: string): string {
  // Convert group key to readable format
  return group
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatChannel(channel: string): string {
  // Convert channel key to readable format
  return channel.charAt(0).toUpperCase() + channel.slice(1)
}
</script>

<style scoped>
.notification-preferences {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.preferences-matrix {
  overflow-x: auto;
}

.preferences-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.preferences-table th {
  padding: 12px;
  background: #f5f5f5;
  font-weight: 600;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  color: #333;
}

.preferences-table td {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.group-cell {
  font-weight: 500;
  color: #333;
  background: #fafafa;
}

.preference-cell {
  text-align: center;
}

.channel-header {
  text-align: center;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
  color: #666;
}

.error-state {
  color: #dc3545;
}
</style>

