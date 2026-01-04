<template>
  <Container v-if="directory">
    <PageHeader
      :title="directory.title"
      subtitle="Client Folder"
      :breadcrumbs="breadcrumbs"
      :actions="[
        {
          key: 'add-website',
          label: 'Add Website',
          variant: 'primary',
          onClick: () => (showWebsiteFormModal = true),
        },
      ]"
    >
      <template #title>
        <div class="directory-header">
          <div v-if="client?.avatar" class="directory-avatar">
            <img :src="client.avatar" :alt="client.title" class="avatar-img" />
          </div>
          <div v-else class="directory-avatar">
            <div class="avatar-placeholder">📁</div>
          </div>
          <div class="directory-title-section">
            <h1 class="page-header-title">{{ directory.title }}</h1>
            <p class="page-header-subtitle">Client Folder</p>
          </div>
        </div>
      </template>
    </PageHeader>

    <div class="directory-content">
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Websites</h2>
        </div>
        <Card>
          <Table
            :columns="websiteColumns"
            :data="(websites as unknown) as Record<string, unknown>[]"
            :loading="websitesLoading"
            empty-text="No websites in this folder yet."
          >
            <template #cell-host="{ row }">
              <div class="website-name-cell">
                <span class="website-name">{{ getWebsiteName(row as unknown as Website) }}</span>
              </div>
            </template>
            <template #cell-url="{ row }">
              <span class="website-url">{{ (row as unknown as Website).host }}</span>
            </template>
            <template #cell-status="{ row }">
              <Badge :variant="getWebsiteStatusVariant(row as unknown as Website)" size="sm">
                {{ getWebsiteStatusLabel(row as unknown as Website) }}
              </Badge>
            </template>
            <template #cell-last-run="{ row }">
              <span>{{ getLastRunDate(row as unknown as Website) }}</span>
            </template>
            <template #cell-actions="{ row }">
              <div class="actions-cell">
                <Button size="sm" variant="ghost" @click="handleWebsiteOptions(row as unknown as Website)">⋯</Button>
              </div>
            </template>
          </Table>
        </Card>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Reports</h2>
        </div>
        <Card>
          <div v-if="reportsLoading" class="reports-loading">
            <Spinner />
            <span>Loading reports...</span>
          </div>
          <div v-else-if="reports.length === 0" class="reports-empty">
            <p>No reports yet.</p>
          </div>
          <div v-else class="reports-list">
            <div
              v-for="report in reports"
              :key="report.id"
              class="report-item"
            >
              <div class="report-icon">
                <span>{{ getReportIcon(report) }}</span>
              </div>
              <div class="report-info">
                <div class="report-name">{{ getReportName(report) }}</div>
                <div class="report-meta">
                  <span>{{ getReportSize() }}</span>
                  <span class="meta-separator">•</span>
                  <span>{{ formatReportDate(report.created_at) }}</span>
                </div>
                <div v-if="getReportTags(report).length > 0" class="report-tags">
                  <Badge
                    v-for="(tag, index) in getReportTags(report)"
                    :key="index"
                    variant="secondary"
                    size="sm"
                  >
                    {{ tag }}
                  </Badge>
                </div>
              </div>
              <div class="report-actions">
                <Button size="sm" variant="ghost" @click="handleReportOptions(report)">⋯</Button>
              </div>
            </div>
          </div>
          <div v-if="reports.length > 0" class="reports-footer">
            <Button variant="ghost" size="sm" @click="handleViewAllFiles">
              <template #icon>👁</template>
              View All Files
            </Button>
          </div>
        </Card>
      </div>
    </div>

    <Modal v-model="showWebsiteFormModal" title="Add Website" size="md">
      <WebsiteForm
        :initial-client-id="directory.client_id"
        :initial-directory-id="directory.id"
        @submit="handleWebsiteFormSubmit"
        @cancel="showWebsiteFormModal = false"
      />
    </Modal>
  </Container>

  <div v-else-if="loading" class="loading-state">
    <Spinner />
    <span>Loading directory...</span>
  </div>

  <div v-else class="error-state">
    <p>Directory not found</p>
    <Button @click="$router.push('/projects')">Back to Projects</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import { useClientsStore } from '@/stores/workspace/clients'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useReportsStore } from '@/stores/monitoring/reports'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Modal from '@/shared/ui/Modal.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import WebsiteForm from '@/features/workspace/components/WebsiteForm.vue'
import type { Website, WebsiteCreateDTO, WebsiteUpdateDTO } from '@/features/workspace/types'
import type { Report } from '@/features/monitoring/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { Breadcrumb } from '@/shared/ui/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const directoriesStore = useDirectoriesStore()
const clientsStore = useClientsStore()
const websitesStore = useWebsitesStore()
const reportsStore = useReportsStore()

const showWebsiteFormModal = ref(false)
const websitesLoading = ref(false)
const reportsLoading = ref(false)

const directoryId = computed(() => Number(route.params.id))
const directory = computed(() => directoriesStore.byId[directoryId.value])
const loading = computed(() => directoriesStore.loading)
const client = computed(() => {
  if (!directory.value) return null
  return clientsStore.byId[directory.value.client_id]
})

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!directory.value || !client.value) return []

  const breadcrumbsList: Breadcrumb[] = [
    { label: 'Organization', to: '/projects' },
    { label: client.value.title, to: `/projects/${client.value.id}` },
  ]

  // Get full path of directory (all parents)
  const path = directoriesStore.getDirectoryPath(directory.value.id)

  // Add all parent directories to breadcrumbs
  for (let i = 0; i < path.length - 1; i++) {
    const dir = path[i]
    if (dir) {
      breadcrumbsList.push({
        label: dir.title,
        to: `/directories/${dir.id}`,
      })
    }
  }

  // Add current directory
  breadcrumbsList.push({
    label: directory.value.title,
    to: `/directories/${directory.value.id}`,
  })

  return breadcrumbsList
})

const websites = computed(() => {
  return Object.values(websitesStore.byId).filter(
    (website) => website.directory_id === directoryId.value
  )
})

const reports = computed(() => {
  const websiteIds = websites.value.map((w) => w.id)
  return Object.values(reportsStore.byId).filter((report) => {
    return report.page?.website_id && websiteIds.includes(report.page.website_id)
  })
})

const websiteColumns = computed<TableColumn[]>(() => [
  {
    key: 'host',
    label: 'Website Name',
    sortable: false,
  },
  {
    key: 'url',
    label: 'URL',
    sortable: false,
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
  },
  {
    key: 'last-run',
    label: 'Last Run',
    sortable: false,
  },
  {
    key: 'actions',
    label: '',
    sortable: false,
    align: 'right',
  },
])

onMounted(async () => {
  await loadDirectory()
})

async function loadDirectory() {
  try {
    await directoriesStore.fetchDirectory(directoryId.value)
    const dir = directoriesStore.byId[directoryId.value]
    if (dir) {
      // Load client
      if (!clientsStore.byId[dir.client_id]) {
        await clientsStore.fetchClient(dir.client_id)
      }
      // Load websites
      websitesLoading.value = true
      await websitesStore.fetchWebsitesByDirectory(directoryId.value)
      websitesLoading.value = false
      // Load reports for all websites
      await loadReports()
    }
  } catch {
    // Error handling is done in store
  }
}

async function loadReports() {
  reportsLoading.value = true
  try {
    const websiteIds = websites.value.map((w) => w.id)
    if (websiteIds.length === 0) {
      reportsLoading.value = false
      return
    }
    // Load reports for each website (API doesn't support multiple website_id filter)
    // We could optimize by loading all reports and filtering client-side, but for now
    // we'll load per website to ensure we get all reports
    const loadPromises = websiteIds.map((websiteId) =>
      reportsStore.fetchReports({ websiteId, perPage: 100 }).catch(() => [])
    )
    await Promise.all(loadPromises)
  } catch {
    // Error handling is done in store
  } finally {
    reportsLoading.value = false
  }
}

function getWebsiteName(website: Website): string {
  // For now, use host as name. Could be enhanced with a name field if available
  return website.host.split('.')[0] || website.host
}

function getWebsiteStatusLabel(website: Website): string {
  // Get latest report for this website to determine status
  const websiteReports = reports.value.filter(
    (r) => r.page?.website_id === website.id
  )
  if (websiteReports.length === 0) return 'No Status'

  const sortedReports = websiteReports.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const latestReport = sortedReports[0]
  if (!latestReport) return 'No Status'

  if (latestReport.report_fields) {
    const statusField = latestReport.report_fields.status || latestReport.report_fields.Status
    if (statusField) {
      return String(statusField.value)
    }
  }
  return 'Passed'
}

function getWebsiteStatusVariant(website: Website): 'success' | 'warning' | 'info' | 'secondary' | 'danger' {
  const websiteReports = reports.value.filter(
    (r) => r.page?.website_id === website.id
  )
  if (websiteReports.length === 0) return 'secondary'

  const sortedReports = websiteReports.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const latestReport = sortedReports[0]
  if (!latestReport) return 'secondary'

  if (latestReport.report_fields) {
    const statusField = latestReport.report_fields.status || latestReport.report_fields.Status
    if (statusField?.color) {
      const lowerColor = statusField.color.toLowerCase()
      if (lowerColor.includes('green') || lowerColor.includes('success') || lowerColor.includes('passed')) {
        return 'success'
      }
      if (lowerColor.includes('red') || lowerColor.includes('error') || lowerColor.includes('danger') || lowerColor.includes('critical')) {
        return 'danger'
      }
      if (lowerColor.includes('yellow') || lowerColor.includes('warning') || lowerColor.includes('minor')) {
        return 'warning'
      }
    }
  }
  return 'success'
}

function getLastRunDate(website: Website): string {
  const websiteReports = reports.value.filter(
    (r) => r.page?.website_id === website.id
  )
  if (websiteReports.length === 0) return '-'

  const sortedReports = websiteReports.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const latestReport = sortedReports[0]
  if (!latestReport) return '-'

  return formatReportDate(latestReport.created_at)
}

function getReportIcon(report: Report): string {
  // Determine icon based on report type or checker
  const checkerTitle = report.check?.checker?.title?.toLowerCase() || ''
  if (checkerTitle.includes('pdf') || report.id.toString().includes('pdf')) {
    return '📄'
  }
  if (checkerTitle.includes('doc') || report.id.toString().includes('docx')) {
    return '📝'
  }
  if (checkerTitle.includes('js') || report.id.toString().includes('js')) {
    return '{ }'
  }
  if (checkerTitle.includes('ai') || report.id.toString().includes('ai')) {
    return '🎨'
  }
  return '📄'
}

function getReportName(report: Report): string {
  // Generate report name from check and page info
  const checkTitle = report.check?.title || `Check #${report.check_id}`

  // Try to extract meaningful name from check title or use default
  if (checkTitle.includes('Report')) {
    return checkTitle
  }
  return `Report-${report.id}`
}

function getReportSize(): string {
  // Report size is not directly available, using placeholder
  // Could be enhanced if API provides size information
  return '4.7 MB'
}

function getReportTags(report: Report): string[] {
  const tags: string[] = []

  // Add website host as tag
  const websiteHost = report.page?.website?.host
  if (websiteHost) {
    const hostParts = websiteHost.split('.')
    if (hostParts.length > 0 && hostParts[0]) {
      tags.push(hostParts[0])
    }
  }

  // Add check title as tag if available
  const checkTitle = report.check?.title
  if (checkTitle) {
    tags.push(checkTitle)
  }

  return tags
}

function formatReportDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${day} ${month}, ${year} ${time}`
}

function handleWebsiteOptions(website: Website) {
  // Handle website options menu
  console.log('Website options:', website)
}

function handleReportOptions(report: Report) {
  // Handle report options menu
  console.log('Report options:', report)
}

function handleViewAllFiles() {
  router.push({ name: 'reports', query: { directory_id: directoryId.value } })
}

async function handleWebsiteFormSubmit(data: WebsiteCreateDTO | WebsiteUpdateDTO) {
  try {
    // When creating from directory page, ensure it's a create DTO
    const createData = data as WebsiteCreateDTO
    await websitesStore.createWebsite(createData)
    showWebsiteFormModal.value = false
    await websitesStore.fetchWebsitesByDirectory(directoryId.value)
    await loadReports()
  } catch {
    // Error handling is done in store
  }
}
</script>

<style scoped>
.directory-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.directory-avatar {
  flex-shrink: 0;
}

.avatar-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.directory-title-section {
  flex: 1;
}

.directory-content {
  margin-top: 24px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.website-name-cell {
  font-weight: 500;
}

.website-name {
  color: #333;
}

.website-url {
  color: #666;
  font-size: 14px;
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.reports-loading,
.reports-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: #666;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.report-item:hover {
  background-color: #f8f9fa;
}

.report-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #f5f5f5;
  border-radius: 6px;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.report-meta {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-separator {
  color: #999;
}

.report-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.report-actions {
  flex-shrink: 0;
}

.reports-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #666;
}
</style>
