<template>
  <button
    :class="buttonClasses"
    :disabled="disabled || loading"
    :type="type"
    @click="handleClick"
  >
    <span v-if="loading" class="button-spinner">
      <Spinner :size="spinnerSize" />
    </span>
    <span v-if="$slots.icon && !loading" class="button-icon">
      <slot name="icon" />
    </span>
    <span class="button-content">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Spinner from './Spinner.vue'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const buttonClasses = computed(() => [
  'button',
  `button--${props.variant}`,
  `button--${props.size}`,
  {
    'button--loading': props.loading,
    'button--disabled': props.disabled,
  },
])

const spinnerSize = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'sm'
    case 'lg':
      return 'md'
    default:
      return 'sm'
  }
})

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<style scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.5;
}

.button:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.button:disabled,
.button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

/* Variants */
.button--primary {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.button--primary:hover:not(:disabled) {
  background-color: #0056b3;
  border-color: #0056b3;
}

.button--secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}

.button--secondary:hover:not(:disabled) {
  background-color: #545b62;
  border-color: #545b62;
}

.button--danger {
  background-color: #dc3545;
  color: white;
  border-color: #dc3545;
}

.button--danger:hover:not(:disabled) {
  background-color: #c82333;
  border-color: #c82333;
}

.button--ghost {
  background-color: transparent;
  color: #007bff;
  border-color: #007bff;
}

.button--ghost:hover:not(:disabled) {
  background-color: rgba(0, 123, 255, 0.1);
}

/* Sizes */
.button--sm {
  padding: 6px 12px;
  font-size: 14px;
  min-height: 32px;
}

.button--md {
  padding: 8px 16px;
  font-size: 16px;
  min-height: 40px;
}

.button--lg {
  padding: 12px 24px;
  font-size: 18px;
  min-height: 48px;
}

/* Loading state */
.button--loading {
  position: relative;
}

.button-spinner {
  display: inline-flex;
  align-items: center;
}

.button-icon {
  display: inline-flex;
  align-items: center;
}

.button-content {
  display: inline-flex;
  align-items: center;
}
</style>

