<template>
  <Container>
    <PageHeader title="Profile Settings" />

    <div class="profile-sections">
      <!-- Account Section -->
      <Card class="profile-section">
        <h2 class="section-title">Account</h2>

        <div class="avatar-section">
          <FormField label="Photo" hint="150x150px JPEG, PNG Image">
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
          <FormField label="Name">
            <div class="editable-field">
              <Input
                v-if="isEditingName"
                v-model="nameValue"
                @blur="handleNameBlur"
                @keyup.enter="handleNameSave"
                @keyup.esc="handleNameCancel"
                autofocus
              />
              <div v-else class="field-display" @click="startEditingName">
                <span>{{ centralUser?.name || 'Not set' }}</span>
                <svg class="edit-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M11.333 2.00001C11.5084 1.82475 11.7163 1.68603 11.9447 1.59231C12.1731 1.49859 12.4173 1.45178 12.6637 1.45463C12.91 1.45748 13.1532 1.50994 13.3789 1.60882C13.6046 1.7077 13.8081 1.85097 13.9778 2.03064C14.1475 2.21031 14.2799 2.41265 14.3681 2.62578C14.4563 2.8389 14.4987 3.06844 14.4928 3.29904C14.4869 3.52965 14.4328 3.75651 14.3337 3.96543C14.2346 4.17435 14.0925 4.36112 13.9163 4.51334L13.333 5.09668L10.9033 2.66668L11.333 2.00001ZM9.86998 3.46334L2.66665 10.6667V13.3333H5.33331L12.5366 6.13001L9.86998 3.46334Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          </FormField>

          <FormField label="Email" hint="Email cannot be changed">
            <Input :model-value="centralUser?.email || ''" disabled />
          </FormField>
        </div>

        <div class="form-actions">
          <Button type="button" :loading="isSubmitting" :disabled="!hasChanges" @click="handleSubmit">
            Save Changes
          </Button>
          <Button type="button" variant="ghost" @click="handleCancel">Cancel</Button>
        </div>
      </Card>

      <!-- Your Colleagues Section -->
      <Card v-if="colleagues.length > 0 || loadingColleagues" class="profile-section">
        <ColleaguesList :colleagues="colleagues" :loading="loadingColleagues" />
      </Card>
    </div>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { tenantApi } from '@/core/api/tenant'
import { centralApi } from '@/core/api/central'
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
import ColleaguesList from '@/features/workspace/components/ColleaguesList.vue'
import type { ApiResponse, ApiError, TenantUser, Invitation } from '@/core/api/types'

const uiStore = useUiStore()
const authStore = useAuthStore()

const user = ref<TenantUser | null>(null)
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const currentAvatar = ref<string | undefined>(undefined)
const isSubmitting = ref(false)
const loading = ref(false)
const colleagues = ref<Invitation[]>([])
const loadingColleagues = ref(false)

// Name editing state
const isEditingName = ref(false)
const nameValue = ref('')
const originalName = ref('')

const centralUser = computed(() => {
  // Use central_user from API response if available, otherwise fall back to authStore
  return user.value?.central_user || authStore.centralUser
})

const hasChanges = computed(() => {
  return avatarFile.value !== null || (isEditingName.value && nameValue.value !== originalName.value)
})

onMounted(async () => {
  await Promise.all([loadProfile(), loadColleagues()])
})

async function loadProfile() {
  loading.value = true
  try {
    const response = await tenantApi.get<ApiResponse<{ user: TenantUser }>>('/users/me')
    const data = extractData(response)
    user.value = data.user

    // Note: central_user is available in data.user.central_user
    // The computed centralUser will use it automatically

    // Extract avatar URL from the response structure
    if (data.user.avatar) {
      if (typeof data.user.avatar === 'string') {
        currentAvatar.value = data.user.avatar
      } else if (data.user.avatar.avatar?.url) {
        currentAvatar.value = data.user.avatar.avatar.url
      } else if (data.user.avatar.thumb?.url) {
        currentAvatar.value = data.user.avatar.thumb.url
      }
    } else {
      currentAvatar.value = undefined
    }
  } catch (err: unknown) {
    const apiError = err as ApiError
    uiStore.showToast(apiError.message || 'Failed to load profile', 'error')
  } finally {
    loading.value = false
  }
}

async function loadColleagues() {
  loadingColleagues.value = true
  try {
    const response = await tenantApi.get<ApiResponse<Invitation[]>>('/tenants/invitations')
    colleagues.value = extractData(response)
  } catch (err: unknown) {
    // Silently fail - colleagues section will just not show
    console.error('Failed to load colleagues:', err)
  } finally {
    loadingColleagues.value = false
  }
}

function startEditingName() {
  if (!centralUser.value) return
  isEditingName.value = true
  nameValue.value = centralUser.value.name || ''
  originalName.value = centralUser.value.name || ''
}

function handleNameCancel() {
  isEditingName.value = false
  nameValue.value = originalName.value
}

async function handleNameBlur() {
  if (nameValue.value !== originalName.value) {
    await saveName()
  } else {
    isEditingName.value = false
  }
}

async function handleNameSave() {
  if (nameValue.value !== originalName.value) {
    await saveName()
  }
  isEditingName.value = false
}

async function saveName() {
  if (!centralUser.value) return

  try {
    const response = await centralApi.put<ApiResponse<{ user: typeof centralUser.value }>>(
      '/users/me/central',
      { name: nameValue.value }
    )
    const data = extractData(response)
    authStore.centralUser = data.user
    originalName.value = nameValue.value
    uiStore.showToast('Name updated successfully', 'success')
  } catch (err: unknown) {
    const apiError = err as ApiError
    uiStore.showToast(apiError.message || 'Failed to update name', 'error')
    nameValue.value = originalName.value
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

      // Extract avatar URL from the response structure
      if (data.user.avatar) {
        if (typeof data.user.avatar === 'string') {
          currentAvatar.value = data.user.avatar
        } else if (data.user.avatar.avatar?.url) {
          currentAvatar.value = data.user.avatar.avatar.url
        } else if (data.user.avatar.thumb?.url) {
          currentAvatar.value = data.user.avatar.thumb.url
        }
      } else {
        currentAvatar.value = undefined
      }

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
  isEditingName.value = false
  nameValue.value = originalName.value
  await loadProfile()
}
</script>

<style scoped>
.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-section {
  width: 100%;
}

.section-title {
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
  width: 150px;
  height: 150px;
  border-radius: 8px;
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

.editable-field {
  width: 100%;
}

.field-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 42px;
}

.field-display:hover {
  background-color: #f8f9fa;
  border-color: #e0e0e0;
}

.field-display span {
  flex: 1;
  font-size: 16px;
  color: #333;
}

.edit-icon {
  margin-left: 8px;
  color: #007bff;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.field-display:hover .edit-icon {
  opacity: 1;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}
</style>
