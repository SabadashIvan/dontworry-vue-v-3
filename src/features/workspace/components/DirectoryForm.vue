<template>
  <form @submit.prevent="submitForm">
    <FormField label="Title" :error="errors.title" required>
      <Input
        v-if="fields.title"
        id="title"
        :model-value="String(fields.title.value.value || '')"
        placeholder="Enter directory title"
        :error="errors.title || undefined"
        @update:model-value="fields.title.value.value = $event"
        @blur="fields.title.touched.value = true"
      />
    </FormField>

    <FormField
      v-if="!isEdit && fields.parent_id"
      label="Parent Directory"
      :error="errors.parent_id"
      hint="Optional parent directory for nesting"
    >
      <Select
        id="parent_id"
        :model-value="(fields.parent_id.value.value as number | null | undefined) ?? (undefined as unknown as number)"
        :options="parentOptions"
        placeholder="Select parent directory (optional)"
        :error="errors.parent_id || undefined"
        @update:model-value="fields.parent_id.value.value = ($event === 0 ? null : ($event ?? null)) as unknown"
      />
    </FormField>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Directory
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useForm } from '@/shared/composables/useForm'
import { required, minLength, maxLength } from '@/shared/utils/validators'
import { compose } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import Select from '@/shared/ui/Select.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import { useDirectoriesStore } from '@/stores/workspace/directories'
import type { Directory, DirectoryCreateDTO, DirectoryUpdateDTO } from '@/features/workspace/types'
import type { SelectOption } from '@/shared/ui/Select.vue'

export interface DirectoryFormProps {
  directory?: Directory | null
  clientId: number
  parentId?: number | null
  isEdit?: boolean
}

const props = withDefaults(defineProps<DirectoryFormProps>(), {
  directory: null,
  parentId: null,
  isEdit: false,
})

const emit = defineEmits<{
  submit: [data: DirectoryCreateDTO | DirectoryUpdateDTO]
  cancel: []
}>()

const directoriesStore = useDirectoriesStore()

// Initialize form
  const { fields, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'title',
      initialValue: props.directory?.title || '',
      validators: [compose(required('Title is required'), minLength(1), maxLength(255))],
      validateOnBlur: true,
    },
    {
      name: 'parent_id',
      initialValue: props.isEdit ? props.directory?.parent_id ?? null : props.parentId ?? null,
    },
  ],
  onSubmit: async (formValues) => {
    const formData: DirectoryCreateDTO | DirectoryUpdateDTO = {
      client_id: props.clientId,
      title: formValues.title as string,
      parent_id: (formValues.parent_id as number) || null,
    }

    emit('submit', formData)
  },
})

// Parent directory options (exclude current directory and its children to prevent cycles)
const parentOptions = computed<SelectOption[]>(() => {
  const directories = Object.values(directoriesStore.byId).filter(
    (dir) => dir.client_id === props.clientId && dir.id !== props.directory?.id
  )

  const options: SelectOption[] = directories.map((dir) => ({
    label: dir.title,
    value: dir.id,
  }))

  // Add "None" option if not in edit mode
  if (!props.isEdit) {
    return [{ label: 'None (Root)', value: 0 }, ...options]
  }
  return options
})

// Load directories if needed
if (Object.keys(directoriesStore.byId).length === 0) {
  void directoriesStore.fetchDirectories(props.clientId)
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

