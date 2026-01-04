<template>
  <div class="directories-grid">
    <div v-if="loading" class="grid-loading">
      <Spinner />
      <span>Loading directories...</span>
    </div>
    <div v-else-if="rootDirectories.length === 0" class="grid-empty">
      <p>No directories yet. Create one to get started.</p>
    </div>
    <div v-else class="grid-container">
      <Card
        v-for="directory in rootDirectories"
        :key="directory.id"
        class="directory-card"
        @click="handleDirectoryClick(directory)"
      >
        <div class="directory-card-content">
          <div class="directory-icon">📂</div>
          <h3 class="directory-title">{{ directory.title }}</h3>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import Card from '@/shared/ui/Card.vue'
import Spinner from '@/shared/ui/Spinner.vue'
import type { Directory } from '@/features/workspace/types'

export interface DirectoriesGridProps {
  clientId: number
}

const props = defineProps<DirectoriesGridProps>()

const emit = defineEmits<{
  'directory-click': [directory: Directory]
}>()

const router = useRouter()
const directoriesStore = useDirectoriesStore()

const loading = computed(() => directoriesStore.loading)

const rootDirectories = computed<Directory[]>(() => {
  return Object.values(directoriesStore.byId).filter(
    (dir) => dir.client_id === props.clientId && dir.parent_id === null
  )
})

onMounted(async () => {
  await directoriesStore.fetchDirectories(props.clientId)
})

function handleDirectoryClick(directory: Directory) {
  emit('directory-click', directory)
  router.push(`/directories/${directory.id}`)
}
</script>

<style scoped>
.directories-grid {
  width: 100%;
}

.grid-loading,
.grid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: #666;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.directory-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.directory-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.directory-card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.directory-icon {
  font-size: 48px;
}

.directory-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}
</style>
