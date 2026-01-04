<template>
  <Container>
    <PageHeader
      title="Checks"
      :actions="[
        {
          key: 'create',
          label: 'Create Check',
          variant: 'primary',
          onClick: () => {
            editingCheck = null
            showFormModal = true
          },
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
      </div>

      <Table
        :columns="columns"
        :data="(checks as unknown) as Record<string, unknown>[]"
        :loading="loading"
        empty-text="No checks yet. Create one to get started."
      >
        <template #cell-checker="{ row }">
          <div class="checker-cell">
            <span class="checker-title">{{ (row as unknown as Check).checker?.title || 'Unknown' }}</span>
            <Badge v-if="(row as unknown as Check).checker" variant="secondary" size="sm">
              Service {{ (row as unknown as Check).checker?.service }}
            </Badge>
          </div>
        </template>

        <template #cell-status="{ row }">
          <Badge :variant="(row as unknown as Check).is_active ? 'success' : 'secondary'" size="sm">
            {{ (row as unknown as Check).is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row as unknown as Check)">Edit</Button>
            <Button
              size="sm"
              variant="ghost"
              :loading="runningChecks.has((row as unknown as Check).id)"
              :disabled="runningChecks.has((row as unknown as Check).id)"
              @click="handleRun(row as unknown as Check)"
            >
              {{ runningChecks.has((row as unknown as Check).id) ? 'Running...' : 'Run' }}
            </Button>
            <Button size="sm" variant="ghost" @click="handleViewHistory(row as unknown as Check)">History</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row as unknown as Check)">Delete</Button>
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
      <CheckForm
        :check="editingCheck"
        :is-edit="!!editingCheck"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChecksStore } from '@/stores/monitoring/checks'
import { useClientsStore } from '@/stores/workspace/clients'
import { useUiStore } from '@/stores/core/ui'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import FormField from '@/shared/ui/FormField.vue'
import Select from '@/shared/ui/Select.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Modal from '@/shared/ui/Modal.vue'
import CheckForm from '@/features/monitoring/components/CheckForm.vue'
import type { Check, CheckCreateDTO, CheckUpdateDTO } from '@/features/monitoring/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { SelectOption } from '@/shared/ui/Select.vue'
import type { PaginatorMeta } from '@/core/api/types'

const router = useRouter()
const checksStore = useChecksStore()
const clientsStore = useClientsStore()
const uiStore = useUiStore()

const showFormModal = ref(false)
const editingCheck = ref<Check | null>(null)
const selectedClientId = ref<number | undefined>(undefined)
const currentPage = ref(1)
const runningChecks = ref<Set<number>>(new Set())

const loading = computed(() => checksStore.loading)
const checks = computed(() => {
  const listKey = JSON.stringify({ clientId: selectedClientId.value, page: currentPage.value, perPage: 20 })
  const list = checksStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => checksStore.byId[id]).filter(Boolean)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  const listKey = JSON.stringify({ clientId: selectedClientId.value, page: currentPage.value, perPage: 20 })
  const list = checksStore.lists[listKey]
  return list?.paginator
})

const formTitle = computed(() => {
  return editingCheck.value ? 'Edit Check' : 'Create Check'
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

const columns = computed<TableColumn[]>(() => [
  {
    key: 'title',
    label: 'Title',
    sortable: false,
  },
  {
    key: 'checker',
    label: 'Checker',
    sortable: false,
  },
  {
    key: 'project',
    label: 'Project',
    sortable: false,
    formatter: (value, row) => {
      const check = row as unknown as Check
      const client = clientsStore.byId[check.client_id]
      return client?.title || `Project ${check.client_id}`
    },
  },
  {
    key: 'status',
    label: 'Status',
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
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
})

async function loadPage(page: number) {
  currentPage.value = page
  await checksStore.fetchChecks({ clientId: selectedClientId.value, page, perPage: 20 })
}

async function handleFilterChange() {
  currentPage.value = 1
  await loadPage(1)
}

function handleEdit(check: Check) {
  editingCheck.value = check
  showFormModal.value = true
}

async function handleRun(check: Check) {
  if (runningChecks.value.has(check.id)) {
    return
  }

  runningChecks.value.add(check.id)
  try {
    await checksStore.runCheck(check.id)
    uiStore.showToast(`Check "${check.title}" has been queued for execution`, 'success')

    // Optionally refresh the list after a delay to show updated status
    setTimeout(() => {
      loadPage(currentPage.value)
    }, 2000)
  } catch {
    // Error handling is done in store, but we can show additional feedback
    uiStore.showToast(`Failed to run check "${check.title}"`, 'error')
  } finally {
    // Remove from running set after a short delay to show the loading state
    setTimeout(() => {
      runningChecks.value.delete(check.id)
    }, 1000)
  }
}

function handleViewHistory(check: Check) {
  router.push(`/checks/${check.id}/history`)
}

async function handleDelete(check: Check) {
  if (confirm(`Are you sure you want to delete "${check.title}"?`)) {
    await checksStore.deleteCheck(check.id)
    await loadPage(currentPage.value)
  }
}

async function handleFormSubmit(data: CheckCreateDTO | CheckUpdateDTO) {
  try {
    if (editingCheck.value) {
      await checksStore.updateCheck(editingCheck.value.id, data as CheckUpdateDTO)
    } else {
      await checksStore.createCheck(data as CheckCreateDTO)
    }
    showFormModal.value = false
    editingCheck.value = null
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

.checker-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checker-title {
  font-weight: 500;
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
