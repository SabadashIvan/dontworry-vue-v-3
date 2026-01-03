<template>
  <div class="invitation-view">
    <div class="container">
      <h1>Workspace Invitation</h1>
      <div v-if="loading">Loading invitation...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="invitation">
        <p>You have been invited to join: <strong>{{ invitation.tenant.title }}</strong></p>
        <button @click="handleAccept" :disabled="accepting">
          {{ accepting ? 'Accepting...' : 'Accept Invitation' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { centralApi } from '@/core/api/central'
import { extractData } from '@/core/api/client'
import { useUiStore } from '@/stores/core/ui'
import type { ApiResponse } from '@/core/api/types'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const invitation = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const accepting = ref(false)

async function loadInvitation() {
  const token = route.params.token as string
  loading.value = true
  error.value = null

  try {
    const response = await centralApi.get<ApiResponse<any>>(`/tenants/invitations/view/${token}`)
    invitation.value = extractData(response)
  } catch (err: any) {
    error.value = err.message || 'Failed to load invitation'
  } finally {
    loading.value = false
  }
}

async function handleAccept() {
  if (!invitation.value) return

  accepting.value = true
  error.value = null

  try {
    await centralApi.post('/tenants/invitations/accept', {
      token: route.params.token,
    })
    uiStore.showToast('Invitation accepted successfully!', 'success')
    router.push('/tenants/select')
  } catch (err: any) {
    error.value = err.message || 'Failed to accept invitation'
    uiStore.showToast(error.value, 'error')
  } finally {
    accepting.value = false
  }
}

onMounted(() => {
  loadInvitation()
})
</script>

<style scoped>
.invitation-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 500px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 30px;
  text-align: center;
}

.error {
  color: #dc3545;
  margin-top: 10px;
}

button {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>

