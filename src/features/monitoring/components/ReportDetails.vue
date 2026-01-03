<template>
  <div v-if="report" class="report-details">
    <div class="report-header">
      <h2>Report Details</h2>
      <Badge :variant="getStatusVariant(report)" size="md">
        {{ getStatusLabel(report) }}
      </Badge>
    </div>

    <div class="report-info">
      <Card>
        <h3>Check Information</h3>
        <dl class="info-list">
          <dt>Check:</dt>
          <dd>{{ report.check?.title || `Check #${report.check_id}` }}</dd>

          <dt v-if="report.check?.checker">Checker:</dt>
          <dd v-if="report.check?.checker">{{ report.check.checker.title }}</dd>

          <dt>Created:</dt>
          <dd>{{ formatDate(report.created_at) }}</dd>
        </dl>
      </Card>

      <Card v-if="report.page">
        <h3>Page Information</h3>
        <dl class="info-list">
          <dt>Page:</dt>
          <dd>{{ report.page.title }}</dd>

          <dt>Slug:</dt>
          <dd>{{ report.page.slug }}</dd>

          <dt v-if="report.page.website">Website:</dt>
          <dd v-if="report.page.website">{{ report.page.website.host }}</dd>
        </dl>
      </Card>
    </div>

    <Card v-if="report.report_fields && Object.keys(report.report_fields).length > 0">
      <h3>Report Fields</h3>
      <div class="report-fields">
        <div
          v-for="(field, key) in report.report_fields"
          :key="key"
          class="report-field"
          :class="{ 'report-field--colored': field.color }"
          :style="field.color ? { '--field-color': field.color } : undefined"
        >
          <div class="report-field-label">{{ field.label }}</div>
          <div class="report-field-value">
            <Badge v-if="field.color" :variant="getColorVariant(field.color)" size="sm">
              {{ formatValue(field.value) }}
            </Badge>
            <span v-else>{{ formatValue(field.value) }}</span>
          </div>
        </div>
      </div>
    </Card>

    <Card v-else>
      <h3>Raw Result</h3>
      <pre class="raw-result">{{ JSON.stringify(report.result, null, 2) }}</pre>
    </Card>
  </div>
  <div v-else class="no-report">
    <p>Report not found</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/shared/ui/Card.vue'
import Badge from '@/shared/ui/Badge.vue'
import type { Report } from '@/features/monitoring/types'

export interface ReportDetailsProps {
  report: Report | null
}

const props = defineProps<ReportDetailsProps>()

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getStatusLabel(report: Report): string {
  // Determine status based on report_fields or result
  if (report.report_fields) {
    // Look for common status fields
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField) {
      return String(statusField.value)
    }
  }
  return 'Completed'
}

function getStatusVariant(report: Report): 'success' | 'error' | 'warning' | 'info' | 'secondary' {
  if (report.report_fields) {
    const statusField = report.report_fields.status || report.report_fields.Status
    if (statusField?.color) {
      return getColorVariant(statusField.color)
    }
  }
  return 'info'
}

function getColorVariant(color: string): 'success' | 'error' | 'warning' | 'info' | 'secondary' {
  const lowerColor = color.toLowerCase()
  if (lowerColor.includes('green') || lowerColor.includes('success') || lowerColor === '#28a745') {
    return 'success'
  }
  if (lowerColor.includes('red') || lowerColor.includes('error') || lowerColor.includes('danger') || lowerColor === '#dc3545') {
    return 'error'
  }
  if (lowerColor.includes('yellow') || lowerColor.includes('warning') || lowerColor === '#ffc107') {
    return 'warning'
  }
  return 'info'
}
</script>

<style scoped>
.report-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.report-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.report-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.info-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 20px;
  margin: 0;
}

.info-list dt {
  font-weight: 600;
  color: #666;
}

.info-list dd {
  margin: 0;
  color: #333;
}

.report-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.report-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f9f9f9;
}

.report-field--colored {
  border-left: 4px solid var(--field-color, #007bff);
}

.report-field-label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.report-field-value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.raw-result {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  margin: 0;
}

.no-report {
  padding: 40px;
  text-align: center;
  color: #666;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
</style>

