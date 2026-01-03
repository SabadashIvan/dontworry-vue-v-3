<template>
  <Container>
    <PageHeader title="Dashboard" />

    <div class="dashboard-stats">
      <Card class="stat-card">
        <div class="stat-content">
          <h3 class="stat-value">{{ projectsCount }}</h3>
          <p class="stat-label">Projects</p>
        </div>
        <Button variant="ghost" size="sm" @click="router.push('/projects')">View All</Button>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <h3 class="stat-value">{{ websitesCount }}</h3>
          <p class="stat-label">Websites</p>
        </div>
        <Button variant="ghost" size="sm" @click="router.push('/websites')">View All</Button>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <h3 class="stat-value">{{ activeChecksCount }}</h3>
          <p class="stat-label">Active Checks</p>
        </div>
        <Button variant="ghost" size="sm" @click="router.push('/checks')">View All</Button>
      </Card>

      <Card class="stat-card">
        <div class="stat-content">
          <h3 class="stat-value">{{ unreadNotificationsCount }}</h3>
          <p class="stat-label">Unread Notifications</p>
        </div>
        <Button variant="ghost" size="sm" @click="router.push('/notifications')">View All</Button>
      </Card>
    </div>

    <div class="dashboard-content">
      <Card class="recent-reports-card">
        <div class="card-header">
          <h2>Recent Reports</h2>
          <Button variant="ghost" size="sm" @click="router.push('/reports')">View All</Button>
        </div>
        <div v-if="loadingReports" class="loading-state">
          <Spinner />
          <span>Loading reports...</span>
        </div>
        <div v-else-if="recentReports.length === 0" class="empty-state">
          <p>No reports yet</p>
        </div>
        <Table v-else :columns="reportColumns" :data="recentReports as unknown as Record<string, unknown>[]" :loading="false">
          <template #cell-status="{ row }">
            <Badge :variant="getStatusVariant(row as Report)" size="sm">
              {{ getStatusLabel(row as Report) }}
            </Badge>
          </template>
          <template #cell-actions="{ row }">
            <Button size="sm" variant="ghost" @click="router.push(`/reports/${(row as Report).id}`)">View</Button>
          </template>
        </Table>
      </Card>

      <Card class="quick-actions-card">
        <h2>Quick Actions</h2>
        <div class="quick-actions">
          <Button variant="primary" @click="router.push('/projects?create=true')">
            Create Project
          </Button>
          <Button variant="primary" @click="router.push('/websites?create=true')">
            Create Website
          </Button>
          <Button variant="primary" @click="router.push('/checks?create=true')">
            Create Check
          </Button>
        </div>
      </Card>
    </div>
  </Container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientsStore } from '@/stores/workspace/clients'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useChecksStore } from '@/stores/monitoring/checks'
import { useReportsStore } from '@/stores/monitoring/reports'
import { useNotificationsStore } from '@/stores/notifications/notifications'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import Table from '@/shared/ui/Table.vue'
import type { Report } from '@/features/monitoring/types'
import type { TableColumn } from '@/shared/ui/Table.vue'

const router = useRouter()
const clientsStore = useClientsStore()
const websitesStore = useWebsitesStore()
const checksStore = useChecksStore()
const reportsStore = useReportsStore()
const notificationsStore = useNotificationsStore()

const loadingReports = computed(() => reportsStore.loading)

const projectsCount = computed(() => clientsStore.clients.length)
const websitesCount = computed(() => Object.values(websitesStore.byId).length)
const activeChecksCount = computed(() => checksStore.checks.filter((check) => check.is_active).length)
const unreadNotificationsCount = computed(() => notificationsStore.unreadCount)

const recentReports = computed(() => {
  const allReports = Object.values(reportsStore.byId)
  return allReports
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
})

const reportColumns = computed<TableColumn[]>(() => [
  {
    key: 'check',
    label: 'Check',
    sortable: false,
    formatter: (value, row) => {
      const report = row as Report
      return report.check?.title || `Check #${report.check_id}`
    },
  },
  {
    key: 'page',
    label: 'Page',
    sortable: false,
    formatter: (value, row) => {
      const report = row as Report
      return report.page?.title || '-'
    },
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
  },
  {
    key: 'created_at',
    label: 'Date',
    sortable: false,
    formatter: (value) => {
      if (!value) return '-'
      return new Date(value as string).toLocaleString()
    },
  },
  {
    key: 'actions',
    label: 'Actions',
    sortable: false,
    align: 'right',
  },
])

onMounted(async () => {
  // Load initial data
  await Promise.all([
    clientsStore.fetchClients(),
    websitesStore.fetchWebsites(),
    checksStore.fetchChecks(),
    reportsStore.fetchReports({ page: 1, perPage: 5 }),
    notificationsStore.fetchUnreadCount(),
  ])
})

function getStatusLabel(report: Report): string {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField) {
      return String(statusField.value)
    }
  }
  return 'Completed'
}

function getStatusVariant(report: Report): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField?.color) {
      const lowerColor = statusField.color.toLowerCase()
      if (lowerColor.includes('green') || lowerColor.includes('success')) {
        return 'success'
      }
      if (lowerColor.includes('red') || lowerColor.includes('error') || lowerColor.includes('danger')) {
        return 'error'
      }
      if (lowerColor.includes('yellow') || lowerColor.includes('warning')) {
        return 'warning'
      }
    }
  }
  return 'info'
}
</script>

<style scoped>
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #007bff;
}

.stat-label {
  margin: 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.recent-reports-card,
.quick-actions-card {
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.quick-actions {
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
  padding: 40px 20px;
  gap: 16px;
  color: #666;
}

.empty-state p {
  margin: 0;
  color: #999;
}

@media (max-width: 768px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}
</style>
