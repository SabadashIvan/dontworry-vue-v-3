<template>
  <div v-if="configFields && Object.keys(configFields).length > 0" class="check-config-form">
    <h3 class="config-title">Configuration</h3>
    <FormField
      v-for="(field, key) in configFields"
      :key="key"
      :label="field.label"
      :error="configErrors[key] || undefined"
      :hint="getFieldHint(field)"
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
        placeholder="Enter number"
        @update:model-value="configValues[key] = parseInt($event) || field.default || 0"
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
        placeholder="Enter value"
        @update:model-value="configValues[key] = $event"
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

const configErrors = computed(() => {
  // Validation can be added here if needed
  return {} as Record<string, string | null>
})

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
  }
  if (field.timeout) {
    hints.push(`Timeout: ${field.timeout}s`)
  }
  if (field.verify_ssl !== undefined) {
    hints.push(`Verify SSL: ${field.verify_ssl ? 'Yes' : 'No'}`)
  }
  return hints.length > 0 ? hints.join(', ') : undefined
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

