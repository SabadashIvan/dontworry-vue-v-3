<template>
  <div class="pages-list">
    <PageHeader
      title="Pages"
      :actions="[
        {
          key: 'create',
          label: 'Create Page',
          variant: 'primary',
          onClick: () => (showFormModal = true),
        },
      ]"
    />

    <Table
      :columns="columns"
      :data="(pages as unknown) as Record<string, unknown>[]"
      :loading="loading"
      empty-text="No pages yet. Create one to get started."
    >
      <template #cell-actions="{ row }">
        <Button size="sm" variant="ghost" @click="handleEdit(row as unknown as Page)">Edit</Button>
        <Button size="sm" variant="danger" @click="handleDelete(row as unknown as Page)">Delete</Button>
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

    <Modal v-model="showFormModal" :title="formTitle" size="md">
      <PageForm
        :page="editingPage"
        :website-id="websiteId"
        :is-edit="!!editingPage"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePagesStore } from '@/stores/workspace/pages'
import { useWebsitesStore } from '@/stores/workspace/websites'
import PageHeader from '@/shared/ui/PageHeader.vue'
import Table from '@/shared/ui/Table.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import PageForm from './PageForm.vue'
import type { Page } from '@/features/workspace/types'
import type { TableColumn } from '@/shared/ui/Table.vue'
import type { PaginatorMeta } from '@/core/api/types'

export interface PagesListProps {
  websiteId: number
}

const props = defineProps<PagesListProps>()

const pagesStore = usePagesStore()
const websitesStore = useWebsitesStore()

const showFormModal = ref(false)
const editingPage = ref<Page | null>(null)
const currentPage = ref(1)

const loading = computed(() => pagesStore.loading)
const pages = computed(() => {
  const listKey = JSON.stringify({ websiteId: props.websiteId, page: currentPage.value, perPage: 10 })
  const list = pagesStore.lists[listKey]
  if (!list) return []
  return list.ids.map((id) => pagesStore.byId[id]).filter(Boolean)
})

const paginator = computed<PaginatorMeta | undefined>(() => {
  const listKey = JSON.stringify({ websiteId: props.websiteId, page: currentPage.value, perPage: 10 })
  const list = pagesStore.lists[listKey]
  return list?.paginator
})

const website = computed(() => {
  return websitesStore.byId[props.websiteId]
})

const formTitle = computed(() => {
  return editingPage.value ? 'Edit Page' : 'Create Page'
})

const columns = computed<TableColumn[]>(() => [
  {
    key: 'title',
    label: 'Title',
    sortable: false,
  },
  {
    key: 'slug',
    label: 'Slug',
    sortable: false,
  },
  {
    key: 'fullUrl',
    label: 'Full URL',
    sortable: false,
    formatter: (value, row) => {
      if (website.value) {
        return pagesStore.fullUrl(row as unknown as Page, website.value)
      }
      return ''
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
  if (!website.value) {
    await websitesStore.fetchWebsite(props.websiteId)
  }
})

async function loadPage(page: number) {
  currentPage.value = page
  await pagesStore.fetchPages(props.websiteId, { page, perPage: 10 })
}

function handleEdit(page: Page) {
  editingPage.value = page
  showFormModal.value = true
}

async function handleDelete(page: Page) {
  if (confirm(`Are you sure you want to delete "${page.title}"?`)) {
    await pagesStore.deletePage(page.id)
    await loadPage(currentPage.value)
  }
}

async function handleFormSubmit() {
  showFormModal.value = false
  editingPage.value = null
  await loadPage(currentPage.value)
}
</script>

<style scoped>
.pages-list {
  width: 100%;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}
</style>

