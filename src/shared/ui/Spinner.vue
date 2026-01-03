<template>
  <span :class="spinnerClasses" :style="spinnerStyle" aria-label="Loading">
    <span class="spinner-circle"></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const props = withDefaults(defineProps<SpinnerProps>(), {
  size: 'md',
  color: undefined,
})

const spinnerClasses = computed(() => [
  'spinner',
  `spinner--${props.size}`,
])

const spinnerStyle = computed(() => {
  if (props.color) {
    return {
      borderColor: props.color,
      borderTopColor: 'transparent',
    }
  }
  return {}
})

// Size and border width are handled via CSS classes
</script>

<style scoped>
.spinner {
  display: inline-block;
  border-style: solid;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-circle {
  display: block;
  width: 100%;
  height: 100%;
}

/* Sizes */
.spinner--sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.spinner--md {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

.spinner--lg {
  width: 32px;
  height: 32px;
  border-width: 4px;
}

/* Default colors */
.spinner--sm,
.spinner--md,
.spinner--lg {
  border-color: #e0e0e0;
  border-top-color: #007bff;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

