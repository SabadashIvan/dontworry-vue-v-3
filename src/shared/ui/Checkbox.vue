<template>
  <label :class="labelClasses">
    <input
      :id="checkboxId"
      type="checkbox"
      :class="checkboxClasses"
      :checked="modelValue"
      :disabled="disabled"
      :required="required"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <span v-if="label || $slots.default" class="checkbox-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface CheckboxProps {
  modelValue: boolean
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<CheckboxProps>(), {
  label: undefined,
  error: undefined,
  disabled: false,
  required: false,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const checkboxId = computed(() => props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`)
const isFocused = ref(false)

const labelClasses = computed(() => [
  'checkbox',
  {
    'checkbox--error': !!props.error,
    'checkbox--disabled': props.disabled,
    'checkbox--focused': isFocused.value,
  },
])

const checkboxClasses = computed(() => ['checkbox-input'])

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
}
</script>

<style scoped>
.checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  accent-color: #007bff;
  flex-shrink: 0;
  margin-top: 2px;
}

.checkbox--disabled .checkbox-input {
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  flex: 1;
}

.checkbox--focused .checkbox-input {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.checkbox--error .checkbox-input {
  accent-color: #dc3545;
}
</style>

