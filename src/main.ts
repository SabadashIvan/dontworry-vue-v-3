import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/core/auth'

const app = createApp(App)

// Initialize Pinia
const pinia = createPinia()
app.use(pinia)

// Initialize Router
app.use(router)

// Hydrate auth store from localStorage before mounting
// This restores session if user was previously logged in
const authStore = useAuthStore()
authStore.hydrateFromStorage().finally(() => {
  // Mount app after auth hydration is complete
  app.mount('#app')
})
