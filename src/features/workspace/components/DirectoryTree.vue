<template>
  <div class="directory-tree">
    <div v-if="loading" class="tree-loading">
      <Spinner />
      <span>Loading directories...</span>
    </div>
    <div v-else-if="treeNodes.length === 0" class="tree-empty">
      <p>No directories yet. Create one to get started.</p>
      <Button size="sm" @click="handleCreateRoot">Create Directory</Button>
    </div>
    <div v-else class="tree-nodes">
      <DirectoryTreeNode
        v-for="node in treeNodes"
        :key="node.id"
        :node="node"
        :client-id="clientId"
        @create-child="handleCreateChild"
        @edit="handleEdit"
        @delete="handleDelete"
      />
      <div class="tree-actions">
        <Button size="sm" variant="ghost" @click="handleCreateRoot">
          + Create Root Directory
        </Button>
      </div>
    </div>

    <Modal v-model="showFormModal" :title="formTitle" size="md">
      <DirectoryForm
        :directory="editingDirectory"
        :client-id="clientId"
        :parent-id="parentIdForCreate"
        :is-edit="!!editingDirectory"
        @submit="handleFormSubmit"
        @cancel="showFormModal = false"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import Spinner from '@/shared/ui/Spinner.vue'
import Button from '@/shared/ui/Button.vue'
import Modal from '@/shared/ui/Modal.vue'
import DirectoryForm from './DirectoryForm.vue'
import DirectoryTreeNode from './DirectoryTreeNode.vue'
import type { Directory } from '@/features/workspace/types'

export interface DirectoryTreeProps {
  clientId: number
}

const props = defineProps<DirectoryTreeProps>()

const directoriesStore = useDirectoriesStore()

const showFormModal = ref(false)
const editingDirectory = ref<Directory | null>(null)
const parentIdForCreate = ref<number | null>(null)

const loading = computed(() => directoriesStore.loading)
const treeNodes = computed(() => directoriesStore.treeByClientId(props.clientId))

const formTitle = computed(() => {
  if (editingDirectory.value) {
    return 'Edit Directory'
  }
  if (parentIdForCreate.value) {
    return 'Create Subdirectory'
  }
  return 'Create Directory'
})

onMounted(async () => {
  await directoriesStore.fetchDirectories(props.clientId)
})

function handleCreateRoot() {
  editingDirectory.value = null
  parentIdForCreate.value = null
  showFormModal.value = true
}

function handleCreateChild(parentId: number) {
  editingDirectory.value = null
  parentIdForCreate.value = parentId
  showFormModal.value = true
}

function handleEdit(directory: Directory) {
  editingDirectory.value = directory
  parentIdForCreate.value = null
  showFormModal.value = true
}

async function handleDelete(directory: Directory) {
  if (confirm(`Are you sure you want to delete "${directory.title}"?`)) {
    await directoriesStore.deleteDirectory(directory.id)
    await directoriesStore.fetchDirectories(props.clientId)
  }
}

async function handleFormSubmit() {
  showFormModal.value = false
  editingDirectory.value = null
  parentIdForCreate.value = null
  await directoriesStore.fetchDirectories(props.clientId)
}
</script>

<style scoped>
.directory-tree {
  width: 100%;
}

.tree-loading,
.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: #666;
}

.tree-nodes {
  width: 100%;
}

.tree-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}
</style>

