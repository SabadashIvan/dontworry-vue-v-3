<template>
  <Container>
    <PageHeader
      title="Projects"
      :actions="[
        {
          key: 'create',
          label: 'Create Project',
          variant: 'primary',
          onClick: () => (showFormModal = true),
        },
      ]"
    />

    <Card>
      <Table
        :columns="columns"
        :data="clients"
        :loading="loading"
        empty-text="No projects yet. Create one to get started."
      >
        <template #cell-avatar="{ row }">
          <img
            v-if="row.avatar"
            :src="row.avatar"
            :alt="row.title"
            class="avatar-thumbnail"
          />
          <span v-else class="avatar-placeholder">📁</span>
        </template>

        <template #cell-tags="{ row }">
          <div class="tags-cell">
            <Badge v-for="(tag, index) in row.tags" :key="index" variant="secondary" size="sm">
              {{ tag }}
            </Badge>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row)">Edit</Button>
            <Button size="sm" variant="ghost" @click="handleViewDetails(row)">Details</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row)">Delete</Button>
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

    <Modal v-model="showFormModal" :title="formTitle" size="lg">
      <ProjectForm
        :client="editingClient"
        :is-edit="!!editingClient"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '@/stores/workspace/clients'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Modal from '@/shared/ui/Modal.vue'
import ProjectForm from '@/features/workspace/components/ProjectForm.vue'
import type { Client, ClientCreateDTO, ClientUpdateDTO } from '@/features/workspace/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { PaginatorMeta } from '@/core/api/types'

const router = useRouter()
const clientsStore = useClientsStore()

const showFormModal = ref(false)
const editingClient = ref<Client | null>(null)
const currentPage = ref(1)

const loading = computed(() => clientsStore.loading)
const clients = computed(() => {
  const listKey = JSON.stringify({ page: currentPage.value, perPage: 20 })
  const list = clientsStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => clientsStore.byId[id]).filter(Boolean)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  const listKey = JSON.stringify({ page: currentPage.value, perPage: 20 })
  const list = clientsStore.lists[listKey]
  return list?.paginator
})

const formTitle = computed(() => {
  return editingClient.value ? 'Edit Project' : 'Create Project'
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'avatar',
    label: '',
    sortable: false,
    align: 'center',
    cellStyle: { width: '60px' },
  },
  {
    key: 'title',
    label: 'Title',
    sortable: false,
  },
  {
    key: 'description',
    label: 'Description',
    sortable: false,
  },
  {
    key: 'tags',
    label: 'Tags',
    sortable: false,
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
})

async function loadPage(page: number) {
  currentPage.value = page
  await clientsStore.fetchClients({ page, perPage: 20 })
}

function handleEdit(client: Client) {
  editingClient.value = client
  showFormModal.value = true
}

function handleViewDetails(client: Client) {
  router.push(`/projects/${client.id}`)
}

async function handleDelete(client: Client) {
  if (confirm(`Are you sure you want to delete "${client.title}"?`)) {
    await clientsStore.deleteClient(client.id)
    await loadPage(currentPage.value)
  }
}

async function handleFormSubmit(data: ClientCreateDTO | ClientUpdateDTO, avatarFile?: File) {
  try {
    if (editingClient.value) {
      await clientsStore.updateClient(editingClient.value.id, data, avatarFile)
    } else {
      await clientsStore.createClient(data, avatarFile)
    }
    showFormModal.value = false
    editingClient.value = null
    await loadPage(currentPage.value)
  } catch (error) {
    // Error handling is done in store
  }
}
</script>

<style scoped>
.avatar-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 24px;
  display: inline-block;
  width: 40px;
  height: 40px;
  text-align: center;
  line-height: 40px;
}

.tags-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}
</style>
