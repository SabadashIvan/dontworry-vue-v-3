<template>
  <form @submit.prevent="submitForm">
    <FormField label="Title" :error="errors.title" required>
      <Input
        v-if="fields.title"
        id="title"
        :model-value="String(fields.title.value.value || '')"
        placeholder="Enter page title"
        :error="errors.title || undefined"
        @update:model-value="fields.title.value.value = $event"
        @blur="fields.title.touched.value = true"
      />
    </FormField>

    <FormField label="Slug" :error="errors.slug" hint="URL path (auto-generated if omitted)">
      <Input
        v-if="fields.slug"
        id="slug"
        :model-value="String(fields.slug.value.value || '')"
        placeholder="/page-path"
        :error="errors.slug || undefined"
        @update:model-value="fields.slug.value.value = $event"
        @blur="fields.slug.touched.value = true"
      />
    </FormField>

    <div class="form-actions">
      <Button type="button" variant="ghost" @click="$emit('cancel')">Cancel</Button>
      <Button type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ isEdit ? 'Update' : 'Create' }} Page
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@/shared/composables/useForm'
import { required, minLength, maxLength, pattern } from '@/shared/utils/validators'
import { compose } from '@/shared/utils/validators'
import Input from '@/shared/ui/Input.vue'
import FormField from '@/shared/ui/FormField.vue'
import Button from '@/shared/ui/Button.vue'
import type { Page, PageCreateDTO, PageUpdateDTO } from '@/features/workspace/types'

export interface PageFormProps {
  page?: Page | null
  websiteId: number
  isEdit?: boolean
}

const props = withDefaults(defineProps<PageFormProps>(), {
  page: null,
  isEdit: false,
})

const emit = defineEmits<{
  submit: [data: PageCreateDTO | PageUpdateDTO]
  cancel: []
}>()

// Slug validation (should start with /)
const slugPattern = /^\/[a-zA-Z0-9\-_/]*$/

// Initialize form
const { fields, values, errors, isSubmitting, isValid, submit: submitForm } = useForm({
  fields: [
    {
      name: 'title',
      initialValue: props.page?.title || '',
      validators: [compose(required('Title is required'), minLength(1), maxLength(255))],
      validateOnBlur: true,
    },
    {
      name: 'slug',
      initialValue: props.page?.slug || '',
      validators: [
        pattern(slugPattern, 'Slug must start with / and contain only letters, numbers, hyphens, underscores, and slashes'),
        maxLength(500),
      ],
    },
  ],
  onSubmit: async (formValues) => {
    const formData: PageCreateDTO | PageUpdateDTO = {
      website_id: props.websiteId,
      title: formValues.title as string,
      slug: (formValues.slug as string) || undefined,
    }

    emit('submit', formData)
  },
})
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>

