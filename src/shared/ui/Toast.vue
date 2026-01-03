<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" :class="containerClasses">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="getToastClasses(toast)"
        @click="handleToastClick(toast)"
      >
        <div class="toast-content">
          <span v-if="showIcon" class="toast-icon">
            <slot :name="`icon-${toast.type}`">
              <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M16.667 5L7.5 14.167 3.333 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 6.667V10M10 13.333H10.008M18.333 10C18.333 14.602 14.602 18.333 10 18.333C5.398 18.333 1.667 14.602 1.667 10C1.667 5.398 5.398 1.667 10 1.667C14.602 1.667 18.333 5.398 18.333 10Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 1.667C5.398 1.667 1.667 5.398 1.667 10C1.667 14.602 5.398 18.333 10 18.333C14.602 18.333 18.333 14.602 18.333 10C18.333 5.398 14.602 1.667 10 1.667ZM10.833 14.167H9.167V12.5H10.833V14.167ZM10.833 10.833H9.167V5.833H10.833V10.833Z"
                  fill="currentColor"
                />
              </svg>
            </slot>
          </span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button
          v-if="closable"
          type="button"
          class="toast-close"
          @click.stop="handleClose(toast)"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4L12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Toast } from '@/stores/core/ui'

export interface ToastContainerProps {
  toasts: Toast[]
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  showIcon?: boolean
  closable?: boolean
}

const props = withDefaults(defineProps<ToastContainerProps>(), {
  position: 'top-right',
  showIcon: true,
  closable: true,
})

const emit = defineEmits<{
  close: [id: string]
  click: [toast: Toast]
}>()

const containerClasses = computed(() => [
  'toast-container',
  `toast-container--${props.position}`,
])

function getToastClasses(toast: Toast) {
  return ['toast', `toast--${toast.type}`]
}

function handleClose(toast: Toast) {
  emit('close', toast.id)
}

function handleToastClick(toast: Toast) {
  emit('click', toast)
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  padding: 20px;
}

.toast-container--top-left {
  top: 0;
  left: 0;
  align-items: flex-start;
}

.toast-container--top-right {
  top: 0;
  right: 0;
  align-items: flex-end;
}

.toast-container--top-center {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.toast-container--bottom-left {
  bottom: 0;
  left: 0;
  align-items: flex-start;
}

.toast-container--bottom-right {
  bottom: 0;
  right: 0;
  align-items: flex-end;
}

.toast-container--bottom-center {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.toast-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toast--success .toast-icon {
  color: #28a745;
}

.toast--error .toast-icon {
  color: #dc3545;
}

.toast--warning .toast-icon {
  color: #ffc107;
}

.toast--info .toast-icon {
  color: #17a2b8;
}

.toast-message {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  flex: 1;
}

.toast--success {
  border-left: 4px solid #28a745;
}

.toast--error {
  border-left: 4px solid #dc3545;
}

.toast--warning {
  border-left: 4px solid #ffc107;
}

.toast--info {
  border-left: 4px solid #17a2b8;
}

.toast-close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background-color: #f5f5f5;
  color: #333;
}

/* Transitions */
.toast-enter-active {
  transition: all 0.3s ease;
}

.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-container--top-left .toast-enter-from,
.toast-container--bottom-left .toast-enter-from {
  transform: translateX(-100%);
}

.toast-container--top-center .toast-enter-from,
.toast-container--bottom-center .toast-enter-from {
  transform: translateY(-100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-container--top-left .toast-leave-to,
.toast-container--bottom-left .toast-leave-to {
  transform: translateX(-100%);
}

.toast-container--top-center .toast-leave-to,
.toast-container--bottom-center .toast-leave-to {
  transform: translateY(-100%);
}
</style>

