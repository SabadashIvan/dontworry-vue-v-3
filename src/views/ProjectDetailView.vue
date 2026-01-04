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

      <div class="project-sections">
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Folders</h2>
            <Button variant="primary" @click="showDirectoryFormModal = true">Add Folder</Button>
          </div>
          <Card>
            <DirectoriesGrid :client-id="client.id" />
          </Card>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Websites</h2>
            <Button variant="primary" @click="showWebsiteFormModal = true">Add Website</Button>
          </div>
          <Card>
            <WebsitesList :client-id="client.id" @edit="handleWebsiteEdit" @view-pages="handleViewPages" @delete="handleWebsiteDelete" />
          </Card>
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

    <Modal v-model="showDirectoryFormModal" :title="editingDirectory ? 'Edit Folder' : 'Add Folder'" size="md">
      <DirectoryForm
        :directory="editingDirectory"
        :client-id="clientId"
        :is-edit="!!editingDirectory"
        @submit="handleDirectoryFormSubmit"
        @cancel="showDirectoryFormModal = false; editingDirectory = null"
      />
    </Modal>

    <Modal v-model="showWebsiteFormModal" :title="editingWebsite ? 'Edit Website' : 'Add Website'" size="md">
      <WebsiteForm
        :website="editingWebsite"
        :is-edit="!!editingWebsite"
        :initial-client-id="editingWebsite ? undefined : clientId"
        @submit="handleWebsiteFormSubmit"
        @cancel="showWebsiteFormModal = false; editingWebsite = null"
      />
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
import DirectoriesGrid from '@/features/workspace/components/DirectoriesGrid.vue'
import DirectoryForm from '@/features/workspace/components/DirectoryForm.vue'
import WebsitesList from '@/features/workspace/components/WebsitesList.vue'
import WebsiteForm from '@/features/workspace/components/WebsiteForm.vue'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import { useWebsitesStore } from '@/stores/workspace/websites'
import type { ClientUpdateDTO, Directory, DirectoryCreateDTO, DirectoryUpdateDTO, Website, WebsiteCreateDTO, WebsiteUpdateDTO } from '@/features/workspace/types'

const route = useRoute()
const router = useRouter()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()
const websitesStore = useWebsitesStore()

const showEditModal = ref(false)
const showAvatarModal = ref(false)
const showDirectoryFormModal = ref(false)
const showWebsiteFormModal = ref(false)
const editingDirectory = ref<Directory | null>(null)
const editingWebsite = ref<Website | null>(null)
const avatarFile = ref<File | null>(null)
const uploadingAvatar = ref(false)

const clientId = computed(() => Number(route.params.id))
const client = computed(() => clientsStore.byId[clientId.value] || clientsStore.currentClient)
const loading = computed(() => clientsStore.loading)

onMounted(async () => {
  await clientsStore.fetchClient(clientId.value)
  await directoriesStore.fetchDirectories(clientId.value)
  await websitesStore.fetchWebsites(clientId.value)
})

async function handleDeleteAvatar() {
  if (confirm('Are you sure you want to delete the avatar?')) {
    await clientsStore.deleteAvatar(clientId.value)
  }
}

async function handleFormSubmit(data: ClientUpdateDTO, avatarFile?: File) {
  try {
    await clientsStore.updateClient(clientId.value, data, avatarFile)
    showEditModal.value = false
  } catch {
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
  } catch {
    // Error handling is done in store
  } finally {
    uploadingAvatar.value = false
  }
}

// Navigation is handled in DirectoriesGrid component
// handleDirectoryClick handler removed as it's not used

async function handleDirectoryFormSubmit(data: DirectoryCreateDTO | DirectoryUpdateDTO) {
  try {
    if (editingDirectory.value) {
      await directoriesStore.updateDirectory(editingDirectory.value.id, data)
    } else {
      await directoriesStore.createDirectory(data as DirectoryCreateDTO)
    }
    showDirectoryFormModal.value = false
    editingDirectory.value = null
    await directoriesStore.fetchDirectories(clientId.value)
  } catch {
    // Error handling is done in store
  }
}

function handleWebsiteEdit(website: Website) {
  editingWebsite.value = website
  showWebsiteFormModal.value = true
}

function handleViewPages(website: Website) {
  router.push(`/websites/${website.id}`)
}

async function handleWebsiteDelete(website: Website) {
  if (confirm(`Are you sure you want to delete "${website.host}"?`)) {
    await websitesStore.deleteWebsite(website.id)
    await websitesStore.fetchWebsites(clientId.value)
  }
}

async function handleWebsiteFormSubmit(data: WebsiteCreateDTO | WebsiteUpdateDTO) {
  try {
    if (editingWebsite.value) {
      await websitesStore.updateWebsite(editingWebsite.value.id, data)
    } else {
      await websitesStore.createWebsite(data as WebsiteCreateDTO)
    }
    showWebsiteFormModal.value = false
    editingWebsite.value = null
    await websitesStore.fetchWebsites(clientId.value)
  } catch {
    // Error handling is done in store
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

.project-sections {
  margin-top: 24px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
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
