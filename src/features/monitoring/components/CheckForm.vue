<template>
  <form @submit.prevent="handleSubmit">
    <FormField label="Project" :error="errors.client_id" required>
      <Select
        v-if="fields.client_id"
        id="client_id"
        :model-value="(fields.client_id.value.value as number | undefined) ?? (undefined as unknown as number)"
        :options="clientOptions"
        placeholder="Select a project"
        :error="errors.client_id || undefined"
        @update:model-value="fields.client_id.value.value = $event"
        @change="handleClientChange"
        @blur="fields.client_id.touched.value = true"
      />
    </FormField>

    <FormField label="Title" :error="errors.title" required>
      <Input
        v-if="fields.title"
        id="title"
        :model-value="String(fields.title.value.value || '')"
        placeholder="Enter check title"
        :error="errors.title || undefined"
        @update:model-value="fields.title.value.value = $event"
        @blur="fields.title.touched.value = true"
      />
    </FormField>

    <FormField label="Checker" :error="errors.checker_id" required>
      <Select
        v-if="fields.checker_id"
        id="checker_id"
        :model-value="(fields.checker_id.value.value as number | undefined) ?? (undefined as unknown as number)"
        :options="checkerOptions"
        placeholder="Select a checker"
        :error="errors.checker_id || undefined"
        :disabled="loadingCheckers || checkerOptions.length === 0"
        @update:model-value="handleCheckerChange"
        @blur="fields.checker_id.touched.value = true"
      />
      <p v-if="checkerOptions.length === 0 && !loadingCheckers" class="hint warning">
        No checkers available. You may not have permission to view checkers, or no checkers are configured.
      </p>
      <p v-if="selectedChecker" class="checker-info">
        Service: {{ selectedChecker.service }} | Active: {{ selectedChecker.is_active ? 'Yes' : 'No' }}
      </p>
    </FormField>

    <FormField
      v-if="selectedChecker && selectedChecker.config_fields"
      label="Pages"
      :error="errors.page_ids"
      :hint="getPagesHint()"
    >
      <Select
        v-if="fields.page_ids"
        id="page_ids"
        :model-value="(fields.page_ids.value.value as number[]) || []"
        :options="pageOptions"
        placeholder="Select pages to monitor (optional)"
        :error="errors.page_ids || undefined"
        :disabled="!selectedClientId || loadingPages"
        multiple
        @update:model-value="fields.page_ids.value.value = ($event as number[]) || []"
      />
      <p v-if="!selectedClientId" class="hint">Please select a project first to load pages</p>
      <p v-if="selectedClientId && pageOptions.length === 0 && !loadingPages" class="hint warning">
        No pages available for this project. Create pages first.
      </p>
      <div v-if="selectedPages.length > 0" class="selected-pages-preview">
        <strong>Selected pages ({{ selectedPages.length }}):</strong>
        <ul class="pages-list">
          <li v-for="page in selectedPages" :key="page.id" class="page-item">
            {{ getPageLabel(page) }}
          </li>
        </ul>
      </div>
    </FormField>

    <!-- Dynamic config form -->
    <CheckConfigForm
      v-if="selectedChecker && selectedChecker.config_fields"
      :config-fields="selectedChecker.config_fields"
      :initial-config="checkConfig"
      @update:config="handleConfigUpdate"
    />

    <!-- Config preview -->
    <div v-if="Object.keys(checkConfig).length > 0" class="config-preview-section">
      <FormField label="Configuration Preview" hint="Review your configuration before saving">
        <pre class="config-preview">{{ JSON.stringify(checkConfig, null, 2) }}</pre>
      </FormField>
    </div>

    <FormField label="Active" :error="errors.is_active" hint="Enable or disable this check">
      <Checkbox
        v-if="fields.is_active"
        :model-value="Boolean(fields.is_active.value.value ?? true)"
        label="Enable this check"
        @update:model-value="fields.is_active.value.value = $event"
      />
    </FormField>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Check
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useForm } from '@/shared/composables/useForm'
import { required } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import Select from '@/shared/ui/Select.vue'
import Checkbox from '@/shared/ui/Checkbox.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import CheckConfigForm from './CheckConfigForm.vue'
import { useClientsStore } from '@/stores/workspace/clients'
import { useCheckersStore } from '@/stores/monitoring/checkers'
import { usePagesStore } from '@/stores/workspace/pages'
import { useWebsitesStore } from '@/stores/workspace/websites'
import type { Check, CheckCreateDTO, CheckUpdateDTO } from '@/features/monitoring/types'
import type { SelectOption } from '@/shared/ui/Select.vue'
import type { Page } from '@/features/workspace/types'

export interface CheckFormProps {
  check?: Check | null
  isEdit?: boolean
  initialClientId?: number
  websiteId?: number
}

const props = withDefaults(defineProps<CheckFormProps>(), {
  check: null,
  isEdit: false,
  initialClientId: undefined,
  websiteId: undefined,
})

const emit = defineEmits<{
  submit: [data: CheckCreateDTO | CheckUpdateDTO]
  cancel: []
}>()

const clientsStore = useClientsStore()
const checkersStore = useCheckersStore()
const pagesStore = usePagesStore()
const websitesStore = useWebsitesStore()

const selectedClientId = ref<number | undefined>(props.check?.client_id || props.initialClientId)
const selectedCheckerId = ref<number | undefined>(props.check?.checker_id)
const checkConfig = ref<Record<string, unknown>>(props.check?.config || {})
const loadingCheckers = ref(false)
const loadingPages = ref(false)

// Initialize form
const { fields, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'client_id',
      initialValue: props.check?.client_id || props.initialClientId || undefined,
      validators: [required('Project is required')],
      validateOnBlur: true,
    },
    {
      name: 'title',
      initialValue: props.check?.title || '',
      validators: [required('Title is required')],
      validateOnBlur: true,
    },
    {
      name: 'checker_id',
      initialValue: props.check?.checker_id || undefined,
      validators: [required('Checker is required')],
      validateOnBlur: true,
    },
    {
      name: 'page_ids',
      initialValue: props.check?.page_ids || [],
    },
    {
      name: 'is_active',
      initialValue: props.check?.is_active !== undefined ? props.check.is_active : true,
    },
  ],
  onSubmit: async (formValues) => {
    const formData: CheckCreateDTO | CheckUpdateDTO = {
      client_id: formValues.client_id as number,
      title: formValues.title as string,
      checker_id: formValues.checker_id as number,
      page_ids: (formValues.page_ids as number[]) || [],
      config: Object.keys(checkConfig.value).length > 0 ? checkConfig.value : undefined,
      is_active: formValues.is_active as boolean,
    }

    emit('submit', formData)
  },
})

// Client options
const clientOptions = computed<SelectOption[]>(() => {
  return clientsStore.clients.map((client) => ({
    label: client.title,
    value: client.id,
  }))
})

// Checker options
const checkerOptions = computed<SelectOption[]>(() => {
  return checkersStore.checkers.map((checker) => ({
    label: checker.title,
    value: checker.id,
  }))
})

// Selected checker
const selectedChecker = computed(() => {
  if (!selectedCheckerId.value) return null
  return checkersStore.byId[selectedCheckerId.value] || null
})

// Page options (filtered by selected client and optionally by website)
const pageOptions = computed<SelectOption[]>(() => {
  if (!selectedClientId.value) return []

  // Get all websites for this client
  let clientWebsites = Object.values(websitesStore.byId).filter(
    (website) => website.client_id === selectedClientId.value
  )

  // If websiteId is provided, filter to only that website
  if (props.websiteId) {
    clientWebsites = clientWebsites.filter((website) => website.id === props.websiteId)
  }

  // Get all pages for these websites
  const allPages = Object.values(pagesStore.byId)
  const clientPages = allPages.filter((page) => {
    return clientWebsites.some((website) => website.id === page.website_id)
  })

  return clientPages.map((page) => {
    const website = websitesStore.byId[page.website_id]
    const websiteLabel = website ? `${website.host} - ` : ''
    return {
      label: `${websiteLabel}${page.title} (${page.slug})`,
      value: page.id,
    }
  })
})

// Selected pages for preview
const selectedPages = computed(() => {
  if (!fields.page_ids?.value.value) return []
  const pageIds = fields.page_ids.value.value as number[]
  return pageIds
    .map((pageId) => pagesStore.byId[pageId])
    .filter(Boolean) as Page[]
})

// Watch for client changes
watch(
  () => fields.client_id?.value.value,
  async (newClientId) => {
    const clientId = typeof newClientId === 'number' ? newClientId : undefined
    selectedClientId.value = clientId
    if (clientId) {
      await loadCheckers(clientId)
      loadingPages.value = true
      try {
        // Load websites for this client
        await websitesStore.fetchWebsites(clientId)
        // Load all pages (API doesn't accept website_id parameter, filter on client side)
        await pagesStore.fetchPages()
      } finally {
        loadingPages.value = false
      }
    }
  }
)

// Watch for checker changes
watch(
  () => fields.checker_id?.value.value,
  async (newCheckerId) => {
    const checkerId = typeof newCheckerId === 'number' ? newCheckerId : undefined
    selectedCheckerId.value = checkerId
    if (checkerId && !selectedChecker.value?.config_fields) {
      // Load checker details to get config_fields
      loadingCheckers.value = true
      try {
        await checkersStore.fetchChecker(checkerId)
      } finally {
        loadingCheckers.value = false
      }
    }
  }
)

function handleClientChange() {
  // Reset pages when client changes
  if (fields.page_ids) {
    fields.page_ids.value.value = []
  }
}

function handleCheckerChange(value: string | number | (string | number)[]) {
  const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : undefined
  if (numValue !== undefined && !isNaN(numValue)) {
    if (fields.checker_id) {
      fields.checker_id.value.value = numValue
    }
    selectedCheckerId.value = numValue
    // Reset config when checker changes
    checkConfig.value = {}
  }
}

function handleConfigUpdate(config: Record<string, unknown>) {
  checkConfig.value = { ...config }
}

function getPagesHint(): string {
  if (!selectedClientId.value) {
    return 'Select a project first to load pages'
  }
  if (pageOptions.value.length === 0) {
    return 'No pages available. Create pages for websites in this project first.'
  }
  return `Select pages to monitor (${pageOptions.value.length} available)`
}

function getPageLabel(page: Page): string {
  const website = websitesStore.byId[page.website_id]
  if (website) {
    return `${website.host} - ${page.title} (${page.slug})`
  }
  return `${page.title} (${page.slug})`
}

async function loadCheckers(clientId?: number) {
  if (checkersStore.checkers.length > 0) {
    return
  }

  loadingCheckers.value = true
  try {
    await checkersStore.fetchCheckers(clientId ? { clientId } : undefined)
  } catch (error) {
    // Handle 403 Forbidden - user may not have permission to list checkers
    const apiError = error as { status?: number; message?: string }
    if (apiError.status === 403) {
      // Show error but don't block form - user might be able to select checker by ID
      console.warn('Cannot load checkers list: insufficient permissions')
      // Error is already shown by store's error handling
    }
  } finally {
    loadingCheckers.value = false
  }
}

// Load initial data
onMounted(async () => {
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }

  await loadCheckers(selectedClientId.value)

  // Load checker details if editing
  if (props.check?.checker_id && !selectedChecker.value?.config_fields) {
    loadingCheckers.value = true
    try {
      await checkersStore.fetchChecker(props.check.checker_id)
    } finally {
      loadingCheckers.value = false
    }
  }

  // Load pages if client is selected
  if (selectedClientId.value) {
    loadingPages.value = true
    try {
      await websitesStore.fetchWebsites(selectedClientId.value)
      // Load all pages (API doesn't accept website_id parameter, filter on client side)
      await pagesStore.fetchPages()
    } finally {
      loadingPages.value = false
    }
  }
})

async function handleSubmit() {
  await submitForm()
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.checker-info {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.hint {
  margin-top: 8px;
  font-size: 14px;
  color: #999;
  font-style: italic;
}

.hint.warning {
  color: #f59e0b;
}

.selected-pages-preview {
  margin-top: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.selected-pages-preview strong {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.pages-list {
  margin: 0;
  padding-left: 20px;
  list-style: disc;
}

.page-item {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.config-preview-section {
  margin-top: 24px;
}

.config-preview {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
}
</style>
