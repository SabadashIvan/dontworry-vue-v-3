<template>
  <div class="reset-password-view">
    <div class="container">
      <h1>Reset Password</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="token">Token</label>
          <input
            id="token"
            v-model="token"
            type="text"
            required
            placeholder="Reset token from email"
          />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="your@email.com"
          />
        </div>
        <div class="form-group">
          <label for="password">New Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="••••••••"
          />
        </div>
        <div class="form-group">
          <label for="password_confirmation">Confirm Password</label>
          <input
            id="password_confirmation"
            v-model="passwordConfirmation"
            type="password"
            required
            placeholder="••••••••"
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Resetting...' : 'Reset Password' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>
      </form>
      <p class="links">
        <router-link to="/login">Back to Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { centralApi } from '@/core/api/central'
import { useUiStore } from '@/stores/core/ui'

const router = useRouter()
const uiStore = useUiStore()

const token = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function handleSubmit() {
  error.value = null
  success.value = null

  if (password.value !== passwordConfirmation.value) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true

  try {
    await centralApi.post('/users/auth/reset-password', {
      token: token.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    success.value = 'Password has been reset successfully.'
    if (success.value) {
      uiStore.showToast(success.value, 'success')
    }
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err) {
    const apiError = err as { message?: string; errors?: Record<string, string[]> }
    error.value = apiError.message || 'Failed to reset password'
    if (apiError.errors) {
      const errorMessages = Object.values(apiError.errors).flat() as string[]
      error.value = errorMessages.join(', ')
    }
    if (error.value) {
      uiStore.showToast(error.value, 'error')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  margin-bottom: 30px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
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
  margin-top: 10px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #dc3545;
  margin-top: 10px;
  font-size: 14px;
}

.success {
  color: #28a745;
  margin-top: 10px;
  font-size: 14px;
}

.links {
  margin-top: 20px;
  text-align: center;
}

.links a {
  color: #007bff;
  text-decoration: none;
}

.links a:hover {
  text-decoration: underline;
}
</style>

