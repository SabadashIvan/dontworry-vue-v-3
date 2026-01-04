<template>
  <form @submit.prevent="submitForm">
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

    <FormField label="Directory" :error="errors.directory_id" :required="!isEdit" :hint="isEdit ? 'Folder for grouping' : 'Required folder for grouping'">
      <Select
        v-if="fields.directory_id"
        id="directory_id"
        :model-value="(fields.directory_id.value.value as number | undefined) ?? (undefined as unknown as number)"
        :options="directoryOptions"
        placeholder="Select a directory"
        :error="errors.directory_id || undefined"
        :disabled="!selectedClientId"
        @update:model-value="fields.directory_id.value.value = $event"
        @blur="fields.directory_id.touched.value = true"
      />
    </FormField>

    <FormField label="Host" :error="errors.host" required hint="Domain name without protocol (e.g. example.com)">
      <Input
        v-if="fields.host"
        id="host"
        :model-value="String(fields.host.value.value || '')"
        placeholder="example.com"
        :error="errors.host || undefined"
        @update:model-value="fields.host.value.value = $event"
        @blur="fields.host.touched.value = true"
      />
    </FormField>

    <FormField label="Parse Pages" :error="errors.parse_pages" hint="Automatically discover and add pages">
      <Checkbox
        v-if="fields.parse_pages"
        :model-value="Boolean(fields.parse_pages.value.value ?? false)"
        label="Enable automatic page discovery"
        @update:model-value="fields.parse_pages.value.value = $event"
      />
      <p v-if="fields.parse_pages && fields.parse_pages.value.value" class="parse-hint">
        Pages will be parsed in the background and appear shortly after creation.
      </p>
    </FormField>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Website
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useForm } from '@/shared/composables/useForm'
import { required, pattern } from '@/shared/utils/validators'
import { compose } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import Select from '@/shared/ui/Select.vue'
import Checkbox from '@/shared/ui/Checkbox.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import type { Website, WebsiteCreateDTO, WebsiteUpdateDTO } from '@/features/workspace/types'
import type { SelectOption } from '@/shared/ui/Select.vue'

export interface WebsiteFormProps {
  website?: Website | null
  isEdit?: boolean
  initialClientId?: number
  initialDirectoryId?: number
}

const props = withDefaults(defineProps<WebsiteFormProps>(), {
  website: null,
  isEdit: false,
  initialClientId: undefined,
  initialDirectoryId: undefined,
})

const emit = defineEmits<{
  submit: [data: WebsiteCreateDTO | WebsiteUpdateDTO]
  cancel: []
}>()

const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()

const selectedClientId = ref<number | undefined>(props.website?.client_id || props.initialClientId)

// Hostname validation pattern (without protocol)
const hostnamePattern = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

// Initialize form
  const { fields, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'client_id',
      initialValue: props.website?.client_id || props.initialClientId || undefined,
      validators: [required('Project is required')],
      validateOnBlur: true,
    },
    {
      name: 'directory_id',
      initialValue: props.website?.directory_id || props.initialDirectoryId || undefined,
      validators: props.isEdit ? [] : [required('Directory is required')],
      validateOnBlur: true,
    },
    {
      name: 'host',
      initialValue: props.website?.host || '',
      validators: [
        compose(
          required('Host is required'),
          pattern(hostnamePattern, 'Please enter a valid hostname (e.g. example.com)')
        ),
      ],
      validateOnBlur: true,
    },
    {
      name: 'parse_pages',
      initialValue: false,
    },
  ],
  onSubmit: async (formValues) => {
    if (props.isEdit) {
      const formData: WebsiteUpdateDTO = {
        client_id: formValues.client_id as number,
        directory_id: (formValues.directory_id as number) ?? null,
        host: formValues.host as string,
        parse_pages: formValues.parse_pages as boolean,
      }
      emit('submit', formData)
    } else {
      const formData: WebsiteCreateDTO = {
        client_id: formValues.client_id as number,
        directory_id: formValues.directory_id as number,
        host: formValues.host as string,
        parse_pages: formValues.parse_pages as boolean,
      }
      emit('submit', formData)
    }
  },
})

// Client options
const clientOptions = computed<SelectOption[]>(() => {
  return clientsStore.clients.map((client) => ({
    label: client.title,
    value: client.id,
  }))
})

// Directory options (filtered by selected client)
const directoryOptions = computed<SelectOption[]>(() => {
  if (!selectedClientId.value) {
    return []
  }

  const directories = Object.values(directoriesStore.byId).filter(
    (dir) => dir.client_id === selectedClientId.value
  )

  return directories.map((directory) => ({
    label: directory.title,
    value: directory.id,
  }))
})

// Watch for client changes
watch(
  () => fields.client_id?.value.value,
  (newClientId) => {
    selectedClientId.value = newClientId as number | undefined
    // Reset directory when client changes
    if (props.isEdit && newClientId !== props.website?.client_id && fields.directory_id) {
      fields.directory_id.value.value = undefined
    }
  }
)

// Load directories when client is selected
watch(selectedClientId, async (clientId) => {
  if (clientId) {
    await directoriesStore.fetchDirectories(clientId)
  }
})

// Load clients and directories on mount
if (clientsStore.clients.length === 0) {
  clientsStore.fetchClients()
}

if (selectedClientId.value) {
  directoriesStore.fetchDirectories(selectedClientId.value)
}

function handleClientChange() {
  // Directory will be reset automatically by watcher
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.parse-hint {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  font-style: italic;
}
</style>

