<template>
  <div class="clients-sidebar">
    <div class="clients-header">
      <h3>Clients</h3>
    </div>

    <div v-if="loading" class="sidebar-loading">
      <span>Loading...</span>
    </div>

    <div v-else-if="clients.length === 0" class="sidebar-empty">
      <span>No clients yet</span>
    </div>

    <div v-else class="clients-list">
      <div
        v-for="client in clients"
        :key="client.id"
        class="client-item"
        :class="{ active: activeClientId === client.id }"
      >
        <div class="client-header">
          <router-link :to="`/projects/${client.id}`" class="client-info">
            <img
              v-if="client.avatar"
              :src="client.avatar"
              :alt="client.title"
              class="client-avatar"
            />
            <div v-else class="client-avatar-placeholder">📁</div>
            <span class="client-title">{{ client.title }}</span>
          </router-link>
          <span class="expand-icon" @click.stop="toggleClient(client.id)">{{ expandedClients.has(client.id) ? '−' : '+' }}</span>
        </div>

        <div v-if="expandedClients.has(client.id)" class="client-content">
          <div v-if="directoriesByClient[client.id]?.length === 0" class="no-directories">
            <span>No directories</span>
          </div>
          <div v-else class="directories-list">
            <div
              v-for="directory in directoriesByClient[client.id]"
              :key="directory.id"
              class="directory-item"
              :class="{ active: activeDirectoryId === directory.id }"
            >
              <div class="directory-header">
                <router-link :to="`/directories/${directory.id}`" class="directory-link">
                  <span class="directory-icon">📂</span>
                  <span class="directory-title">{{ directory.title }}</span>
                </router-link>
                <span class="expand-icon" @click.stop="toggleDirectory(client.id, directory.id)">{{ expandedDirectories.has(directory.id) ? '−' : '+' }}</span>
              </div>

              <div v-if="expandedDirectories.has(directory.id)" class="directory-content">
                <div v-if="websitesByDirectory[directory.id]?.length === 0" class="no-websites">
                  <span>No websites</span>
                </div>
                <div v-else class="websites-list">
                  <div
                    v-for="website in websitesByDirectory[directory.id]"
                    :key="website.id"
                    class="website-item"
                    @click="handleWebsiteClick(website)"
                  >
                    <span class="website-icon">🌐</span>
                    <span class="website-host">{{ website.host }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import { useWebsitesStore } from '@/stores/workspace/websites'
import type { Directory, Website } from '@/features/workspace/types'

const router = useRouter()
const route = useRoute()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()
const websitesStore = useWebsitesStore()

const expandedClients = ref<Set<number>>(new Set())
const expandedDirectories = ref<Set<number>>(new Set())

const loading = computed(() => clientsStore.loading || directoriesStore.loading || websitesStore.loading)
const clients = computed(() => clientsStore.clients)

const directoriesByClient = computed<Record<number, Directory[]>>(() => {
  const result: Record<number, Directory[]> = {}
  const allDirectories = Object.values(directoriesStore.byId)

  for (const client of clients.value) {
    result[client.id] = allDirectories.filter(dir => dir.client_id === client.id && dir.parent_id === null)
  }

  return result
})

const websitesByDirectory = computed<Record<number, Website[]>>(() => {
  const result: Record<number, Website[]> = {}
  const allWebsites = Object.values(websitesStore.byId)

  for (const directoryId of expandedDirectories.value) {
    result[directoryId] = allWebsites.filter(website => website.directory_id === directoryId)
  }

  return result
})

const activeClientId = computed(() => {
  if (route.name === 'project-detail' && route.params.id) {
    return Number(route.params.id)
  }
  return null
})

const activeDirectoryId = computed(() => {
  if (route.name === 'directory-detail' && route.params.id) {
    return Number(route.params.id)
  }
  return null
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
}

async function toggleClient(clientId: number) {
  if (expandedClients.value.has(clientId)) {
    expandedClients.value.delete(clientId)
    // Collapse all directories for this client
    const directories = directoriesByClient.value[clientId] || []
    for (const dir of directories) {
      expandedDirectories.value.delete(dir.id)
    }
  } else {
    expandedClients.value.add(clientId)
    // Load directories for this client
    await directoriesStore.fetchDirectories(clientId)
  }
}

async function toggleDirectory(clientId: number, directoryId: number) {
  if (expandedDirectories.value.has(directoryId)) {
    expandedDirectories.value.delete(directoryId)
  } else {
    expandedDirectories.value.add(directoryId)
    // Load websites for this directory
    await websitesStore.fetchWebsitesByDirectory(directoryId)
  }
}

function handleWebsiteClick(website: Website) {
  router.push(`/websites/${website.id}`)
}
</script>

<style scoped>
.clients-sidebar {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.clients-header {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
}

.clients-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.5px;
}

.sidebar-loading,
.sidebar-empty {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.clients-list {
  padding: 0 8px;
}

.client-item {
  margin-bottom: 4px;
}

.client-item.active .client-header {
  background: rgba(255, 255, 255, 0.15);
}

.client-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.client-info:hover {
  opacity: 0.8;
}

.client-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.client-avatar-placeholder {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.client-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-icon {
  font-size: 18px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.7);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.expand-icon:hover {
  color: rgba(255, 255, 255, 0.9);
}

.client-content {
  margin-left: 32px;
  margin-top: 4px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.no-directories {
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  font-style: italic;
}

.directories-list {
  margin-bottom: 4px;
}

.directory-item {
  margin-bottom: 2px;
}

.directory-item.active .directory-header {
  background: rgba(255, 255, 255, 0.15);
}

.directory-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.directory-link {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.directory-link:hover {
  opacity: 0.8;
}

.directory-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.directory-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.directory-content {
  margin-left: 20px;
  margin-top: 2px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.no-websites {
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  font-style: italic;
}

.websites-list {
  margin-bottom: 4px;
}

.website-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  user-select: none;
}

.website-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.website-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.website-host {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
