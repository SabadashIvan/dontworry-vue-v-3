<template>
  <div :class="containerClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  fluid?: boolean
}

const props = withDefaults(defineProps<ContainerProps>(), {
  size: 'lg',
  fluid: false,
})

const containerClasses = computed(() => [
  'container',
  {
    'container--fluid': props.fluid,
    [`container--${props.size}`]: !props.fluid,
  },
])
</script>

<style scoped>
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
}

.container--sm {
  max-width: 640px;
}

.container--md {
  max-width: 768px;
}

.container--lg {
  max-width: 1024px;
}

.container--xl {
  max-width: 1280px;
}

.container--fluid {
  max-width: 100%;
}
</style>

