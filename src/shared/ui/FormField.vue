<template>
  <div :class="wrapperClasses">
    <label v-if="label" :for="fieldId" class="form-field-label">
      {{ label }}
      <span v-if="required" class="form-field-required">*</span>
    </label>
    <div class="form-field-content">
      <slot :id="fieldId" :error="error" :touched="touched" />
    </div>
    <div v-if="error || hint" class="form-field-message">
      <span v-if="error" class="form-field-error">{{ error }}</span>
      <span v-else-if="hint" class="form-field-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface FormFieldProps {
  label?: string
  error?: string | null
  hint?: string
  required?: boolean
  id?: string
  touched?: boolean
}

const props = withDefaults(defineProps<FormFieldProps>(), {
  label: undefined,
  error: undefined,
  hint: undefined,
  required: false,
  id: undefined,
  touched: false,
})

const fieldId = computed(() => props.id || `field-${Math.random().toString(36).substr(2, 9)}`)

const wrapperClasses = computed(() => [
  'form-field',
  {
    'form-field--error': !!props.error,
    'form-field--required': props.required,
  },
])
</script>

<style scoped>
.form-field {
  width: 100%;
  margin-bottom: 20px;
}

.form-field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-field-required {
  color: #dc3545;
  margin-left: 2px;
}

.form-field-content {
  width: 100%;
}

.form-field-message {
  margin-top: 6px;
  font-size: 14px;
  min-height: 20px;
}

.form-field-error {
  color: #dc3545;
}

.form-field-hint {
  color: #666;
}

.form-field--error .form-field-label {
  color: #dc3545;
}
</style>

