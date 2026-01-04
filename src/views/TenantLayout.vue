<template>
  <div class="tenant-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 @click="goToDashboard" class="logo">DontWorry</h2>
      </div>
      <nav class="sidebar-nav">
        <ClientsSidebar />
      </nav>
      <div class="sidebar-footer">
        <button @click="handleLogout" class="logout-btn">Logout</button>
      </div>
    </aside>
    <main class="main-content">
      <header class="main-header">
        <router-link to="/settings/profile" class="profile-link">
          <div class="profile-avatar">
            <img v-if="userAvatar" :src="userAvatar" :alt="userName" />
            <div v-else class="avatar-placeholder">
              {{ userInitials }}
            </div>
          </div>
        </router-link>
      </header>
      <div class="main-content-wrapper">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/core/auth'
import { tenantApi } from '@/core/api/tenant'
import { extractData } from '@/core/api/client'
import ClientsSidebar from '@/features/workspace/components/ClientsSidebar.vue'
import type { ApiResponse, TenantUser } from '@/core/api/types'

const router = useRouter()
const authStore = useAuthStore()

const userAvatar = ref<string | undefined>(undefined)

const userName = computed(() => authStore.centralUser?.name || '')
const userInitials = computed(() => {
  const name = userName.value
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    const first = parts[0]?.[0] || ''
    const second = parts[1]?.[0] || ''
    return (first + second).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

onMounted(async () => {
  await loadUserAvatar()
})

async function loadUserAvatar() {
  try {
    const response = await tenantApi.get<ApiResponse<{ user: TenantUser }>>('/users/me')
    const data = extractData(response)

    // Extract avatar URL from the response structure
    if (data.user.avatar) {
      if (typeof data.user.avatar === 'string') {
        userAvatar.value = data.user.avatar
      } else if (data.user.avatar.avatar?.url) {
        userAvatar.value = data.user.avatar.avatar.url || undefined
      } else if (data.user.avatar.thumb?.url) {
        userAvatar.value = data.user.avatar.thumb.url || undefined
      }
    } else {
      userAvatar.value = undefined
    }
  } catch (err) {
    // Silently fail - will show initials instead
    console.error('Failed to load user avatar:', err)
  }
}

function goToDashboard() {
  router.push('/dashboard')
}

async function handleLogout() {
  await authStore.logout()
}
</script>

<style scoped>
.tenant-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  font-size: 20px;
}

.logo {
  cursor: pointer;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.8;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: block;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.router-link-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #c0392b;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.main-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 40px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.profile-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  transition: opacity 0.2s;
}

.profile-link:hover {
  opacity: 0.8;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: border-color 0.2s;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-link:hover .profile-avatar {
  border-color: #007bff;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #007bff;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.main-content-wrapper {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}
</style>
