<template>
  <div :class="wrapperClasses">
    <label v-if="label" :for="selectId" class="select-label">
      {{ label }}
      <span v-if="required" class="select-required">*</span>
    </label>
    <div class="select-wrapper">
      <select
        :id="selectId"
        :class="selectClasses"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :multiple="multiple"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <option v-if="placeholder && !multiple" value="" disabled>
          {{ placeholder }}
        </option>
        <template v-for="(option, index) in options" :key="getOptionKey(option, index)">
          <optgroup v-if="isOptionGroup(option)" :label="option.label">
            <option
              v-for="opt in option.options"
              :key="getOptionValue(opt)"
              :value="getOptionValue(opt)"
              :disabled="isOptionDisabled(opt)"
            >
              {{ getOptionLabel(opt) }}
            </option>
          </optgroup>
          <option
            v-else
            :value="getOptionValue(option)"
            :disabled="isOptionDisabled(option)"
          >
            {{ getOptionLabel(option) }}
          </option>
        </template>
      </select>
      <span v-if="!multiple" class="select-arrow">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </div>
    <div v-if="error || hint" class="select-message">
      <span v-if="error" class="select-error">{{ error }}</span>
      <span v-else-if="hint" class="select-hint">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

type SelectOptionType = SelectOption | SelectOptionGroup

export interface SelectProps {
  modelValue: string | number | (string | number)[]
  options: SelectOptionType[]
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  multiple?: boolean
  id?: string
}

const props = withDefaults(defineProps<SelectProps>(), {
  label: undefined,
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  disabled: false,
  required: false,
  multiple: false,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | (string | number)[]]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const selectId = computed(() => props.id || `select-${Math.random().toString(36).substr(2, 9)}`)
const isFocused = ref(false)

const wrapperClasses = computed(() => [
  'select',
  {
    'select--error': !!props.error,
    'select--disabled': props.disabled,
    'select--focused': isFocused.value,
    'select--multiple': props.multiple,
  },
])

const selectClasses = computed(() => [
  'select-field',
  {
    'select-field--multiple': props.multiple,
  },
])

function isOptionGroup(option: SelectOptionType): option is SelectOptionGroup {
  return 'options' in option && Array.isArray(option.options)
}

function getOptionKey(option: SelectOptionType, index: number): string {
  if (isOptionGroup(option)) {
    return `group-${index}-${option.label}`
  }
  return String(getOptionValue(option))
}

function getOptionValue(option: SelectOption): string | number {
  return option.value
}

function getOptionLabel(option: SelectOption): string {
  return option.label
}

function isOptionDisabled(option: SelectOption): boolean {
  return option.disabled ?? false
}

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  if (props.multiple) {
    const selectedValues = Array.from(target.selectedOptions).map(option => option.value)
    emit('update:modelValue', selectedValues)
  } else {
    const value = target.value
    // Try to convert to number if the option value is a number
    const numValue = Number(value)
    emit('update:modelValue', isNaN(numValue) ? value : numValue)
  }
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
.select {
  width: 100%;
  margin-bottom: 16px;
}

.select-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.select-required {
  color: #dc3545;
  margin-left: 2px;
}

.select-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.select-field {
  width: 100%;
  padding: 10px 36px 10px 12px;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  appearance: none;
  background-image: none;
}

.select-field--multiple {
  padding: 8px 12px;
  min-height: 100px;
}

.select-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.select-field:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #666;
  display: flex;
  align-items: center;
}

.select--multiple .select-arrow {
  display: none;
}

.select--error .select-field {
  border-color: #dc3545;
}

.select--error .select-field:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
}

.select-message {
  margin-top: 6px;
  font-size: 14px;
}

.select-error {
  color: #dc3545;
}

.select-hint {
  color: #666;
}
</style>

