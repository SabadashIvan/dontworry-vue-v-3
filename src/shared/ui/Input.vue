<template>
  <div :class="wrapperClasses">
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="input-required">*</span>
    </label>
    <div class="input-wrapper">
      <span v-if="slots.prefix" class="input-prefix">
        <slot name="prefix" />
      </span>
      <component
        :is="inputComponent"
        :id="inputId"
        :class="inputClasses"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :rows="rows"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      <span v-if="slots.suffix" class="input-suffix">
        <slot name="suffix" />
      </span>
    </div>
    <div v-if="error || hint" class="input-message">
      <span v-if="error" class="input-error">{{ error }}</span>
      <span v-else-if="hint" class="input-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'

const slots = useSlots()

export interface InputProps {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  maxlength?: number
  min?: number
  max?: number
  step?: number
  rows?: number
  id?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  disabled: false,
  readonly: false,
  required: false,
  maxlength: undefined,
  min: undefined,
  max: undefined,
  step: undefined,
  rows: 4,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const inputId = computed(() => props.id || `input-${Math.random().toString(36).substr(2, 9)}`)
const isFocused = ref(false)

const inputComponent = computed(() => {
  return props.type === 'textarea' ? 'textarea' : 'input'
})

const wrapperClasses = computed(() => [
  'input',
  {
    'input--error': !!props.error,
    'input--disabled': props.disabled,
    'input--readonly': props.readonly,
    'input--focused': isFocused.value,
    'input--with-prefix': !!slots.prefix,
    'input--with-suffix': !!slots.suffix,
  },
])

const inputClasses = computed(() => [
  'input-field',
  {
    'input-field--textarea': props.type === 'textarea',
  },
])

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  const inputValue = target.value
  const value = props.type === 'number' ? Number(inputValue) : inputValue
  emit('update:modelValue', value)
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
.input {
  width: 100%;
  margin-bottom: 16px;
}

.input-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.input-required {
  color: #dc3545;
  margin-left: 2px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-family: inherit;
}

.input-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.input-field::placeholder {
  color: #999;
}

.input-field:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.input-field:read-only {
  background-color: #f9f9f9;
  cursor: default;
}

.input-field--textarea {
  resize: vertical;
  min-height: 100px;
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #666;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  white-space: nowrap;
}

.input-prefix {
  border-right: none;
  border-radius: 6px 0 0 6px;
}

.input-suffix {
  border-left: none;
  border-radius: 0 6px 6px 0;
}

.input--with-prefix .input-field {
  border-left: none;
  border-radius: 0 6px 6px 0;
}

.input--with-suffix .input-field {
  border-right: none;
  border-radius: 6px 0 0 6px;
}

.input--with-prefix.input--with-suffix .input-field {
  border-radius: 0;
}

.input--error .input-field {
  border-color: #dc3545;
}

.input--error .input-field:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.input-message {
  margin-top: 6px;
  font-size: 14px;
}

.input-error {
  color: #dc3545;
}

.input-hint {
  color: #666;
}
</style>

