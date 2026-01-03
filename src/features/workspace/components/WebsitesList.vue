<template>
  <div class="websites-list">
    <Table
      :columns="columns"
      :data="(websites as unknown) as Record<string, unknown>[]"
      :loading="loading"
      empty-text="No websites yet. Create one to get started."
    >
      <template #cell-actions="{ row }">
        <Button size="sm" variant="ghost" @click="$emit('edit', row as unknown as Website)">Edit</Button>
        <Button size="sm" variant="ghost" @click="$emit('view-pages', row as unknown as Website)">Pages</Button>
        <Button size="sm" variant="danger" @click="$emit('delete', row as unknown as Website)">Delete</Button>
      </template>
    </Table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import type { Website } from '@/features/workspace/types'
import type { TableColumn } from '@/shared/ui/Table.vue'

export interface WebsitesListProps {
  clientId?: number
  directoryId?: number
}

const props = defineProps<WebsitesListProps>()

const emit = defineEmits<{
  edit: [website: Website]
  'view-pages': [website: Website]
  delete: [website: Website]
}>()

const websitesStore = useWebsitesStore()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()

const loading = computed(() => websitesStore.loading)
const websites = computed(() => {
  return Object.values(websitesStore.byId).filter((website) => {
    if (props.clientId && website.client_id !== props.clientId) return false
    if (props.directoryId && website.directory_id !== props.directoryId) return false
    return true
  })
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'host',
    label: 'Host',
    sortable: false,
  },
  {
    key: 'project',
    label: 'Project',
    sortable: false,
    formatter: (value, row) => {
      const website = row as unknown as Website
      const client = clientsStore.byId[website.client_id]
      return client?.title || `Project ${website.client_id}`
    },
  },
  {
    key: 'directory',
    label: 'Directory',
    sortable: false,
    formatter: (value, row) => {
      const website = row as unknown as Website
      if (!website.directory_id) return '-'
      const directory = directoriesStore.byId[website.directory_id]
      return directory?.title || `Directory ${website.directory_id}`
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    align: 'right',
  },
])

onMounted(async () => {
  await websitesStore.fetchWebsites(props.clientId, props.directoryId)
  // Load clients and directories for display
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
  if (props.clientId) {
    await directoriesStore.fetchDirectories(props.clientId)
  }
})
</script>

<style scoped>
.websites-list {
  width: 100%;
}
</style>

