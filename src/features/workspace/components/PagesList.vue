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

export interface PagesListProps {
  websiteId: number
}

const props = defineProps<PagesListProps>()

const pagesStore = usePagesStore()
const websitesStore = useWebsitesStore()

const showFormModal = ref(false)
const editingPage = ref<Page | null>(null)

const loading = computed(() => pagesStore.loading)
const pages = computed(() => pagesStore.pagesByWebsite(props.websiteId))

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
  await pagesStore.fetchPages(props.websiteId)
  if (!website.value) {
    await websitesStore.fetchWebsite(props.websiteId)
  }
})

function handleEdit(page: Page) {
  editingPage.value = page
  showFormModal.value = true
}

async function handleDelete(page: Page) {
  if (confirm(`Are you sure you want to delete "${page.title}"?`)) {
    await pagesStore.deletePage(page.id)
    await pagesStore.fetchPages(props.websiteId)
  }
}

async function handleFormSubmit() {
  showFormModal.value = false
  editingPage.value = null
  await pagesStore.fetchPages(props.websiteId)
}
</script>

<style scoped>
.pages-list {
  width: 100%;
}
</style>

