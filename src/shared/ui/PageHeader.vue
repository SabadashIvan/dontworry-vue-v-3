<template>
  <div :class="headerClasses">
    <div class="page-header-content">
      <div class="page-header-title-section">
        <h1 v-if="title" class="page-header-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
        <slot name="title" />
      </div>
      <div v-if="slots.actions || actions" class="page-header-actions">
        <slot name="actions" :actions="actions">
          <template v-if="actions">
            <Button
              v-for="action in actions"
              :key="action.key"
              :variant="action.variant || 'primary'"
              :size="action.size || 'md'"
              :loading="action.loading"
              :disabled="action.disabled"
              @click="handleAction(action)"
            >
              <template v-if="action.icon" #icon>
                <component :is="action.icon" />
              </template>
              {{ action.label }}
            </Button>
          </template>
        </slot>
      </div>
    </div>
    <div v-if="slots.breadcrumbs || breadcrumbs" class="page-header-breadcrumbs">
      <slot name="breadcrumbs" :breadcrumbs="breadcrumbs">
        <nav v-if="breadcrumbs" class="breadcrumbs">
          <router-link
            v-for="(crumb, index) in breadcrumbs"
            :key="index"
            :to="crumb.to"
            class="breadcrumb-item"
            :class="{ 'breadcrumb-item--active': index === breadcrumbs.length - 1 }"
          >
            {{ crumb.label }}
          </router-link>
        </nav>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import Button from './Button.vue'

const slots = useSlots()

export interface PageHeaderAction {
  key: string
  label: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: any
  onClick?: () => void
}

export interface Breadcrumb {
  label: string
  to: string
}

export interface PageHeaderProps {
  title?: string
  subtitle?: string
  actions?: PageHeaderAction[]
  breadcrumbs?: Breadcrumb[]
}

const props = defineProps<PageHeaderProps>()

const emit = defineEmits<{
  action: [action: PageHeaderAction]
}>()

const headerClasses = computed(() => [
  'page-header',
  {
    'page-header--with-breadcrumbs': props.breadcrumbs || !!slots.breadcrumbs,
  },
])

function handleAction(action: PageHeaderAction) {
  if (action.onClick) {
    action.onClick()
  }
  emit('action', action)
}
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.page-header-title-section {
  flex: 1;
}

.page-header-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.page-header-subtitle {
  margin: 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.page-header-breadcrumbs {
  margin-top: 8px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.breadcrumb-item {
  color: #666;
  text-decoration: none;
  transition: color 0.2s ease;
  position: relative;
  padding-right: 16px;
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  position: absolute;
  right: 4px;
  color: #999;
}

.breadcrumb-item:hover {
  color: #007bff;
}

.breadcrumb-item--active {
  color: #333;
  font-weight: 500;
  cursor: default;
}

.breadcrumb-item--active:hover {
  color: #333;
}
</style>

