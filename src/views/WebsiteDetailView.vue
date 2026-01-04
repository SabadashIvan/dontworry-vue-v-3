<template>
  <Container v-if="website">
    <PageHeader
      :title="website.host"
      subtitle="Website"
      :breadcrumbs="breadcrumbs"
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
      </div>
    </div>
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
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebsitesStore } from '@/stores/workspace/websites'
import { useClientsStore } from '@/stores/workspace/clients'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import Container from '@/shared/ui/Container.vue'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Card from '@/shared/ui/Card.vue'
import Button from '@/shared/ui/Button.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import PagesList from '@/features/workspace/components/PagesList.vue'
import type { Breadcrumb } from '@/shared/ui/PageHeader.vue'

const route = useRoute()
const router = useRouter()
const websitesStore = useWebsitesStore()
const clientsStore = useClientsStore()
const directoriesStore = useDirectoriesStore()

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

onMounted(async () => {
  await loadWebsite()
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

