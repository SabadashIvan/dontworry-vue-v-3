import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Allow access from all configured domains
    // In local dev: dontworry.cloud, app.dontworry.cloud, tenant1.dontworry.cloud, etc.
    host: true, // Listen on all network interfaces
    port: 5173,
    strictPort: false, // Allow port fallback if 5173 is busy
    // Enable CORS for local development with subdomains
    cors: true,
    // Allow all subdomains of dontworry.cloud for local development
    allowedHosts: [
      'dontworry.cloud',
      'app.dontworry.cloud',
      'tenant1.dontworry.cloud',
      'tenant2.dontworry.cloud',
      'tenant3.dontworry.cloud',
      'tenant4.dontworry.cloud',
      'tenant5.dontworry.cloud',
      // Allow all subdomains with wildcard pattern
      '.dontworry.cloud',
    ],
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
