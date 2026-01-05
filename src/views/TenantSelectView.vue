<template>
  <Container>
    <PageHeader
      title="Select Workspace"
      :actions="[
        {
          key: 'create',
          label: 'Create Workspace',
          variant: 'primary',
          onClick: () => (showFormModal = true),
        },
      ]"
    />

    <div v-if="loading" class="loading-state">
      <Spinner />
      <span>Loading workspaces...</span>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <Button @click="loadTenants">Retry</Button>
    </div>

    <div v-else-if="tenants.length === 0" class="empty-state">
      <Card>
        <div class="empty-content">
          <h2>No workspaces yet</h2>
          <p>Create your first workspace to get started.</p>
          <Button variant="primary" @click="showFormModal = true">Create Workspace</Button>
        </div>
      </Card>
    </div>

    <div v-else class="tenants-grid">
      <Card
        v-for="tenant in tenants"
        :key="tenant.id"
        class="tenant-card"
        @click="selectTenant(tenant)"
      >
        <div class="tenant-card-content">
          <h3>{{ tenant.title }}</h3>
          <p class="domain">{{ getTenantDomainString(tenant.domain) }}</p>
          <p v-if="tenant.timezone" class="timezone">{{ tenant.timezone }}</p>
        </div>
      </Card>
    </div>

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTenantsStore } from '@/stores/core/tenants'
import { useTenantContextStore } from '@/stores/core/tenant-context'
import { redirectToTenant } from '@/core/tenancy/redirect'
import { useUiStore } from '@/stores/core/ui'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import TenantForm from '@/features/tenants/components/TenantForm.vue'
import type { Tenant } from '@/core/api/types'
import { getTenantDomainString } from '@/core/api/types'
import type { TenantCreateDTO, TenantUpdateDTO } from '@/stores/core/tenants'

const tenantsStore = useTenantsStore()
const tenantContextStore = useTenantContextStore()
const uiStore = useUiStore()
const route = useRoute()

const showFormModal = ref(false)
const editingTenant = ref<Tenant | null>(null)

const loading = computed(() => tenantsStore.loading)
const error = computed(() => tenantsStore.error?.message || null)
const tenants = computed(() => tenantsStore.tenants)

const formTitle = computed(() => {
  return editingTenant.value ? 'Edit Workspace' : 'Create Workspace'
})

const autoRedirectBlocked = computed(() => {
  return route.query.reason === 'tenant-unauthorized'
})

// Auto-redirect if only one tenant (unless blocked due to auth failure)
watch(tenants, (newTenants) => {
  if (autoRedirectBlocked.value) {
    return
  }
  if (newTenants.length === 1 && !showFormModal.value && newTenants[0]) {
    selectTenant(newTenants[0])
  }
}, { immediate: true })

onMounted(async () => {
  if (autoRedirectBlocked.value) {
    uiStore.showToast('No access to this workspace. Select another workspace or request access.', 'error')
  }
  await loadTenants()
})

async function loadTenants() {
  try {
    await tenantsStore.fetchTenants()
  } catch {
    // Error handling is done in store
  }
}

function selectTenant(tenant: Tenant) {
  // Extract domain string
  const domainString = getTenantDomainString(tenant.domain)

  // Validate domain before redirect
  if (!domainString) {
    console.error('Cannot redirect: tenant domain is missing', tenant)
    return
  }

  // Set tenant context
  tenantContextStore.setTenantFromTenantsList({
    id: tenant.id,
    title: tenant.title,
    domain: domainString,
    timezone: tenant.timezone,
  })

  // Redirect to tenant subdomain dashboard
  redirectToTenant(domainString, '/dashboard')
}

async function handleFormSubmit(data: TenantCreateDTO | TenantUpdateDTO) {
  try {
    if (editingTenant.value) {
      await tenantsStore.updateTenant(editingTenant.value.id, data as TenantUpdateDTO)
    } else {
      const tenant = await tenantsStore.createTenant(data as TenantCreateDTO)
      // After creating, redirect to the new tenant
      showFormModal.value = false
      editingTenant.value = null
      // Extract domain string (use form data as fallback)
      const domainString = getTenantDomainString(tenant.domain) || (data as TenantCreateDTO).domain
      if (!domainString) {
        console.error('Domain is missing from tenant response and form data')
        return
      }
      // Small delay to ensure tenant is created
      setTimeout(() => {
        // Create a tenant object with guaranteed domain string for redirect
        selectTenant({ ...tenant, domain: domainString })
      }, 100)
      return
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
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #666;
}

.empty-content {
  text-align: center;
  padding: 40px;
}

.empty-content h2 {
  margin: 0 0 12px 0;
  color: #333;
}

.empty-content p {
  margin: 0 0 24px 0;
  color: #666;
}

.tenants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.tenant-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.tenant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tenant-card-content {
  padding: 20px;
}

.tenant-card-content h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #333;
}

.domain {
  margin: 0 0 4px 0;
  color: #007bff;
  font-size: 14px;
  font-weight: 500;
}

.timezone {
  margin: 0;
  color: #666;
  font-size: 12px;
}
</style>
