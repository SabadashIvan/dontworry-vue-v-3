<template>
  <label :class="labelClasses">
    <input
      :id="radioId"
      type="radio"
      :name="name"
      :value="value"
      :class="radioClasses"
      :checked="isChecked"
      :disabled="disabled"
      :required="required"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    <span v-if="label || $slots.default" class="radio-label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface RadioProps {
  modelValue: string | number | boolean
  value: string | number | boolean
  name: string
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<RadioProps>(), {
  label: undefined,
  error: undefined,
  disabled: false,
  required: false,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | boolean]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const radioId = computed(() => props.id || `radio-${Math.random().toString(36).substr(2, 9)}`)
const isFocused = ref(false)

const isChecked = computed(() => {
  return props.modelValue === props.value
})

const labelClasses = computed(() => [
  'radio',
  {
    'radio--error': !!props.error,
    'radio--disabled': props.disabled,
    'radio--focused': isFocused.value,
  },
])

const radioClasses = computed(() => ['radio-input'])

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', props.value)
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
.radio {
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.radio--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.radio-input {
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  accent-color: #007bff;
  flex-shrink: 0;
  margin-top: 2px;
}

.radio--disabled .radio-input {
  cursor: not-allowed;
}

.radio-label {
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  flex: 1;
}

.radio--focused .radio-input {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.radio--error .radio-input {
  accent-color: #dc3545;
}
</style>

