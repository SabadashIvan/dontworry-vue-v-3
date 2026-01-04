<template>
  <div v-if="configFields && Object.keys(configFields).length > 0" class="check-config-form">
    <h3 class="config-title">Configuration</h3>
    <FormField
      v-for="(field, key) in configFields"
      :key="key"
      :label="field.label"
      :error="configErrors[key] || undefined"
      :hint="getFieldHint(field)"
      :required="isFieldRequired(field)"
    >
      <!-- Integer field -->
      <Input
        v-if="field.type === 'integer'"
        :id="`config-${key}`"
        :model-value="String(configValues[key] ?? field.default ?? '')"
        type="number"
        :min="field.min"
        :max="field.max"
        :error="configErrors[key] || undefined"
        :placeholder="field.min !== undefined && field.max !== undefined ? `Between ${field.min} and ${field.max}` : 'Enter number'"
        @update:model-value="handleIntegerChange(key, $event, field)"
        @blur="validateField(key, field)"
      />

      <!-- Boolean field -->
      <Checkbox
        v-else-if="field.type === 'boolean'"
        :id="`config-${key}`"
        :model-value="Boolean(configValues[key] ?? field.default ?? false)"
        :label="field.label"
        @update:model-value="configValues[key] = $event"
      />

      <!-- Select field -->
      <Select
        v-else-if="field.type === 'select' && field.options"
        :id="`config-${key}`"
        :model-value="configValues[key] ?? field.default"
        :options="field.options"
        :error="configErrors[key] || undefined"
        placeholder="Select option"
        @update:model-value="configValues[key] = $event"
      />

      <!-- String field (default) -->
      <Input
        v-else
        :id="`config-${key}`"
        :model-value="String(configValues[key] ?? field.default ?? '')"
        :error="configErrors[key] || undefined"
        :placeholder="getPlaceholder(field)"
        @update:model-value="configValues[key] = $event"
        @blur="validateField(key, field)"
      />
    </FormField>
  </div>
  <div v-else class="no-config">
    <p>No configuration fields available for this checker.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Input from '@/shared/ui/Input.vue'
import Checkbox from '@/shared/ui/Checkbox.vue'
import Select from '@/shared/ui/Select.vue'
import FormField from '@/shared/ui/FormField.vue'
import { min, max, pattern } from '@/shared/utils/validators'
import type { ConfigField } from '@/features/monitoring/types'

export interface CheckConfigFormProps {
  configFields?: Record<string, ConfigField>
  initialConfig?: Record<string, unknown>
}

const props = withDefaults(defineProps<CheckConfigFormProps>(), {
  configFields: undefined,
  initialConfig: undefined,
})

const emit = defineEmits<{
  'update:config': [config: Record<string, unknown>]
}>()

// Local state for config values
const configValues = ref<Record<string, unknown>>({})

// Initialize config values from initialConfig or defaults
watch(
  () => [props.configFields, props.initialConfig],
  () => {
    if (!props.configFields) {
      configValues.value = {}
      return
    }

    const newValues: Record<string, unknown> = {}
    for (const key in props.configFields) {
      const field = props.configFields[key]
      newValues[key] =
        props.initialConfig?.[key] ?? field.default ?? getDefaultValue(field.type)
    }
    configValues.value = newValues
    emit('update:config', { ...newValues })
  },
  { immediate: true, deep: true }
)

// Watch configValues and emit updates
watch(
  configValues,
  (newValues) => {
    emit('update:config', { ...newValues })
  },
  { deep: true }
)

const configErrors = ref<Record<string, string | null>>({})

function isFieldRequired(field: ConfigField): boolean {
  // Consider a field required if it has no default value and is not boolean
  return field.default === undefined && field.type !== 'boolean'
}

function handleIntegerChange(key: string, value: string, field: ConfigField) {
  const numValue = value === '' ? undefined : parseInt(value, 10)
  if (isNaN(numValue as number)) {
    configValues.value[key] = field.default ?? 0
  } else {
    configValues.value[key] = numValue
  }
  validateField(key, field)
}

function validateField(key: string, field: ConfigField) {
  const value = configValues.value[key]
  const validators: Array<(val: unknown) => string | true> = []

  // Add min/max validators for integer fields
  if (field.type === 'integer') {
    if (field.min !== undefined) {
      validators.push(min(field.min, `${field.label} must be at least ${field.min}`))
    }
    if (field.max !== undefined) {
      validators.push(max(field.max, `${field.label} must be at most ${field.max}`))
    }
  }

  // Validate cron expression if present
  if (field.cron && typeof value === 'string' && value.trim() !== '') {
    const cronPattern = /^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
    if (!cronPattern.test(value)) {
      configErrors.value[key] = 'Invalid cron expression format'
      return
    }
  }

  // Run validators
  for (const validator of validators) {
    const result = validator(value)
    if (result !== true) {
      configErrors.value[key] = result
      return
    }
  }

  // Clear error if validation passes
  configErrors.value[key] = null
}

function getPlaceholder(field: ConfigField): string {
  if (field.cron) {
    return 'e.g., 0 */6 * * * (every 6 hours)'
  }
  return 'Enter value'
}

function getDefaultValue(type: string): unknown {
  switch (type) {
    case 'integer':
      return 0
    case 'boolean':
      return false
    case 'select':
      return undefined
    case 'string':
    default:
      return ''
  }
}

function getFieldHint(field: ConfigField): string | undefined {
  const hints: string[] = []
  if (field.cron) {
    hints.push(`Schedule: ${field.cron}`)
    hints.push('Format: minute hour day month weekday (e.g., 0 */6 * * * for every 6 hours)')
  }
  if (field.timeout) {
    hints.push(`Timeout: ${field.timeout}s`)
  }
  if (field.verify_ssl !== undefined) {
    hints.push(`Verify SSL: ${field.verify_ssl ? 'Yes' : 'No'}`)
  }
  if (field.min !== undefined && field.max !== undefined) {
    hints.push(`Range: ${field.min} - ${field.max}`)
  } else if (field.min !== undefined) {
    hints.push(`Minimum: ${field.min}`)
  } else if (field.max !== undefined) {
    hints.push(`Maximum: ${field.max}`)
  }
  return hints.length > 0 ? hints.join(' | ') : undefined
}
</script>

<style scoped>
.check-config-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.no-config {
  padding: 20px;
  text-align: center;
  color: #666;
  font-style: italic;
}
</style>

