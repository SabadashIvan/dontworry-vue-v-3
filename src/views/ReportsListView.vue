<template>
  <Container>
    <PageHeader title="Reports" />

    <Card>
      <div class="filters">
        <FormField label="Filter by Check">
          <Select
            v-model="filters.checkId"
            :options="checkOptions"
            placeholder="All checks"
            @change="handleFilterChange"
          />
        </FormField>

        <FormField label="Filter by Project">
          <Select
            v-model="filters.clientId"
            :options="clientOptions"
            placeholder="All projects"
            @change="handleFilterChange"
          />
        </FormField>

        <FormField label="Filter by Website">
          <Select
            v-model="filters.websiteId"
            :options="websiteOptions"
            placeholder="All websites"
            :disabled="!filters.clientId"
            @change="handleFilterChange"
          />
        </FormField>

        <div class="filter-actions">
          <Button variant="ghost" size="sm" @click="handleClearFilters">Clear Filters</Button>
        </div>
      </div>

      <Table
        :columns="columns"
        :data="reports"
        :loading="loading"
        empty-text="No reports yet."
      >
        <template #cell-check="{ row }">
          <div class="check-cell">
            <span class="check-title">{{ row.check?.title || `Check #${row.check_id}` }}</span>
            <Badge v-if="row.check?.checker" variant="secondary" size="sm">
              {{ row.check.checker.title }}
            </Badge>
          </div>
        </template>

        <template #cell-page="{ row }">
          <div v-if="row.page" class="page-cell">
            <span>{{ row.page.title }}</span>
            <span v-if="row.page.website" class="page-website">{{ row.page.website.host }}</span>
          </div>
          <span v-else>-</span>
        </template>

        <template #cell-status="{ row }">
          <Badge :variant="getStatusVariant(row)" size="sm">
            {{ getStatusLabel(row) }}
          </Badge>
        </template>

        <template #cell-actions="{ row }">
          <div class="actions-cell">
            <Button size="sm" variant="ghost" @click="handleViewDetails(row)">Details</Button>
            <Button size="sm" variant="danger" @click="handleDelete(row)">Delete</Button>
          </div>
        </template>
      </Table>

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

    <Modal v-model="showDetailsModal" title="Report Details" size="lg">
      <ReportDetails :report="selectedReport" />
    </Modal>
  </Container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReportsStore } from '@/stores/monitoring/reports'
import { useChecksStore } from '@/stores/monitoring/checks'
import { useClientsStore } from '@/stores/workspace/clients'
import { useWebsitesStore } from '@/stores/workspace/websites'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import FormField from '@/shared/ui/FormField.vue'
import Select from '@/shared/ui/Select.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Modal from '@/shared/ui/Modal.vue'
import ReportDetails from '@/features/monitoring/components/ReportDetails.vue'
import type { Report } from '@/features/monitoring/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { SelectOption } from '@/shared/ui/Select.vue'
import type { PaginatorMeta } from '@/core/api/types'

const reportsStore = useReportsStore()
const checksStore = useChecksStore()
const clientsStore = useClientsStore()
const websitesStore = useWebsitesStore()

const showDetailsModal = ref(false)
const selectedReport = ref<Report | null>(null)
const currentPage = ref(1)

const filters = ref({
  checkId: undefined as number | undefined,
  clientId: undefined as number | undefined,
  websiteId: undefined as number | undefined,
})

const loading = computed(() => reportsStore.loading)
const reports = computed(() => {
  const listKey = JSON.stringify({ ...filters.value, page: currentPage.value, perPage: 20 })
  const list = reportsStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => reportsStore.byId[id]).filter(Boolean)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  const listKey = JSON.stringify({ ...filters.value, page: currentPage.value, perPage: 20 })
  const list = reportsStore.lists[listKey]
  return list?.paginator
})

const checkOptions = computed<SelectOption[]>(() => {
  return [
    { label: 'All checks', value: undefined },
    ...checksStore.checks.map((check) => ({
      label: check.title,
      value: check.id,
    })),
  ]
})

const clientOptions = computed<SelectOption[]>(() => {
  return [
    { label: 'All projects', value: undefined },
    ...clientsStore.clients.map((client) => ({
      label: client.title,
      value: client.id,
    })),
  ]
})

const websiteOptions = computed<SelectOption[]>(() => {
  if (!filters.value.clientId) return []

  const websites = Object.values(websitesStore.byId).filter(
    (website) => website.client_id === filters.value.clientId
  )

  return [
    { label: 'All websites', value: undefined },
    ...websites.map((website) => ({
      label: website.host,
      value: website.id,
    })),
  ]
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'check',
    label: 'Check',
    sortable: false,
  },
  {
    key: 'page',
    label: 'Page',
    sortable: false,
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
  await loadPage(1)
  if (checksStore.checks.length === 0) {
    await checksStore.fetchChecks()
  }
  if (clientsStore.clients.length === 0) {
    await clientsStore.fetchClients()
  }
  if (Object.keys(websitesStore.byId).length === 0) {
    await websitesStore.fetchWebsites()
  }
})

async function loadPage(page: number) {
  currentPage.value = page
  await reportsStore.fetchReports({
    ...filters.value,
    page,
    perPage: 20,
  })
}

async function handleFilterChange() {
  currentPage.value = 1
  await loadPage(1)
}

function handleClearFilters() {
  filters.value = {
    checkId: undefined,
    clientId: undefined,
    websiteId: undefined,
  }
  handleFilterChange()
}

function handleViewDetails(report: Report) {
  selectedReport.value = report
  showDetailsModal.value = true
}

async function handleDelete(report: Report) {
  if (confirm(`Are you sure you want to delete this report?`)) {
    await reportsStore.deleteReport(report.id)
    await loadPage(currentPage.value)
  }
}

function getStatusLabel(report: Report): string {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField) {
      return String(statusField.value)
    }
  }
  return 'Completed'
}

function getStatusVariant(report: Report): 'success' | 'error' | 'warning' | 'info' | 'secondary' {
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
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
  align-items: end;
}

.filter-actions {
  display: flex;
  align-items: center;
}

.check-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.check-title {
  font-weight: 500;
}

.page-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-website {
  font-size: 12px;
  color: #666;
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
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
