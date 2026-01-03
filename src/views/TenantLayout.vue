<template>
  <div class="tenant-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>DontWorry</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/app/dashboard" class="nav-item">Dashboard</router-link>
        <router-link to="/app/projects" class="nav-item">Projects</router-link>
        <router-link to="/app/websites" class="nav-item">Websites</router-link>
        <router-link to="/app/checks" class="nav-item">Checks</router-link>
        <router-link to="/app/reports" class="nav-item">Reports</router-link>
        <router-link to="/app/notifications" class="nav-item">Notifications</router-link>
        <router-link to="/app/settings/profile" class="nav-item">Settings</router-link>
      </nav>
      <div class="sidebar-footer">
        <button @click="handleLogout" class="logout-btn">Logout</button>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/core/auth'

const authStore = useAuthStore()

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
  padding: 40px;
  background: #f5f5f5;
}
</style>

