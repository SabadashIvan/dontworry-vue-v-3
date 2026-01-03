<template>
  <Container>
    <PageHeader
      title="Workspaces"
      :actions="[
        {
          key: 'create',
          label: 'Create Workspace',
          variant: 'primary',
          onClick: () => {
            editingTenant = null
            showFormModal = true
          },
        },
      ]"
    />

    <Card>
      <Table
        :columns="columns"
        :data="(tenants as unknown) as Record<string, unknown>[]"
        :loading="loading"
        empty-text="No workspaces yet. Create one to get started."
      >
        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleEdit(row as unknown as Tenant)">Edit</Button>
            <Button size="sm" variant="ghost" @click="handleSwitch(row as unknown as Tenant)">Switch</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row as unknown as Tenant)">Delete</Button>
          </div>
        </template>
      </Table>
    </Card>

    <Modal v-model="showFormModal" :title="formTitle" size="md">
      <TenantForm
        :tenant="editingTenant"
        :is-edit="!!editingTenant"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTenantsStore } from '@/stores/core/tenants'
import { useTenantContextStore } from '@/stores/core/tenant-context'
import { redirectToTenant } from '@/core/tenancy/redirect'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import TenantForm from '@/features/tenants/components/TenantForm.vue'
import type { Tenant } from '@/core/api/types'
import type { TenantCreateDTO, TenantUpdateDTO } from '@/stores/core/tenants'
import type { TableColumn } from '@/shared/ui/Table.vue'

const tenantsStore = useTenantsStore()
const tenantContextStore = useTenantContextStore()

const showFormModal = ref(false)
const editingTenant = ref<Tenant | null>(null)

const loading = computed(() => tenantsStore.loading)
const tenants = computed(() => tenantsStore.tenants)

const formTitle = computed(() => {
  return editingTenant.value ? 'Edit Workspace' : 'Create Workspace'
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'title',
    label: 'Title',
    sortable: false,
  },
  {
    key: 'domain',
    label: 'Domain',
    sortable: false,
  },
  {
    key: 'timezone',
    label: 'Timezone',
    sortable: false,
    formatter: (value) => {
      return (value as string) || '-'
    },
  },
  {
    key: 'created_at',
    label: 'Created',
    sortable: false,
    formatter: (value) => {
      if (!value) return '-'
      return new Date(value as string).toLocaleDateString()
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
  await loadTenants()
})

async function loadTenants() {
  try {
    await tenantsStore.fetchTenants()
  } catch {
    // Error handling is done in store
  }
}

function handleEdit(tenant: Tenant) {
  editingTenant.value = tenant
  showFormModal.value = true
}

function handleSwitch(tenant: Tenant) {
  // Set tenant context
  tenantContextStore.setTenantFromTenantsList({
    id: tenant.id,
    title: tenant.title,
    domain: tenant.domain,
    timezone: tenant.timezone,
  })

  // Redirect to tenant subdomain
  redirectToTenant(tenant.domain, '/app')
}

async function handleDelete(tenant: Tenant) {
  if (confirm(`Are you sure you want to delete "${tenant.title}"? This action cannot be undone.`)) {
    try {
      await tenantsStore.deleteTenant(tenant.id)
      await loadTenants()
    } catch {
      // Error handling is done in store
    }
  }
}

async function handleFormSubmit(data: TenantCreateDTO | TenantUpdateDTO) {
  try {
    if (editingTenant.value) {
      await tenantsStore.updateTenant(editingTenant.value.id, data)
    } else {
      await tenantsStore.createTenant(data as TenantCreateDTO)
    }
    showFormModal.value = false
    editingTenant.value = null
    await loadTenants()
  } catch {
    // Error handling is done in store
  }
}
</script>

<style scoped>
.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
