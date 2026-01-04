<template>
  <Container v-if="website">
    <PageHeader
      :title="website.host"
      subtitle="Website"
      :breadcrumbs="breadcrumbs"
      :actions="[
        {
          key: 'add-check',
          label: 'Add Check',
          variant: 'primary',
          onClick: () => (showCheckModal = true),
        },
      ]"
    />

    <div class="website-content">
      <div class="website-overview">
        <Card>
          <div class="overview-header">
            <div class="website-icon">
              <div class="icon-placeholder">🌐</div>
            </div>
            <div class="overview-info">
              <h2>{{ website.host }}</h2>
              <div class="website-meta">
                <div class="meta-item">
                  <span class="meta-label">Project:</span>
                  <span class="meta-value">{{ client?.title || `Project ${website.client_id}` }}</span>
                </div>
                <div v-if="directory" class="meta-item">
                  <span class="meta-label">Directory:</span>
                  <span class="meta-value">{{ directory.title }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Created:</span>
                  <span class="meta-value">{{ formatDate(website.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div class="website-sections">
        <div class="section">
          <PagesList :website-id="website.id" />
        </div>

        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Checks</h2>
          </div>
          <Card>
            <div v-if="websiteChecks.length > 0" class="checks-list">
              <div
                v-for="check in websiteChecks"
                :key="check.id"
                class="check-item"
              >
                <div class="check-item-header">
                  <div class="check-item-info">
                    <h3 class="check-title">{{ check.title }}</h3>
                    <div class="check-meta">
                      <Badge v-if="check.checker" variant="secondary" size="sm">
                        {{ check.checker.title }}
                      </Badge>
                      <Badge :variant="check.is_active ? 'success' : 'secondary'" size="sm">
                        {{ check.is_active ? 'Active' : 'Inactive' }}
                      </Badge>
                      <span class="check-pages-count">
                        {{ getCheckPagesCount(check) }} page{{ getCheckPagesCount(check) !== 1 ? 's' : '' }}
                      </span>
                    </div>
                  </div>
                  <div class="check-item-actions">
                    <Button size="sm" variant="ghost" @click="handleViewCheck(check)">View</Button>
                    <Button size="sm" variant="ghost" @click="handleRunCheck(check)">Run</Button>
                    <Button size="sm" variant="ghost" @click="handleEditCheck(check)">Edit</Button>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="no-checks">
              <p>No checks configured for this website yet.</p>
              <Button variant="primary" @click="showCheckModal = true">Add Check</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <Modal v-model="showCheckModal" title="Add Check" size="lg">
      <CheckForm
        :initial-client-id="website.client_id"
        :website-id="website.id"
        @submit="handleCheckSubmit"
        @cancel="showCheckModal = false"
      />
    </Modal>

    <Modal v-model="showEditCheckModal" title="Edit Check" size="lg">
      <CheckForm
        :check="editingCheck"
        :is-edit="!!editingCheck"
        @submit="handleCheckUpdate"
        @cancel="showEditCheckModal = false"
      />
    </Modal>
  </Container>

  <div v-else-if="loading" class="loading-state">
    <Spinner />
    <span>Loading website...</span>
  </div>

  <div v-else class="error-state">
    <p>Website not found</p>
    <Button @click="router.push('/websites')">Back to Websites</Button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import { useChecksStore } from '@/stores/monitoring/checks'
import { usePagesStore } from '@/stores/workspace/pages'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import Modal from '@/shared/ui/Modal.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import PagesList from '@/features/workspace/components/PagesList.vue'
import CheckForm from '@/features/monitoring/components/CheckForm.vue'
import type { Breadcrumb } from '@/shared/ui/PageHeader.vue'
import type { Check, CheckCreateDTO, CheckUpdateDTO } from '@/features/monitoring/types'

const route = useRoute()
const router = useRouter()
const websitesStore = useWebsitesStore()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()
const checksStore = useChecksStore()
const pagesStore = usePagesStore()

const showCheckModal = ref(false)
const showEditCheckModal = ref(false)
const editingCheck = ref<Check | null>(null)

const websiteId = computed(() => Number(route.params.id))
const website = computed(() => websitesStore.byId[websiteId.value])
const loading = computed(() => websitesStore.loading)

const client = computed(() => {
  if (!website.value) return null
  return clientsStore.byId[website.value.client_id]
})

const directory = computed(() => {
  if (!website.value || !website.value.directory_id) return null
  return directoriesStore.byId[website.value.directory_id]
})

const breadcrumbs = computed<Breadcrumb[]>(() => {
  if (!website.value || !client.value) return []
  const crumbs: Breadcrumb[] = [
    { label: 'Organization', to: '/projects' },
    { label: client.value.title, to: `/projects/${client.value.id}` },
  ]
  if (directory.value) {
    crumbs.push({ label: directory.value.title, to: `/directories/${directory.value.id}` })
  }
  crumbs.push({ label: website.value.host, to: `/websites/${website.value.id}` })
  return crumbs
})

// Get website pages
const websitePages = computed(() => {
  if (!website.value) return []
  return pagesStore.pagesByWebsite(website.value.id)
})

const websitePageIds = computed(() => {
  return websitePages.value
    .map((page) => page?.id)
    .filter((id): id is number => id !== undefined && id !== null)
})

// Get checks related to this website
const websiteChecks = computed((): Check[] => {
  if (!website.value) return []

  // Get all checks for the client
  const listKey = JSON.stringify({ clientId: website.value.client_id, page: 1, perPage: 1000 })
  const list = checksStore.lists[listKey]
  if (!list) return []

  const allChecks = list.ids.map((id) => checksStore.byId[id]).filter(Boolean) as Check[]

  // Filter checks that have at least one page from this website
  return allChecks.filter((check) => {
    if (!check.page_ids || check.page_ids.length === 0) return false
    return check.page_ids.some((pageId) => websitePageIds.value.includes(pageId))
  })
})

onMounted(async () => {
  await loadWebsite()
  await loadChecks()
  await loadPages()
})

async function loadWebsite() {
  try {
    await websitesStore.fetchWebsite(websiteId.value)
    const site = websitesStore.byId[websiteId.value]
    if (site) {
      // Load client
      if (!clientsStore.byId[site.client_id]) {
        await clientsStore.fetchClient(site.client_id)
      }
      // Load directory if exists
      if (site.directory_id && !directoriesStore.byId[site.directory_id]) {
        await directoriesStore.fetchDirectory(site.directory_id)
      }
    }
  } catch {
    // Error handling is done in store
  }
}

async function loadChecks() {
  if (!website.value) return
  try {
    await checksStore.fetchChecks({ clientId: website.value.client_id, perPage: 1000 })
  } catch {
    // Error handling is done in store
  }
}

async function loadPages() {
  try {
    await pagesStore.fetchPages()
  } catch {
    // Error handling is done in store
  }
}

function getCheckPagesCount(check: Check): number {
  if (!check.page_ids || check.page_ids.length === 0) return 0
  return check.page_ids.filter((pageId) => websitePageIds.value.includes(pageId)).length
}

function handleViewCheck(check: Check) {
  router.push(`/checks/${check.id}`)
}

async function handleRunCheck(check: Check) {
  try {
    await checksStore.runCheck(check.id)
  } catch {
    // Error handling is done in store
  }
}

function handleEditCheck(check: Check) {
  editingCheck.value = check
  showEditCheckModal.value = true
}

async function handleCheckSubmit(data: CheckCreateDTO | CheckUpdateDTO) {
  try {
    await checksStore.createCheck(data as CheckCreateDTO)
    showCheckModal.value = false
    await loadChecks()
  } catch {
    // Error handling is done in store
  }
}

async function handleCheckUpdate(data: CheckUpdateDTO) {
  if (!editingCheck.value) return
  try {
    await checksStore.updateCheck(editingCheck.value.id, data)
    showEditCheckModal.value = false
    editingCheck.value = null
    await loadChecks()
  } catch {
    // Error handling is done in store
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.website-content {
  margin-top: 24px;
}

.website-overview {
  margin-bottom: 24px;
}

.overview-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.website-icon {
  flex-shrink: 0;
}

.icon-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.overview-info {
  flex: 1;
}

.overview-info h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.website-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.meta-label {
  font-weight: 500;
  color: #666;
}

.meta-value {
  color: #333;
}

.website-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  width: 100%;
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

.checks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f9f9f9;
  transition: all 0.2s ease;
}

.check-item:hover {
  background: #f0f0f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.check-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.check-item-info {
  flex: 1;
}

.check-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.check-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.check-pages-count {
  font-size: 14px;
  color: #666;
}

.check-item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.no-checks {
  padding: 40px;
  text-align: center;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
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

