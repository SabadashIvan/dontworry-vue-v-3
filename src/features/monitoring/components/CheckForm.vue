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
        :disabled="loadingCheckers"
        @update:model-value="handleCheckerChange"
        @blur="fields.checker_id.touched.value = true"
      />
      <p v-if="selectedChecker" class="checker-info">
        Service: {{ selectedChecker.service }} | Active: {{ selectedChecker.is_active ? 'Yes' : 'No' }}
      </p>
    </FormField>

    <FormField
      v-if="selectedChecker && selectedChecker.config_fields"
      label="Pages"
      :error="errors.page_ids"
      hint="Select pages to monitor (optional)"
    >
      <Select
        v-if="fields.page_ids"
        id="page_ids"
        :model-value="(fields.page_ids.value.value as number[]) || []"
        :options="pageOptions"
        placeholder="Select pages (optional)"
        :error="errors.page_ids || undefined"
        :disabled="!selectedClientId || loadingPages"
        multiple
        @update:model-value="fields.page_ids.value.value = ($event as number[]) || []"
      />
      <p v-if="!selectedClientId" class="hint">Please select a project first to load pages</p>
    </FormField>

    <!-- Dynamic config form -->
    <CheckConfigForm
      v-if="selectedChecker && selectedChecker.config_fields"
      :config-fields="selectedChecker.config_fields"
      :initial-config="checkConfig"
      @update:config="handleConfigUpdate"
    />

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

export interface CheckFormProps {
  check?: Check | null
  isEdit?: boolean
}

const props = withDefaults(defineProps<CheckFormProps>(), {
  check: null,
  isEdit: false,
})

const emit = defineEmits<{
  submit: [data: CheckCreateDTO | CheckUpdateDTO]
  cancel: []
}>()

const clientsStore = useClientsStore()
const checkersStore = useCheckersStore()
const pagesStore = usePagesStore()
const websitesStore = useWebsitesStore()

const selectedClientId = ref<number | undefined>(props.check?.client_id)
const selectedCheckerId = ref<number | undefined>(props.check?.checker_id)
const checkConfig = ref<Record<string, unknown>>(props.check?.config || {})
const loadingCheckers = ref(false)
const loadingPages = ref(false)

// Initialize form
const { fields, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'client_id',
      initialValue: props.check?.client_id || undefined,
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

// Page options (filtered by selected client)
const pageOptions = computed<SelectOption[]>(() => {
  if (!selectedClientId.value) return []

  // Get all websites for this client
  const clientWebsites = Object.values(websitesStore.byId).filter(
    (website) => website.client_id === selectedClientId.value
  )

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

// Watch for client changes
watch(
  () => fields.client_id?.value.value,
  async (newClientId) => {
    const clientId = typeof newClientId === 'number' ? newClientId : undefined
    selectedClientId.value = clientId
    if (clientId) {
      loadingPages.value = true
      try {
        // Load websites for this client
        await websitesStore.fetchWebsites(clientId)
        const clientWebsites = Object.values(websitesStore.byId).filter(
          (website) => website.client_id === clientId
        )
        // Load pages for each website
        for (const website of clientWebsites) {
          await pagesStore.fetchPages(website.id)
        }
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

// Load initial data
onMounted(async () => {
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }

  if (checkersStore.checkers.length === 0) {
    loadingCheckers.value = true
    try {
      await checkersStore.fetchCheckers()
    } finally {
      loadingCheckers.value = false
    }
  }

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
      const clientWebsites = Object.values(websitesStore.byId).filter(
        (website) => website.client_id === selectedClientId.value
      )
      for (const website of clientWebsites) {
        await pagesStore.fetchPages(website.id)
      }
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
</style>

