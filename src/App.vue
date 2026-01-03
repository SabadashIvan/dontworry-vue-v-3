<template>
  <router-view />
  <Toast :toasts="toasts" @close="handleToastClose" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/core/ui'
import Toast from '@/shared/ui/Toast.vue'

const uiStore = useUiStore()

const toasts = computed(() => uiStore.toasts)

function handleToastClose(id: string) {
  uiStore.removeToast(id)
}
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
}
</style>
