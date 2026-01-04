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
            :model-value="selectedClientId ?? (undefined as unknown as number)"
            :options="clientOptions"
            placeholder="All projects"
            @update:model-value="selectedClientId = ($event === undefined || $event === null) ? undefined : (typeof $event === 'number' ? $event : undefined)"
            @change="handleFilterChange"
          />
        </FormField>

        <FormField label="Filter by Directory">
          <Select
            :model-value="selectedDirectoryId ?? (undefined as unknown as number)"
            :options="directoryOptions"
            placeholder="All directories"
            :disabled="!selectedClientId"
            @update:model-value="selectedDirectoryId = ($event === undefined || $event === null) ? undefined : (typeof $event === 'number' ? $event : undefined)"
            @change="handleFilterChange"
          />
        </FormField>
      </div>

      <Table
        :columns="columns"
        :data="(websites as unknown) as Record<string, unknown>[]"
        :loading="loading"
        empty-text="No websites yet. Create one to get started."
      >
        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row as unknown as Website)">Edit</Button>
            <Button size="sm" variant="ghost" @click="handleViewPages(row as unknown as Website)">Pages</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row as unknown as Website)">Delete</Button>
          </div>
        </template>
      </Table>

      <div v-if="paginator && paginator.last_page > 1" class="pagination">
        <Button
          :disabled="paginator.current_page === 1"
          variant="ghost"
          size="sm"
          @click="loadPage(paginator.current_page - 1)"
        >
          Previous
        </Button>
        <span class="pagination-info">
          Page {{ paginator.current_page }} of {{ paginator.last_page }}
        </span>
        <Button
          :disabled="paginator.current_page === paginator.last_page"
          variant="ghost"
          size="sm"
          @click="loadPage(paginator.current_page + 1)"
        >
          Next
        </Button>
      </div>
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
import type { PaginatorMeta } from '@/core/api/types'

const router = useRouter()
const websitesStore = useWebsitesStore()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()

const showFormModal = ref(false)
const editingWebsite = ref<Website | null>(null)
const selectedClientId = ref<number | undefined>(undefined)
const selectedDirectoryId = ref<number | undefined>(undefined)
const currentPage = ref(1)

const loading = computed(() => websitesStore.loading)
const websites = computed(() => {
  const listKey = JSON.stringify({
    clientId: selectedClientId.value,
    directoryId: selectedDirectoryId.value,
    page: currentPage.value,
    perPage: 20,
  })
  const list = websitesStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => websitesStore.byId[id]).filter((w): w is Website => w !== undefined)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  const listKey = JSON.stringify({
    clientId: selectedClientId.value,
    directoryId: selectedDirectoryId.value,
    page: currentPage.value,
    perPage: 20,
  })
  const list = websitesStore.lists[listKey]
  return list?.paginator
})

const formTitle = computed(() => {
  return editingWebsite.value ? 'Edit Website' : 'Create Website'
})

const clientOptions = computed<SelectOption[]>(() => {
  return [
    { label: 'All projects', value: undefined as unknown as number },
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
    { label: 'All directories', value: undefined as unknown as number },
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
  await loadPage(1)
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

async function loadPage(page: number) {
  currentPage.value = page
  await websitesStore.fetchWebsites(selectedClientId.value, selectedDirectoryId.value, { page, perPage: 20 })
}

async function handleFilterChange() {
  currentPage.value = 1
  await loadPage(1)
}

function handleEdit(website: Website) {
  editingWebsite.value = website
  showFormModal.value = true
}

function handleViewPages(website: Website) {
  router.push(`/websites/${website.id}`)
}

async function handleDelete(website: Website) {
  if (confirm(`Are you sure you want to delete "${website.host}"?`)) {
    await websitesStore.deleteWebsite(website.id)
    await loadPage(currentPage.value)
  }
}

async function handleFormSubmit(data: WebsiteCreateDTO | WebsiteUpdateDTO) {
  try {
    if (editingWebsite.value) {
      await websitesStore.updateWebsite(editingWebsite.value.id, data as WebsiteUpdateDTO)
    } else {
      await websitesStore.createWebsite(data as WebsiteCreateDTO)
    }
    showFormModal.value = false
    editingWebsite.value = null
    await loadPage(currentPage.value)
  } catch {
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}
</style>
