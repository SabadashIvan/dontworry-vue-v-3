<template>
  <form @submit.prevent="handleSubmit">
    <FormField label="Title" :error="errors.title" required>
      <Input
        v-if="fields.title"
        id="title"
        :model-value="String(fields.title.value.value || '')"
        placeholder="Enter project title"
        :error="errors.title || undefined"
        @update:model-value="fields.title.value.value = $event"
        @blur="fields.title.touched.value = true"
      />
    </FormField>

    <FormField label="Description" :error="errors.description" hint="Optional description for the project">
      <Input
        v-if="fields.description"
        id="description"
        :model-value="String(fields.description.value.value || '')"
        type="textarea"
        :rows="4"
        placeholder="Enter project description"
        :error="errors.description || undefined"
        @update:model-value="fields.description.value.value = $event"
      />
    </FormField>

    <FormField label="Avatar" :error="errors.avatar" hint="Optional project avatar image">
      <FileUpload
        v-model="avatarFile"
        :preview-url="previewUrl"
        accept="image/*"
        :max-size="5 * 1024 * 1024"
        :error="errors.avatar || null"
        @file-selected="handleFileSelected"
      />
    </FormField>

    <FormField label="Tags" :error="errors.tags" hint="Comma-separated tags for categorization">
      <Input
        id="tags"
        v-model="tagsInput"
        placeholder="e.g. e-commerce, client, production"
        :error="errors.tags || undefined"
        @blur="handleTagsBlur"
      />
    </FormField>

    <div v-if="tags.length > 0" class="tags-display">
      <Badge v-for="(tag, index) in tags" :key="index" variant="secondary" size="sm">
        {{ tag }}
        <button type="button" class="tag-remove" @click="removeTag(index)">×</button>
      </Badge>
    </div>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Project
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from '@/shared/composables/useForm'
import { required, minLength, maxLength } from '@/shared/utils/validators'
import { compose } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import FileUpload from '@/shared/ui/FileUpload.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import Badge from '@/shared/ui/Badge.vue'
import type { Client, ClientCreateDTO, ClientUpdateDTO } from '@/features/workspace/types'

export interface ProjectFormProps {
  client?: Client | null
  isEdit?: boolean
}

const props = withDefaults(defineProps<ProjectFormProps>(), {
  client: null,
  isEdit: false,
})

const emit = defineEmits<{
  submit: [data: ClientCreateDTO | ClientUpdateDTO, avatarFile?: File]
  cancel: []
}>()

const avatarFile = ref<File | null>(null)
const tagsInput = ref('')
const tags = ref<string[]>([])

const previewUrl = computed(() => {
  if (props.client?.avatar) {
    return props.client.avatar
  }
  return undefined
})

// Initialize form
const { fields, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'title',
      initialValue: props.client?.title || '',
      validators: [compose(required('Title is required'), minLength(3), maxLength(255))],
      validateOnBlur: true,
    },
    {
      name: 'description',
      initialValue: props.client?.description || '',
      validators: [maxLength(1000)],
    },
  ],
  onSubmit: async (formValues) => {
    const formData: ClientCreateDTO | ClientUpdateDTO = {
      title: formValues.title as string,
      description: (formValues.description as string) || undefined,
      tags: tags.value.length > 0 ? tags.value : undefined,
    }

    emit('submit', formData, avatarFile.value || undefined)
  },
})

// Initialize tags from client
if (props.client?.tags && props.client.tags.length > 0) {
  tags.value = [...props.client.tags]
  tagsInput.value = props.client.tags.join(', ')
}

function handleTagsBlur() {
  parseTags()
}

function parseTags() {
  const parsed = tagsInput.value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.substring(0, 50)) // Max length per tag

  tags.value = [...new Set(parsed)] // Remove duplicates
  tagsInput.value = tags.value.join(', ')
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
  tagsInput.value = tags.value.join(', ')
}

function handleFileSelected(file: File) {
  avatarFile.value = file
}

async function handleSubmit() {
  await submitForm()
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tag-remove {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 4px;
  font-size: 16px;
  line-height: 1;
}

.tag-remove:hover {
  opacity: 0.7;
}
</style>

