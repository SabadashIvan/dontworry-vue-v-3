<template>
  <form @submit.prevent="handleSubmit">
    <FormField label="Title" :error="errors.title" required>
      <Input
        id="title"
        v-model="titleInput"
        placeholder="Enter workspace title"
        :error="errors.title || undefined"
        @blur="handleTitleBlur"
      />
    </FormField>

    <FormField label="Domain" :error="errors.domain" required hint="Subdomain for your workspace (e.g. myworkspace)">
      <Input
        id="domain"
        v-model="domainInput"
        placeholder="myworkspace"
        :error="errors.domain || undefined"
        @blur="handleDomainBlur"
      />
      <p v-if="domainInput" class="domain-hint">
        Your workspace will be available at: <strong>{{ domainPreview }}</strong>
      </p>
    </FormField>

    <FormField label="Timezone" :error="errors.timezone" hint="Optional timezone for your workspace">
      <Select
        id="timezone"
        v-model="timezoneInput"
        :options="timezoneOptions"
        placeholder="Select timezone (optional)"
        :error="errors.timezone || undefined"
      />
    </FormField>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Workspace
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useForm } from '@/shared/composables/useForm'
import type { UseFieldReturn } from '@/shared/composables/useField'
import { required, minLength, maxLength, pattern } from '@/shared/utils/validators'
import { compose } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import Select from '@/shared/ui/Select.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import type { Tenant } from '@/core/api/types'
import type { TenantCreateDTO, TenantUpdateDTO } from '@/stores/core/tenants'
import type { SelectOption } from '@/shared/ui/Select.vue'

export interface TenantFormProps {
  tenant?: Tenant | null
  isEdit?: boolean
}

const props = withDefaults(defineProps<TenantFormProps>(), {
  tenant: null,
  isEdit: false,
})

const emit = defineEmits<{
  submit: [data: TenantCreateDTO | TenantUpdateDTO]
  cancel: []
}>()

// Domain validation pattern (only lowercase letters, numbers, and hyphens)
const domainPattern = /^[a-z0-9-]+$/

// Get base domain for preview
const baseDomain = computed(() => {
  const hostname = window.location.hostname
  const parts = hostname.split('.')
  if (parts.length === 1) {
    return parts[0] || 'localhost'
  }
  return parts.slice(1).join('.') || 'localhost'
})

const domainPreview = computed(() => {
  if (!domainInput.value) return ''
  const domainStr = String(domainInput.value).toLowerCase()
  const scheme = window.location.protocol.replace(':', '')
  const port = window.location.port ? `:${window.location.port}` : ''
  return `${scheme}://${domainStr}.${baseDomain.value}${port}`
})

// Popular timezones list
const timezoneOptions = computed<SelectOption[]>(() => {
  return [
    { label: 'UTC', value: 'UTC' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Chicago (CST)', value: 'America/Chicago' },
    { label: 'America/Denver (MST)', value: 'America/Denver' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
    { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
    { label: 'Europe/Berlin (CET)', value: 'Europe/Berlin' },
    { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
    { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
    { label: 'Australia/Sydney (AEDT)', value: 'Australia/Sydney' },
  ]
})

// Local input values for reactive binding
const titleInput = ref<string>(props.tenant?.title || '')
const domainInput = ref<string>(props.tenant?.domain || '')
const timezoneInput = ref<string | number>(props.tenant?.timezone || '')

// Initialize form
const { fields, errors, isSubmitting, isValid, values, submit: submitForm } = useForm({
  fields: [
    {
      name: 'title',
      initialValue: props.tenant?.title || '',
      validators: [compose(required('Title is required'), minLength(3), maxLength(255))],
      validateOnBlur: true,
    },
    {
      name: 'domain',
      initialValue: props.tenant?.domain || '',
      validators: [
        compose(
          required('Domain is required'),
          minLength(2, 'Domain must be at least 2 characters'),
          maxLength(63, 'Domain must be at most 63 characters'),
          pattern(domainPattern, 'Domain can only contain lowercase letters, numbers, and hyphens')
        ),
      ],
      validateOnBlur: true,
    },
    {
      name: 'timezone',
      initialValue: props.tenant?.timezone || undefined,
    },
  ],
  onSubmit: async (formValues) => {
    const formData: TenantCreateDTO | TenantUpdateDTO = {
      title: formValues.title as string,
      domain: formValues.domain as string,
      timezone: (formValues.timezone as string) || undefined,
    }

    emit('submit', formData)
  },
})

// Sync local inputs with form fields on change
// Use nextTick to ensure fields are fully initialized before setting values
nextTick(() => {
  if (fields.title?.value) {
    fields.title.value.value = titleInput.value
  }
  if (fields.domain?.value) {
    fields.domain.value.value = domainInput.value
  }
  if (fields.timezone?.value) {
    fields.timezone.value.value = timezoneInput.value || undefined
  }
})

watch(
  titleInput,
  (newValue) => {
    if (fields.title?.value) {
      fields.title.value.value = newValue
    }
  }
)

watch(
  domainInput,
  (newValue) => {
    if (fields.domain?.value) {
      fields.domain.value.value = newValue
    }
  }
)

watch(
  timezoneInput,
  (newValue) => {
    if (fields.timezone?.value) {
      fields.timezone.value.value = newValue || undefined
    }
  }
)

function handleTitleBlur() {
  if (fields.title) {
    fields.title.value.value = titleInput.value
    fields.title.handleBlur()
  }
}

function handleDomainBlur() {
  if (fields.domain) {
    // Clean and normalize domain value on blur
    const cleaned = domainInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    domainInput.value = cleaned
    fields.domain.value.value = cleaned
    fields.domain.handleBlur()
  }
}

// Wrapper for submit to ensure values are synced
async function handleSubmit() {
  console.log('🔵 handleSubmit called')
  console.log('📝 Local inputs:', {
    title: titleInput.value,
    domain: domainInput.value,
    timezone: timezoneInput.value,
  })
  console.log('📋 Form fields before sync:', {
    title: fields.title?.value.value,
    domain: fields.domain?.value.value,
    timezone: fields.timezone?.value.value,
  })
  console.log('🔍 Fields structure:', {
    titleExists: !!fields.title,
    titleValueExists: !!fields.title?.value,
    titleValueValue: fields.title?.value?.value,
    titleFieldType: typeof fields.title,
    titleFieldKeys: fields.title ? Object.keys(fields.title) : [],
    titleFieldValue: fields.title,
    domainExists: !!fields.domain,
    domainValueExists: !!fields.domain?.value,
    domainValueValue: fields.domain?.value?.value,
  })
  console.log('✅ isValid before sync:', isValid.value)
  console.log('❌ errors before sync:', errors.value)

  // Sync all local inputs to form fields before submission
  console.log('🔄 Syncing values...')

  // Helper function to safely set field value
  const setFieldValue = (field: UseFieldReturn | undefined, value: unknown, fieldName: string): boolean => {
    if (!field) {
      console.warn(`⚠️ Field "${fieldName}" does not exist`)
      return false
    }
    if (!field.value) {
      console.warn(`⚠️ Field "${fieldName}" has no value ref`)
      return false
    }
    if (typeof field.value !== 'object' || !('value' in field.value)) {
      console.warn(`⚠️ Field "${fieldName}" value is not a ref:`, field.value)
      return false
    }
    try {
      field.value.value = value
      return true
    } catch (error) {
      console.error(`❌ Error setting field "${fieldName}":`, error)
      return false
    }
  }

  // Sync title
  if (setFieldValue(fields.title, titleInput.value, 'title') && fields.title) {
    console.log('✅ Title set to:', fields.title.value.value)
    if (fields.title.touched) {
      fields.title.touched.value = true
    }
  }

  // Sync domain (with cleaning)
  const cleaned = domainInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
  domainInput.value = cleaned
  if (setFieldValue(fields.domain, cleaned, 'domain') && fields.domain) {
    console.log('✅ Domain set to:', fields.domain.value.value)
    if (fields.domain.touched) {
      fields.domain.touched.value = true
    }
  }

  // Sync timezone
  if (setFieldValue(fields.timezone, timezoneInput.value || undefined, 'timezone') && fields.timezone) {
    console.log('✅ Timezone set to:', fields.timezone.value.value)
  }

  console.log('📋 Form fields after sync:', {
    title: fields.title?.value.value,
    domain: fields.domain?.value.value,
    timezone: fields.timezone?.value.value,
  })

  // Validate all fields before submission
  console.log('🔍 Validating fields...')
  if (fields.title) {
    const titleValid = fields.title.validate()
    console.log('📝 Title validation:', titleValid, 'error:', fields.title.error.value)
  }
  if (fields.domain) {
    const domainValid = fields.domain.validate()
    console.log('🌐 Domain validation:', domainValid, 'error:', fields.domain.error.value)
  }

  console.log('✅ isValid after validation:', isValid.value)
  console.log('❌ errors after validation:', errors.value)

  // Now submit the form
  // Wait for Vue to update reactivity
  await nextTick()

  console.log('📋 Form fields after nextTick:', {
    title: fields.title?.value.value,
    domain: fields.domain?.value.value,
    timezone: fields.timezone?.value.value,
  })
  console.log('📊 Form values:', values.value)

  console.log('🚀 Calling submitForm...')
  try {
    await submitForm()
    console.log('✅ submitForm completed successfully')
  } catch (error) {
    console.error('❌ submitForm error:', error)
    throw error
  }
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.domain-hint {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.domain-hint strong {
  color: #007bff;
  font-weight: 600;
}
</style>

