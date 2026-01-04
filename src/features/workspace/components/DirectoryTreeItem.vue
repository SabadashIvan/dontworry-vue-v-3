<template>
  <div class="directory-item" :class="{ active: activeDirectoryId === node.id }">
    <div class="directory-header">
      <router-link :to="`/directories/${node.id}`" class="directory-link">
        <span class="directory-icon">📂</span>
        <span class="directory-title">{{ node.title }}</span>
      </router-link>
      <span
        v-if="hasChildren || hasWebsites"
        class="expand-icon"
        @click.stop="$emit('toggle-directory', node.id)"
      >
        {{ expandedDirectories.has(node.id) ? '−' : '+' }}
      </span>
    </div>

    <div v-if="expandedDirectories.has(node.id)" class="directory-content">
      <!-- Nested directories -->
      <div v-if="node.children && node.children.length > 0" class="nested-directories">
        <DirectoryTreeItem
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :expanded-directories="expandedDirectories"
          :active-directory-id="activeDirectoryId"
          :websites-by-directory="websitesByDirectory"
          @toggle-directory="$emit('toggle-directory', $event)"
          @website-click="$emit('website-click', $event)"
        />
      </div>

      <!-- Websites in this directory -->
      <template v-if="websitesByDirectory[node.id]">
        <div v-if="websitesByDirectory[node.id]!.length === 0" class="no-websites">
          <span>No websites</span>
        </div>
        <div v-else class="websites-list">
          <div
            v-for="website in websitesByDirectory[node.id]"
            :key="website.id"
            class="website-item"
            @click="$emit('website-click', website)"
          >
            <span class="website-icon">🌐</span>
            <span class="website-host">{{ website.host }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Website } from '@/features/workspace/types'

interface DirectoryNode {
  id: number
  title: string
  children?: DirectoryNode[]
}

export interface DirectoryTreeItemProps {
  node: DirectoryNode
  expandedDirectories: Set<number>
  activeDirectoryId: number | null
  websitesByDirectory: Record<number, Website[]>
}

const props = defineProps<DirectoryTreeItemProps>()

defineEmits<{
  'toggle-directory': [directoryId: number]
  'website-click': [website: Website]
}>()

const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

const hasWebsites = computed(() => {
  return (
    props.websitesByDirectory[props.node.id] !== undefined &&
    props.websitesByDirectory[props.node.id]!.length > 0
  )
})
</script>

<style scoped>
.directory-item {
  margin-bottom: 2px;
}

.directory-item.active .directory-header {
  background: rgba(255, 255, 255, 0.15);
}

.directory-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.directory-link {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s;
}

.directory-link:hover {
  opacity: 0.8;
}

.directory-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.directory-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.expand-icon {
  font-size: 18px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.7);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.expand-icon:hover {
  color: rgba(255, 255, 255, 0.9);
}

.directory-content {
  margin-left: 20px;
  margin-top: 2px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.nested-directories {
  margin-bottom: 4px;
}

.no-websites {
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  font-style: italic;
}

.websites-list {
  margin-bottom: 4px;
}

.website-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  user-select: none;
}

.website-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.website-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.website-host {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

