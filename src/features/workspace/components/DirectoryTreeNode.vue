<template>
  <div class="directory-node" :style="{ paddingLeft: `${depth * 20}px` }">
    <div class="node-content">
      <div class="node-info">
        <span class="node-icon">📁</span>
        <span class="node-title">{{ node.title }}</span>
      </div>
      <div class="node-actions">
        <Button size="sm" variant="ghost" @click="$emit('create-child', node.id)">+</Button>
        <Button size="sm" variant="ghost" @click="$emit('edit', node)">Edit</Button>
        <Button size="sm" variant="danger" @click="$emit('delete', node)">Delete</Button>
      </div>
    </div>
    <div v-if="node.children && node.children.length > 0" class="node-children">
      <DirectoryTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :client-id="clientId"
        :depth="depth + 1"
        @create-child="$emit('create-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/shared/ui/Button.vue'
import type { Directory } from '@/features/workspace/types'

interface DirectoryNode extends Directory {
  children?: DirectoryNode[]
}

export interface DirectoryTreeNodeProps {
  node: DirectoryNode
  clientId: number
  depth?: number
}

const props = withDefaults(defineProps<DirectoryTreeNodeProps>(), {
  depth: 0,
})

defineEmits<{
  'create-child': [parentId: number]
  edit: [directory: Directory]
  delete: [directory: Directory]
}>()
</script>

<style scoped>
.directory-node {
  margin-bottom: 8px;
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.node-icon {
  font-size: 18px;
}

.node-title {
  font-weight: 500;
  color: #333;
}

.node-actions {
  display: flex;
  gap: 4px;
}

.node-children {
  margin-top: 8px;
}
</style>

