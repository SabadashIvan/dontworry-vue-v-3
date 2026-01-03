<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: 'primary',
  size: 'md',
})

const badgeClasses = computed(() => [
  'badge',
  `badge--${props.variant}`,
  `badge--${props.size}`,
])
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 12px;
  white-space: nowrap;
}

/* Variants */
.badge--primary {
  background-color: #007bff;
  color: white;
}

.badge--secondary {
  background-color: #6c757d;
  color: white;
}

.badge--success {
  background-color: #28a745;
  color: white;
}

.badge--danger {
  background-color: #dc3545;
  color: white;
}

.badge--warning {
  background-color: #ffc107;
  color: #333;
}

.badge--info {
  background-color: #17a2b8;
  color: white;
}

/* Sizes */
.badge--sm {
  padding: 2px 8px;
  font-size: 12px;
  line-height: 1.4;
}

.badge--md {
  padding: 4px 10px;
  font-size: 14px;
  line-height: 1.5;
}

.badge--lg {
  padding: 6px 12px;
  font-size: 16px;
  line-height: 1.6;
}
</style>

