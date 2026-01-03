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
            v-model="selectedClientId"
            :options="clientOptions"
            placeholder="All projects"
            @change="handleFilterChange"
          />
        </FormField>
      </div>

      <Table
        :columns="columns"
        :data="checks"
        :loading="loading"
        empty-text="No checks yet. Create one to get started."
      >
        <template #cell-checker="{ row }">
          <div class="checker-cell">
            <span class="checker-title">{{ row.checker?.title || 'Unknown' }}</span>
            <Badge v-if="row.checker" variant="secondary" size="sm">
              Service {{ row.checker.service }}
            </Badge>
          </div>
        </template>

        <template #cell-status="{ row }">
          <Badge :variant="row.is_active ? 'success' : 'secondary'" size="sm">
            {{ row.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row)">Edit</Button>
            <Button size="sm" variant="ghost" @click="handleRun(row)">Run</Button>
            <Button size="sm" variant="ghost" @click="handleViewHistory(row)">History</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row)">Delete</Button>
          </div>
        </template>
      </Table>
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

const router = useRouter()
const checksStore = useChecksStore()
const clientsStore = useClientsStore()

const showFormModal = ref(false)
const editingCheck = ref<Check | null>(null)
const selectedClientId = ref<number | undefined>(undefined)

const loading = computed(() => checksStore.loading)
const checks = computed(() => {
  const allChecks = Object.values(checksStore.byId)
  if (selectedClientId.value) {
    return allChecks.filter((check) => check.client_id === selectedClientId.value)
  }
  return allChecks
})

const formTitle = computed(() => {
  return editingCheck.value ? 'Edit Check' : 'Create Check'
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
      const check = row as Check
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
  await checksStore.fetchChecks()
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
})

async function handleFilterChange() {
  await checksStore.fetchChecks({ clientId: selectedClientId.value })
}

function handleEdit(check: Check) {
  editingCheck.value = check
  showFormModal.value = true
}

async function handleRun(check: Check) {
  try {
    await checksStore.runCheck(check.id)
  } catch (error) {
    // Error handling is done in store
  }
}

function handleViewHistory(check: Check) {
  router.push(`/checks/${check.id}/history`)
}

async function handleDelete(check: Check) {
  if (confirm(`Are you sure you want to delete "${check.title}"?`)) {
    await checksStore.deleteCheck(check.id)
    await handleFilterChange()
  }
}

async function handleFormSubmit(data: CheckCreateDTO | CheckUpdateDTO) {
  try {
    if (editingCheck.value) {
      await checksStore.updateCheck(editingCheck.value.id, data)
    } else {
      await checksStore.createCheck(data)
    }
    showFormModal.value = false
    editingCheck.value = null
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
</style>
