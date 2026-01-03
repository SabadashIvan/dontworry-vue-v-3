<template>
  <Container>
    <PageHeader
      title="Websites"
      :actions="[
        {
          key: 'create',
          label: 'Create Website',
          variant: 'primary',
          onClick: () => (showFormModal = true),
        },
      ]"
    />

    <Card>
      <div class="filters">
        <FormField label="Filter by Project">
          <Select
            v-model="selectedClientId"
            :options="clientOptions"
            placeholder="All projects"
            @change="handleFilterChange"
          />
        </FormField>

        <FormField label="Filter by Directory">
          <Select
            v-model="selectedDirectoryId"
            :options="directoryOptions"
            placeholder="All directories"
            :disabled="!selectedClientId"
            @change="handleFilterChange"
          />
        </FormField>
      </div>

      <Table
        :columns="columns"
        :data="websites"
        :loading="loading"
        empty-text="No websites yet. Create one to get started."
      >
        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row)">Edit</Button>
            <Button size="sm" variant="ghost" @click="handleViewPages(row)">Pages</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row)">Delete</Button>
          </div>
        </template>
      </Table>
    </Card>

    <Modal v-model="showFormModal" :title="formTitle" size="md">
      <WebsiteForm
        :website="editingWebsite"
        :is-edit="!!editingWebsite"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import FormField from '@/shared/ui/FormField.vue'
import Select from '@/shared/ui/Select.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import WebsiteForm from '@/features/workspace/components/WebsiteForm.vue'
import type { Website, WebsiteCreateDTO, WebsiteUpdateDTO } from '@/features/workspace/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { SelectOption } from '@/shared/ui/Select.vue'

const router = useRouter()
const websitesStore = useWebsitesStore()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()

const showFormModal = ref(false)
const editingWebsite = ref<Website | null>(null)
const selectedClientId = ref<number | undefined>(undefined)
const selectedDirectoryId = ref<number | undefined>(undefined)

const loading = computed(() => websitesStore.loading)
const websites = computed(() => {
  return Object.values(websitesStore.byId).filter((website) => {
    if (selectedClientId.value && website.client_id !== selectedClientId.value) return false
    if (selectedDirectoryId.value && website.directory_id !== selectedDirectoryId.value) return false
    return true
  })
})

const formTitle = computed(() => {
  return editingWebsite.value ? 'Edit Website' : 'Create Website'
})

const clientOptions = computed<SelectOption[]>(() => {
  return [
    { label: 'All projects', value: undefined },
    ...clientsStore.clients.map((client) => ({
      label: client.title,
      value: client.id,
    })),
  ]
})

const directoryOptions = computed<SelectOption[]>(() => {
  if (!selectedClientId.value) {
    return []
  }

  const directories = Object.values(directoriesStore.byId).filter(
    (dir) => dir.client_id === selectedClientId.value
  )

  return [
    { label: 'All directories', value: undefined },
    ...directories.map((directory) => ({
      label: directory.title,
      value: directory.id,
    })),
  ]
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
      const website = row as Website
      const client = clientsStore.byId[website.client_id]
      return client?.title || `Project ${website.client_id}`
    },
  },
  {
    key: 'directory',
    label: 'Directory',
    sortable: false,
    formatter: (value, row) => {
      const website = row as Website
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
  await websitesStore.fetchWebsites()
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
})

watch(selectedClientId, async (clientId) => {
  selectedDirectoryId.value = undefined
  if (clientId) {
    await directoriesStore.fetchDirectories(clientId)
  }
  await handleFilterChange()
})

async function handleFilterChange() {
  await websitesStore.fetchWebsites(selectedClientId.value, selectedDirectoryId.value)
}

function handleEdit(website: Website) {
  editingWebsite.value = website
  showFormModal.value = true
}

function handleViewPages(website: Website) {
  router.push(`/websites/${website.id}/pages`)
}

async function handleDelete(website: Website) {
  if (confirm(`Are you sure you want to delete "${website.host}"?`)) {
    await websitesStore.deleteWebsite(website.id)
    await handleFilterChange()
  }
}

async function handleFormSubmit(data: WebsiteCreateDTO | WebsiteUpdateDTO) {
  try {
    if (editingWebsite.value) {
      await websitesStore.updateWebsite(editingWebsite.value.id, data)
    } else {
      await websitesStore.createWebsite(data)
    }
    showFormModal.value = false
    editingWebsite.value = null
    await handleFilterChange()
  } catch (error) {
    // Error handling is done in store
  }
}
</script>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
