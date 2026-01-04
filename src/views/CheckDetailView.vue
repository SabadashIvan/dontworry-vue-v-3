<template>
  <Container v-if="check">
    <PageHeader
      :title="check.title"
      :subtitle="check.checker?.title ? `Checker: ${check.checker.title}` : undefined"
      :actions="[
        {
          key: 'run',
          label: 'Run Now',
          variant: 'primary',
          loading: runningCheck,
          onClick: handleRunCheck,
        },
        {
          key: 'edit',
          label: 'Edit',
          variant: 'secondary',
          onClick: () => (showEditModal = true),
        },
      ]"
    />

    <div class="check-content">
      <div class="check-overview">
        <Card>
          <h3 class="section-title">Check Information</h3>
          <dl class="info-list">
            <dt>Title:</dt>
            <dd>{{ check.title }}</dd>

            <dt>Checker:</dt>
            <dd>
              <div class="checker-info">
                <span>{{ check.checker?.title || 'Unknown' }}</span>
                <Badge v-if="check.checker" variant="secondary" size="sm">
                  Service {{ check.checker.service }}
                </Badge>
              </div>
            </dd>

            <dt>Project:</dt>
            <dd>
              <router-link v-if="client" :to="`/projects/${client.id}`" class="link">
                {{ client.title }}
              </router-link>
              <span v-else>Loading...</span>
            </dd>

            <dt>Status:</dt>
            <dd>
              <Badge :variant="check.is_active ? 'success' : 'secondary'" size="sm">
                {{ check.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </dd>

            <dt>Pages:</dt>
            <dd>
              <div v-if="assignedPages.length > 0" class="pages-list">
                <router-link
                  v-for="page in assignedPages"
                  :key="page.id"
                  :to="`/websites/${page.website_id}`"
                  class="page-link"
                >
                  {{ getPageLabel(page) }}
                </router-link>
              </div>
              <span v-else class="no-pages">No pages assigned</span>
            </dd>

            <dt v-if="check.config && Object.keys(check.config).length > 0">Configuration:</dt>
            <dd v-if="check.config && Object.keys(check.config).length > 0">
              <pre class="config-preview">{{ JSON.stringify(check.config, null, 2) }}</pre>
            </dd>
          </dl>
        </Card>
      </div>

      <div class="check-sections">
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Run History</h2>
            <Button variant="ghost" size="sm" @click="loadRunHistory">Refresh</Button>
          </div>
          <Card>
            <RunHistoryList :run-history="runHistory" />
          </Card>
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Recent Reports</h2>
            <Button variant="ghost" size="sm" @click="loadReports">Refresh</Button>
          </div>
          <Card>
            <div v-if="reports.length > 0" class="reports-list">
              <div
                v-for="report in reports"
                :key="report.id"
                class="report-item"
                @click="report && handleViewReport(report)"
              >
                <div class="report-item-header">
                  <div class="report-item-info">
                    <span class="report-check">{{ report?.check?.title || `Check #${report?.check_id}` }}</span>
                    <span v-if="report?.page" class="report-page">
                      {{ report.page.title }} ({{ report.page.website?.host }})
                    </span>
                  </div>
                  <Badge v-if="report" :variant="getReportStatusVariant(report)" size="sm">
                    {{ report ? getReportStatusLabel(report) : '' }}
                  </Badge>
                </div>
                <div class="report-item-time">
                  {{ report ? formatDate(report.created_at) : '' }}
                </div>
              </div>
            </div>
            <div v-else class="no-reports">
              <p>No reports yet</p>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <Modal v-model="showEditModal" title="Edit Check" size="lg">
      <CheckForm
        :check="check"
        is-edit
        @submit="handleFormSubmit"
        @cancel="showEditModal = false"
      />
    </Modal>

    <Modal v-model="showReportModal" title="Report Details" size="lg">
      <ReportDetails :report="selectedReport" />
    </Modal>
  </Container>

  <div v-else-if="loading" class="loading-state">
    <Spinner />
    <span>Loading check...</span>
  </div>

  <div v-else class="error-state">
    <p>Check not found</p>
    <Button @click="$router.push('/checks')">Back to Checks</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useChecksStore } from '@/stores/monitoring/checks'
import { useReportsStore } from '@/stores/monitoring/reports'
import { useClientsStore } from '@/stores/workspace/clients'
import { usePagesStore } from '@/stores/workspace/pages'
import { useWebsitesStore } from '@/stores/workspace/websites'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Badge from '@/shared/ui/Badge.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import CheckForm from '@/features/monitoring/components/CheckForm.vue'
import RunHistoryList from '@/features/monitoring/components/RunHistoryList.vue'
import ReportDetails from '@/features/monitoring/components/ReportDetails.vue'
import type { CheckUpdateDTO } from '@/features/monitoring/types'
import type { Report } from '@/features/monitoring/types'
import type { Page } from '@/features/workspace/types'

const route = useRoute()
const checksStore = useChecksStore()
const reportsStore = useReportsStore()
const clientsStore = useClientsStore()
const pagesStore = usePagesStore()
const websitesStore = useWebsitesStore()

const showEditModal = ref(false)
const showReportModal = ref(false)
const selectedReport = ref<Report | null>(null)
const runningCheck = ref(false)

const checkId = computed(() => Number(route.params.id))
const check = computed(() => checksStore.byId[checkId.value] || checksStore.currentCheck)
const loading = computed(() => checksStore.loading)

const runHistory = computed(() => {
  if (!check.value) return []
  return checksStore.runHistoryByCheckId[checkId.value] || []
})

const client = computed(() => {
  if (!check.value) return null
  return clientsStore.byId[check.value.client_id] || null
})

const assignedPages = computed(() => {
  if (!check.value || !check.value.page_ids || check.value.page_ids.length === 0) return []
  return check.value.page_ids
    .map((pageId) => pagesStore.byId[pageId])
    .filter(Boolean) as Page[]
})

const reports = computed((): Report[] => {
  const listKey = JSON.stringify({ checkId: checkId.value, page: 1, perPage: 10 })
  const list = reportsStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => reportsStore.byId[id]).filter((r): r is Report => r !== undefined)
})

onMounted(async () => {
  await loadCheck()
  await loadRunHistory()
  await loadReports()

  // Load related data
  if (check.value) {
    if (!client.value) {
      await clientsStore.fetchClient(check.value.client_id)
    }

    // Load pages and websites
    for (const pageId of check.value.page_ids || []) {
      const page = pagesStore.byId[pageId]
      if (!page) {
        // Try to find page by loading all pages (we need website_id)
        // For now, we'll load pages when we have website info
        continue
      }
      if (page.website_id && !websitesStore.byId[page.website_id]) {
        await websitesStore.fetchWebsite(page.website_id)
      }
    }
  }
})

async function loadCheck() {
  try {
    await checksStore.fetchCheck(checkId.value)
  } catch {
    // Error handling is done in store
  }
}

async function loadRunHistory() {
  try {
    await checksStore.fetchItemRunHistory(checkId.value)
  } catch {
    // Error handling is done in store
  }
}

async function loadReports() {
  try {
    await reportsStore.fetchReports({
      checkId: checkId.value,
      page: 1,
      perPage: 10,
    })
  } catch {
    // Error handling is done in store
  }
}

async function handleRunCheck() {
  if (!check.value) return

  runningCheck.value = true
  try {
    await checksStore.runCheck(check.value.id)
    // Refresh run history after a short delay
    setTimeout(() => {
      loadRunHistory()
      loadReports()
    }, 2000)
  } catch {
    // Error handling is done in store
  } finally {
    runningCheck.value = false
  }
}

async function handleFormSubmit(data: CheckUpdateDTO) {
  try {
    await checksStore.updateCheck(checkId.value, data)
    showEditModal.value = false
    await loadCheck()
  } catch {
    // Error handling is done in store
  }
}

function handleViewReport(report: Report) {
  selectedReport.value = report
  showReportModal.value = true
}

function getPageLabel(page: Page): string {
  const website = websitesStore.byId[page.website_id]
  if (website) {
    return `${website.host} - ${page.title} (${page.slug})`
  }
  return `${page.title} (${page.slug})`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function getReportStatusLabel(report: Report): string {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField) {
      return String(statusField.value)
    }
  }
  return 'Completed'
}

function getReportStatusVariant(report: Report): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField?.color) {
      const lowerColor = statusField.color.toLowerCase()
      if (lowerColor.includes('green') || lowerColor.includes('success')) {
        return 'success'
      }
      if (lowerColor.includes('red') || lowerColor.includes('error') || lowerColor.includes('danger')) {
        return 'danger'
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
.check-content {
  margin-top: 24px;
}

.check-overview {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.info-list {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px 20px;
  margin: 0;
}

.info-list dt {
  font-weight: 600;
  color: #666;
}

.info-list dd {
  margin: 0;
  color: #333;
}

.checker-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-link {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
}

.page-link:hover {
  text-decoration: underline;
}

.no-pages {
  color: #999;
  font-style: italic;
}

.config-preview {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.check-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header .section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.report-item:hover {
  background-color: #f5f5f5;
}

.report-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.report-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.report-check {
  font-weight: 500;
  color: #333;
}

.report-page {
  font-size: 14px;
  color: #666;
}

.report-item-time {
  font-size: 12px;
  color: #999;
}

.no-reports {
  padding: 40px;
  text-align: center;
  color: #666;
  font-style: italic;
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

.link {
  color: #007bff;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>

