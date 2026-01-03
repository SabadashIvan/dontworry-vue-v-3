<template>
  <Container>
    <PageHeader
      title="Notifications"
      :actions="[
        {
          key: 'mark-all-read',
          label: `Mark All Read (${unreadCount})`,
          variant: unreadCount > 0 ? 'primary' : 'ghost',
          disabled: unreadCount === 0,
          onClick: handleMarkAllRead,
        },
      ]"
    />

    <div class="notifications-tabs">
      <Button
        :variant="activeTab === 'all' ? 'primary' : 'ghost'"
        size="sm"
        @click="activeTab = 'all'"
      >
        All
      </Button>
      <Button
        :variant="activeTab === 'unread' ? 'primary' : 'ghost'"
        size="sm"
        @click="activeTab = 'unread'"
      >
        Unread
        <Badge v-if="unreadCount > 0" variant="error" size="sm" class="badge-inline">
          {{ unreadCount }}
        </Badge>
      </Button>
    </div>

    <Card>
      <div v-if="loading && notifications.length === 0" class="loading-state">
        <Spinner />
        <span>Loading notifications...</span>
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <p>{{ activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet' }}</p>
      </div>

      <div v-else class="notifications-list">
        <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @mark-read="handleMarkAsRead"
        />
      </div>

      <div v-if="paginator && paginator.last_page > 1" class="pagination">
        <Button
          :disabled="paginator.current_page === 1"
          variant="ghost"
          size="sm"
          @click="loadPage(paginator.current_page - 1)"
        >
          Previous
        </Button>
        <span class="pagination-info">
          Page {{ paginator.current_page }} of {{ paginator.last_page }}
        </span>
        <Button
          :disabled="paginator.current_page === paginator.last_page"
          variant="ghost"
          size="sm"
          @click="loadPage(paginator.current_page + 1)"
        >
          Next
        </Button>
      </div>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNotificationsStore } from '@/stores/notifications/notifications'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import NotificationItem from '@/features/notifications/components/NotificationItem.vue'
import type { Notification } from '@/features/notifications/types'
import type { PaginatorMeta } from '@/core/api/types'

const notificationsStore = useNotificationsStore()

const activeTab = ref<'all' | 'unread'>('all')
const currentPage = ref(1)

const loading = computed(() => notificationsStore.loading)
const unreadCount = computed(() => notificationsStore.unreadCount)

const notifications = computed(() => {
  if (activeTab.value === 'unread') {
    return notificationsStore.unreadNotifications
  }

  const listKey = JSON.stringify({ page: currentPage.value, perPage: 20 })
  const list = notificationsStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => notificationsStore.byId[id]).filter(Boolean)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  if (activeTab.value === 'unread') {
    return notificationsStore.unreadList?.paginator
  }

  const listKey = JSON.stringify({ page: currentPage.value, perPage: 20 })
  const list = notificationsStore.lists[listKey]
  return list?.paginator
})

onMounted(async () => {
  await loadData()
  // Load unread count
  await notificationsStore.fetchUnreadCount()
})

watch(activeTab, () => {
  currentPage.value = 1
  loadData()
})

async function loadData() {
  if (activeTab.value === 'unread') {
    await notificationsStore.fetchUnread({ page: currentPage.value, perPage: 20 })
  } else {
    await notificationsStore.fetchNotifications({ page: currentPage.value, perPage: 20 })
  }
}

async function loadPage(page: number) {
  currentPage.value = page
  await loadData()
}

async function handleMarkAsRead(id: number) {
  await notificationsStore.markAsRead(id)
  // Refresh unread count
  await notificationsStore.fetchUnreadCount()
  // If on unread tab, refresh list
  if (activeTab.value === 'unread') {
    await loadData()
  }
}

async function handleMarkAllRead() {
  await notificationsStore.markAllAsRead()
  // Refresh unread count
  await notificationsStore.fetchUnreadCount()
  // Refresh current list
  await loadData()
}
</script>

<style scoped>
.notifications-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.badge-inline {
  margin-left: 8px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #666;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  color: #999;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}
</style>
