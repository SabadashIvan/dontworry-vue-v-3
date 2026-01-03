<template>
  <Container v-if="client">
    <PageHeader
      :title="client.title"
      :subtitle="client.description"
      :actions="[
        {
          key: 'edit',
          label: 'Edit',
          variant: 'secondary',
          onClick: () => (showEditModal = true),
        },
        {
          key: 'delete-avatar',
          label: 'Delete Avatar',
          variant: 'ghost',
          onClick: handleDeleteAvatar,
          disabled: !client.avatar,
        },
      ]"
    />

    <div class="project-content">
      <div class="project-overview">
        <Card>
          <div class="overview-header">
            <div v-if="client.avatar" class="avatar-section">
              <img :src="client.avatar" :alt="client.title" class="project-avatar" />
            </div>
            <div v-else class="avatar-section">
              <div class="avatar-placeholder">📁</div>
            </div>
            <div class="overview-info">
              <h2>{{ client.title }}</h2>
              <p v-if="client.description" class="description">{{ client.description }}</p>
              <div v-if="client.tags && client.tags.length > 0" class="tags-section">
                <Badge v-for="(tag, index) in client.tags" :key="index" variant="secondary" size="sm">
                  {{ tag }}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div class="project-tabs">
        <div class="tabs-header">
          <button
            :class="['tab-button', { active: activeTab === 'overview' }]"
            @click="activeTab = 'overview'"
          >
            Overview
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'websites' }]"
            @click="activeTab = 'websites'"
          >
            Websites
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'directories' }]"
            @click="activeTab = 'directories'"
          >
            Directories
          </button>
        </div>

        <div class="tabs-content">
          <div v-if="activeTab === 'overview'" class="tab-panel">
            <Card>
              <h3>Project Information</h3>
              <dl class="info-list">
                <dt>Created</dt>
                <dd>{{ formatDate(client.created_at) }}</dd>
                <dt>Last Updated</dt>
                <dd>{{ formatDate(client.updated_at) }}</dd>
              </dl>
            </Card>
          </div>

          <div v-if="activeTab === 'websites'" class="tab-panel">
            <WebsitesList :client-id="client.id" />
          </div>

          <div v-if="activeTab === 'directories'" class="tab-panel">
            <DirectoryTree :client-id="client.id" />
          </div>
        </div>
      </div>
    </div>

    <Modal v-model="showEditModal" title="Edit Project" size="lg">
      <ProjectForm
        :client="client"
        is-edit
        @submit="handleFormSubmit"
        @cancel="showEditModal = false"
      />
    </Modal>

    <Modal v-model="showAvatarModal" title="Upload Avatar" size="md">
      <FileUpload
        v-model="avatarFile"
        accept="image/*"
        :max-size="5 * 1024 * 1024"
        @file-selected="handleAvatarSelected"
      />
      <div class="modal-actions">
        <Button variant="ghost" @click="showAvatarModal = false">Cancel</Button>
        <Button :loading="uploadingAvatar" @click="handleUploadAvatar">Upload</Button>
      </div>
    </Modal>
  </Container>

  <div v-else-if="loading" class="loading-state">
    <Spinner />
    <span>Loading project...</span>
  </div>

  <div v-else class="error-state">
    <p>Project not found</p>
    <Button @click="$router.push('/projects')">Back to Projects</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClientsStore } from '@/stores/workspace/clients'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Badge from '@/shared/ui/Badge.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import FileUpload from '@/shared/ui/FileUpload.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import ProjectForm from '@/features/workspace/components/ProjectForm.vue'
import DirectoryTree from '@/features/workspace/components/DirectoryTree.vue'
import WebsitesList from '@/features/workspace/components/WebsitesList.vue'
import type { Client, ClientUpdateDTO } from '@/features/workspace/types'

const route = useRoute()
const router = useRouter()
const clientsStore = useClientsStore()

const activeTab = ref<'overview' | 'websites' | 'directories'>('overview')
const showEditModal = ref(false)
const showAvatarModal = ref(false)
const avatarFile = ref<File | null>(null)
const uploadingAvatar = ref(false)

const clientId = computed(() => Number(route.params.id))
const client = computed(() => clientsStore.byId[clientId.value] || clientsStore.currentClient)
const loading = computed(() => clientsStore.loading)

onMounted(async () => {
  await clientsStore.fetchClient(clientId.value)
})

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

async function handleDeleteAvatar() {
  if (confirm('Are you sure you want to delete the avatar?')) {
    await clientsStore.deleteAvatar(clientId.value)
  }
}

async function handleFormSubmit(data: ClientUpdateDTO, avatarFile?: File) {
  try {
    await clientsStore.updateClient(clientId.value, data, avatarFile)
    showEditModal.value = false
  } catch (error) {
    // Error handling is done in store
  }
}

function handleAvatarSelected(file: File) {
  avatarFile.value = file
}

async function handleUploadAvatar() {
  if (!avatarFile.value) return

  uploadingAvatar.value = true
  try {
    await clientsStore.updateClient(clientId.value, {}, avatarFile.value)
    showAvatarModal.value = false
    avatarFile.value = null
  } catch (error) {
    // Error handling is done in store
  } finally {
    uploadingAvatar.value = false
  }
}
</script>

<style scoped>
.project-content {
  margin-top: 24px;
}

.project-overview {
  margin-bottom: 24px;
}

.overview-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.project-avatar {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.overview-info {
  flex: 1;
}

.overview-info h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: #333;
}

.description {
  margin: 0 0 16px 0;
  color: #666;
  line-height: 1.6;
}

.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-tabs {
  margin-top: 24px;
}

.tabs-header {
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 24px;
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tabs-content {
  min-height: 200px;
}

.info-list {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
  margin: 0;
}

.info-list dt {
  font-weight: 600;
  color: #666;
}

.info-list dd {
  margin: 0;
  color: #333;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #666;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
