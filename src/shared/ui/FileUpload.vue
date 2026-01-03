<template>
  <div :class="wrapperClasses">
    <label v-if="label" :for="inputId" class="file-upload-label">
      {{ label }}
      <span v-if="required" class="file-upload-required">*</span>
    </label>
    <div
      :class="dropZoneClasses"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerFileInput"
    >
      <input
        :id="inputId"
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled || uploading"
        class="file-upload-input"
        @change="handleFileChange"
      />
      <div v-if="uploading" class="file-upload-progress">
        <Spinner />
        <span>{{ progressMessage || 'Uploading...' }}</span>
      </div>
      <div v-else-if="previewUrl || file" class="file-upload-preview">
        <div v-if="isImage" class="file-upload-image">
          <img :src="previewUrl || filePreviewUrl" :alt="file?.name" />
          <button
            v-if="!disabled"
            type="button"
            class="file-upload-remove"
            @click.stop="handleRemove"
            aria-label="Remove file"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <div v-else class="file-upload-file">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="file-upload-filename">{{ file?.name }}</span>
          <button
            v-if="!disabled"
            type="button"
            class="file-upload-remove"
            @click.stop="handleRemove"
            aria-label="Remove file"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div v-else class="file-upload-placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7 10L12 15L17 10"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12 15V3"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="file-upload-text">
          {{ placeholder || 'Click or drag file here' }}
        </span>
        <span v-if="hint" class="file-upload-hint">{{ hint }}</span>
      </div>
    </div>
    <div v-if="error || hint" class="file-upload-message">
      <span v-if="error" class="file-upload-error">{{ error }}</span>
      <span v-else-if="hint && !file" class="file-upload-hint-text">{{ hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Spinner from './Spinner.vue'

export interface FileUploadProps {
  modelValue: File | null
  label?: string
  placeholder?: string
  hint?: string
  error?: string | null
  accept?: string
  multiple?: boolean
  disabled?: boolean
  required?: boolean
  maxSize?: number // in bytes
  previewUrl?: string // for existing images
  uploading?: boolean
  progress?: number
  progressMessage?: string
  id?: string
}

const props = withDefaults(defineProps<FileUploadProps>(), {
  label: undefined,
  placeholder: undefined,
  hint: undefined,
  error: undefined,
  accept: undefined,
  multiple: false,
  disabled: false,
  required: false,
  maxSize: undefined,
  previewUrl: undefined,
  uploading: false,
  progress: undefined,
  progressMessage: undefined,
  id: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  'file-selected': [file: File]
  'file-removed': []
  'validation-error': [error: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const file = ref<File | null>(props.modelValue)
const filePreviewUrl = ref<string | undefined>(undefined)

const inputId = computed(() => props.id || `file-upload-${Math.random().toString(36).substr(2, 9)}`)

const wrapperClasses = computed(() => [
  'file-upload',
  {
    'file-upload--error': !!props.error,
    'file-upload--disabled': props.disabled,
    'file-upload--uploading': props.uploading,
  },
])

const dropZoneClasses = computed(() => [
  'file-upload-dropzone',
  {
    'file-upload-dropzone--dragging': isDragging.value,
    'file-upload-dropzone--has-file': !!file.value || !!props.previewUrl,
    'file-upload-dropzone--disabled': props.disabled || props.uploading,
  },
])

const isImage = computed(() => {
  if (props.previewUrl) return true
  if (!file.value) return false
  return file.value.type.startsWith('image/')
})

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  (newValue) => {
    file.value = newValue
      if (newValue && isImage.value) {
        createPreview(newValue)
      } else {
        filePreviewUrl.value = undefined
      }
  }
)

function createPreview(file: File) {
  if (filePreviewUrl.value) {
    URL.revokeObjectURL(filePreviewUrl.value)
  }
  filePreviewUrl.value = URL.createObjectURL(file)
}

function validateFile(selectedFile: File): string | true {
  // Check file size
  if (props.maxSize && selectedFile.size > props.maxSize) {
    const maxSizeMB = (props.maxSize / 1024 / 1024).toFixed(2)
    return `File size must be less than ${maxSizeMB} MB`
  }

  // Check file type if accept is specified
  if (props.accept) {
    const acceptedTypes = props.accept.split(',').map((t) => t.trim())
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
    const fileType = selectedFile.type

    const isAccepted = acceptedTypes.some((acceptType) => {
      if (acceptType.startsWith('.')) {
        return fileExtension === acceptType.toLowerCase()
      }
      if (acceptType.includes('/*')) {
        const baseType = acceptType.split('/')[0]
        return fileType.startsWith(baseType + '/')
      }
      return fileType === acceptType
    })

    if (!isAccepted) {
      return `File type not allowed. Accepted types: ${props.accept}`
    }
  }

  return true
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]

  if (!selectedFile) {
    return
  }

  const validation = validateFile(selectedFile)
  if (validation !== true) {
    emit('validation-error', validation)
    target.value = ''
    return
  }

  file.value = selectedFile
  emit('update:modelValue', selectedFile)
  emit('file-selected', selectedFile)

  if (isImage.value) {
    createPreview(selectedFile)
  }
}


function handleDrop(event: DragEvent) {
  isDragging.value = false

  if (props.disabled || props.uploading) return

  const droppedFile = event.dataTransfer?.files[0]
  if (!droppedFile) return

  const validation = validateFile(droppedFile)
  if (validation !== true) {
    emit('validation-error', validation)
    return
  }

  file.value = droppedFile
  emit('update:modelValue', droppedFile)
  emit('file-selected', droppedFile)

  if (isImage.value) {
    createPreview(droppedFile)
  }

  // Update input element
  if (fileInput.value) {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(droppedFile)
    fileInput.value.files = dataTransfer.files
  }
}

function triggerFileInput() {
  if (props.disabled || props.uploading) return
  fileInput.value?.click()
}

function handleRemove() {
  if (props.disabled || props.uploading) return

  file.value = null
  emit('update:modelValue', null)
  emit('file-removed')

  if (filePreviewUrl.value) {
    URL.revokeObjectURL(filePreviewUrl.value)
    filePreviewUrl.value = undefined
  }

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Cleanup preview URL on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (filePreviewUrl.value) {
    URL.revokeObjectURL(filePreviewUrl.value)
    filePreviewUrl.value = undefined
  }
})
</script>

<style scoped>
.file-upload {
  width: 100%;
  margin-bottom: 16px;
}

.file-upload-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.file-upload-required {
  color: #dc3545;
  margin-left: 2px;
}

.file-upload-dropzone {
  position: relative;
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #fafafa;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-upload-dropzone:hover:not(.file-upload-dropzone--disabled) {
  border-color: #007bff;
  background-color: #f0f7ff;
}

.file-upload-dropzone--dragging {
  border-color: #007bff;
  background-color: #e6f3ff;
}

.file-upload-dropzone--has-file {
  padding: 12px;
  min-height: auto;
}

.file-upload-dropzone--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-upload-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.file-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
}

.file-upload-text {
  font-size: 16px;
  font-weight: 500;
}

.file-upload-hint {
  font-size: 14px;
  color: #999;
}

.file-upload-preview {
  width: 100%;
  position: relative;
}

.file-upload-image {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.file-upload-image img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  display: block;
}

.file-upload-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.file-upload-filename {
  flex: 1;
  font-size: 14px;
  color: #333;
  text-align: left;
}

.file-upload-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-upload-file .file-upload-remove {
  position: static;
  background: #f5f5f5;
  color: #666;
}

.file-upload-remove:hover {
  background: rgba(0, 0, 0, 0.9);
}

.file-upload-file .file-upload-remove:hover {
  background: #e0e0e0;
}

.file-upload-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
}

.file-upload-message {
  margin-top: 6px;
  font-size: 14px;
  min-height: 20px;
}

.file-upload-error {
  color: #dc3545;
}

.file-upload-hint-text {
  color: #666;
}

.file-upload--error .file-upload-dropzone {
  border-color: #dc3545;
}
</style>

