<template>
  <div class="telegram-connection">
    <h3>Telegram Connection</h3>

    <Card v-if="connection.connected">
      <div class="connection-status connected">
        <div class="status-header">
          <Badge variant="success" size="md">Connected</Badge>
          <Button size="sm" variant="danger" @click="handleDisconnect">Disconnect</Button>
        </div>
        <div v-if="connection.username" class="connection-info">
          <p><strong>Username:</strong> @{{ connection.username }}</p>
          <p v-if="connection.chat_id"><strong>Chat ID:</strong> {{ connection.chat_id }}</p>
        </div>
      </div>
    </Card>

    <Card v-else>
      <div class="connection-status disconnected">
        <Badge variant="secondary" size="md">Not Connected</Badge>
        <p class="status-description">Connect your Telegram account to receive notifications.</p>

        <div class="connection-actions">
          <Button v-if="connectionLink" variant="primary" @click="openConnectionLink">
            Open Connection Link
          </Button>
          <Button v-else :loading="loading" @click="handleGenerateLink">Generate Connection Link</Button>
        </div>

        <div v-if="connectionLink" class="connection-link-section">
          <FormField label="Or connect manually with token" hint="Enter the token from Telegram bot">
            <Input
              v-model="tokenInput"
              placeholder="Enter Telegram token"
              :error="tokenError || undefined"
            />
          </FormField>
          <Button :loading="loading" :disabled="!tokenInput" @click="handleConnect">Connect</Button>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTelegramStore } from '@/stores/notifications/telegram'
import Card from '@/shared/ui/Card.vue'
import Badge from '@/shared/ui/Badge.vue'
import Button from '@/shared/ui/Button.vue'
import Input from '@/shared/ui/Input.vue'
import FormField from '@/shared/ui/FormField.vue'

const telegramStore = useTelegramStore()

const tokenInput = ref('')
const tokenError = ref<string | null>(null)

const loading = computed(() => telegramStore.loading)
const connection = computed(() => telegramStore.connection)
const connectionLink = computed(() => telegramStore.connectionLink)

async function handleGenerateLink() {
  try {
    await telegramStore.generateConnectionLink()
  } catch {
    // Error handling is done in store
  }
}

function openConnectionLink() {
  if (connectionLink.value) {
    window.open(connectionLink.value, '_blank')
  }
}

async function handleConnect() {
  if (!tokenInput.value.trim()) {
    tokenError.value = 'Token is required'
    return
  }

  tokenError.value = null
  try {
    await telegramStore.connect({ token: tokenInput.value.trim() })
    tokenInput.value = ''
  } catch {
    // Error handling is done in store
  }
}

async function handleDisconnect() {
  if (confirm('Are you sure you want to disconnect Telegram?')) {
    try {
      await telegramStore.disconnect()
    } catch {
      // Error handling is done in store
    }
  }
}
</script>

<style scoped>
.telegram-connection {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.connection-status {
  padding: 20px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.connection-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.connection-info p {
  margin: 8px 0;
  color: #666;
}

.status-description {
  margin: 16px 0;
  color: #666;
}

.connection-actions {
  margin-top: 20px;
}

.connection-link-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

