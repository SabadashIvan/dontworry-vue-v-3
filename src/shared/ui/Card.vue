<template>
  <div :class="cardClasses">
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title" class="card-title">{{ title }}</h3>
      </slot>
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface CardProps {
  title?: string
  variant?: 'default' | 'bordered' | 'shadow'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<CardProps>(), {
  title: undefined,
  variant: 'default',
  padding: 'md',
})

const cardClasses = computed(() => [
  'card',
  `card--${props.variant}`,
  `card--padding-${props.padding}`,
])
</script>

<style scoped>
.card {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card--default {
  background-color: #fff;
}

.card--bordered {
  border: 1px solid #e0e0e0;
}

.card--shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card--padding-none .card-body {
  padding: 0;
}

.card--padding-sm .card-body {
  padding: 12px;
}

.card--padding-md .card-body {
  padding: 20px;
}

.card--padding-lg .card-body {
  padding: 32px;
}

.card-header {
  padding: 20px 20px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 0;
}

.card--padding-none .card-header {
  padding: 20px 20px 0;
}

.card--padding-sm .card-header {
  padding: 12px 12px 0;
}

.card--padding-lg .card-header {
  padding: 32px 32px 0;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.card-body {
  flex: 1;
}

.card-footer {
  padding: 0 20px 20px;
  border-top: 1px solid #e0e0e0;
  margin-top: 0;
}

.card--padding-none .card-footer {
  padding: 0 20px 20px;
}

.card--padding-sm .card-footer {
  padding: 0 12px 12px;
}

.card--padding-lg .card-footer {
  padding: 0 32px 32px;
}
</style>

