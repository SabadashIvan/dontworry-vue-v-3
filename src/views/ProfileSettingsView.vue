<template>
  <Container>
    <PageHeader title="Profile Settings" />

    <Card>
      <form @submit.prevent="handleSubmit">
        <h2>Profile Information</h2>

        <div class="avatar-section">
          <FormField label="Avatar" hint="Upload a profile picture">
            <div class="avatar-upload">
              <div v-if="avatarPreview || currentAvatar" class="avatar-preview">
                <img :src="avatarPreview || currentAvatar || undefined" alt="Avatar preview" />
                <div class="avatar-overlay">
                  <Button size="sm" variant="ghost" @click.prevent="handleRemoveAvatar">Remove</Button>
                </div>
              </div>
              <FileUpload
                v-else
                :model-value="avatarFile"
                accept="image/*"
                :max-size="5 * 1024 * 1024"
                @update:model-value="handleAvatarChange"
              >
                <template #default="{ isDragging }">
                  <div :class="['upload-area', { 'is-dragging': isDragging }]">
                    <p>Click to upload or drag and drop</p>
                    <p class="hint">PNG, JPG up to 5MB</p>
                  </div>
                </template>
              </FileUpload>
            </div>
          </FormField>
        </div>

        <div v-if="centralUser" class="user-info">
          <FormField label="Email" hint="Email cannot be changed">
            <Input :model-value="centralUser.email" disabled />
          </FormField>

          <FormField label="Name" hint="Your display name">
            <Input :model-value="centralUser.name || ''" disabled />
          </FormField>
        </div>

        <div class="form-actions">
          <Button type="submit" :loading="isSubmitting" :disabled="!hasChanges">
            Save Changes
          </Button>
          <Button type="button" variant="ghost" @click="handleCancel">Cancel</Button>
        </div>
      </form>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import { createFormData } from '@/core/api/helpers'
import { useUiStore } from '@/stores/core/ui'
import { useAuthStore } from '@/stores/core/auth'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Input from '@/shared/ui/Input.vue'
import FormField from '@/shared/ui/FormField.vue'
import FileUpload from '@/shared/ui/FileUpload.vue'
import type { ApiResponse, ApiError } from '@/core/api/types'
import type { TenantUser } from '@/core/api/types'

const uiStore = useUiStore()
const authStore = useAuthStore()

const user = ref<TenantUser | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const currentAvatar = ref<string | undefined>(undefined)
const isSubmitting = ref(false)
const loading = ref(false)

const centralUser = computed(() => authStore.centralUser)

const hasChanges = computed(() => {
  return avatarFile.value !== null
})

onMounted(async () => {
  await loadProfile()
})

async function loadProfile() {
  loading.value = true
  try {
    const response = await tenantApi.get<ApiResponse<{ user: TenantUser }>>('/users/me')
    const data = extractData(response)
    user.value = data.user
    currentAvatar.value = data.user.avatar
  } catch (err: unknown) {
    const apiError = err as ApiError
    uiStore.showToast(apiError.message || 'Failed to load profile', 'error')
  } finally {
    loading.value = false
  }
}

function handleAvatarChange(file: File | null) {
  avatarFile.value = file
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  } else {
    avatarPreview.value = null
  }
}

function handleRemoveAvatar() {
  avatarFile.value = null
  avatarPreview.value = null
  currentAvatar.value = undefined
}

async function handleSubmit() {
  if (!hasChanges.value) return

  isSubmitting.value = true

  try {
    if (avatarFile.value) {
      // Upload avatar
      const formData = createFormData(avatarFile.value, 'avatar')
      const response = await tenantApi.put<ApiResponse<{ user: TenantUser }>>('/users/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const data = extractData(response)
      user.value = data.user
      currentAvatar.value = data.user.avatar
      avatarFile.value = null
      avatarPreview.value = null

      uiStore.showToast('Profile updated successfully', 'success')
    } else if (!currentAvatar.value && user.value?.avatar) {
      // Delete avatar
      await tenantApi.delete('/users/me/avatar')
      currentAvatar.value = undefined
      if (user.value) {
        user.value.avatar = undefined
      }

      uiStore.showToast('Avatar removed successfully', 'success')
    }
  } catch (err: unknown) {
    const apiError = err as ApiError
    uiStore.showToast(apiError.message || 'Failed to update profile', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function handleCancel() {
  avatarFile.value = null
  avatarPreview.value = null
  await loadProfile()
}
</script>

<style scoped>
h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.avatar-section {
  margin-bottom: 32px;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.avatar-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e0e0e0;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-preview:hover .avatar-overlay {
  opacity: 1;
}

.upload-area {
  width: 200px;
  padding: 40px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-area:hover,
.upload-area.is-dragging {
  border-color: #007bff;
  background: #f0f7ff;
}

.upload-area p {
  margin: 4px 0;
  color: #666;
}

.upload-area .hint {
  font-size: 12px;
  color: #999;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
