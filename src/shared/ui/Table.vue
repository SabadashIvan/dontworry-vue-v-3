<template>
  <div class="table-wrapper">
    <table :class="tableClasses">
      <thead v-if="columns.length > 0">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="getHeaderClasses(column)"
            :style="column.headerStyle"
            @click="handleSort(column)"
          >
            <div class="table-header-content">
              <span>{{ column.label }}</span>
              <span v-if="column.sortable" class="table-sort-icon">
                <svg
                  v-if="sortKey !== column.key"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M3 4.5L6 1.5L9 4.5M3 7.5L6 10.5L9 7.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg
                  v-else-if="sortOrder === 'asc'"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M3 4.5L6 1.5L9 4.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg
                  v-else
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M3 7.5L6 10.5L9 7.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading" class="table-loading">
          <td :colspan="columns.length" class="table-loading-cell">
            <Spinner />
            <span>Loading...</span>
          </td>
        </tr>
        <tr v-else-if="data.length === 0" class="table-empty">
          <td :colspan="columns.length" class="table-empty-cell">
            <slot name="empty">
              <span>{{ emptyText }}</span>
            </slot>
          </td>
        </tr>
        <tr v-else v-for="(row, rowIndex) in data" :key="getRowKey(row, rowIndex)">
          <td
            v-for="column in columns"
            :key="column.key"
            :class="getCellClasses(column)"
            :style="column.cellStyle"
          >
            <slot
              :name="`cell-${column.key}`"
              :row="row"
              :column="column"
              :value="getCellValue(row, column)"
            >
              {{ String(getCellValue(row, column) ?? '') }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="showPagination && pagination" class="table-pagination">
      <slot name="pagination" :pagination="pagination">
        <!-- Default pagination can be added here if needed -->
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Spinner from './Spinner.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  headerStyle?: Record<string, string>
  cellStyle?: Record<string, string>
  formatter?: (value: unknown, row: Record<string, unknown>) => string
}

export interface TablePagination {
  page: number
  perPage: number
  total: number
}

export interface TableProps {
  columns: TableColumn[]
  data: Record<string, unknown>[]
  loading?: boolean
  emptyText?: string
  sortable?: boolean
  defaultSortKey?: string
  defaultSortOrder?: 'asc' | 'desc'
  pagination?: TablePagination
  showPagination?: boolean
  rowKey?: string | ((row: Record<string, unknown>) => string | number)
}

const props = withDefaults(defineProps<TableProps>(), {
  loading: false,
  emptyText: 'No data available',
  sortable: true,
  defaultSortKey: undefined,
  defaultSortOrder: 'asc',
  pagination: undefined,
  showPagination: false,
  rowKey: undefined,
})

const emit = defineEmits<{
  sort: [key: string, order: 'asc' | 'desc']
}>()

const sortKey = ref<string | undefined>(props.defaultSortKey)
const sortOrder = ref<'asc' | 'desc'>(props.defaultSortOrder)

const tableClasses = computed(() => [
  'table',
  {
    'table--loading': props.loading,
  },
])

function getHeaderClasses(column: TableColumn) {
  return [
    'table-header',
    {
      'table-header--sortable': column.sortable && props.sortable,
      'table-header--sorted': sortKey.value === column.key,
      [`table-header--${column.align || 'left'}`]: true,
    },
  ]
}

function getCellClasses(column: TableColumn) {
  return [`table-cell--${column.align || 'left'}`]
}

function getCellValue(row: Record<string, unknown>, column: TableColumn): unknown {
  const value = row[column.key]
  if (column.formatter) {
    return column.formatter(value, row)
  }
  return value ?? ''
}

function getRowKey(row: Record<string, unknown>, index: number): string | number {
  if (props.rowKey) {
    if (typeof props.rowKey === 'function') {
      return props.rowKey(row)
    }
    const value = row[props.rowKey]
    if (typeof value === 'string' || typeof value === 'number') {
      return value
    }
    return String(value ?? index)
  }
  return index
}

function handleSort(column: TableColumn) {
  if (!column.sortable || !props.sortable) {
    return
  }

  if (sortKey.value === column.key) {
    // Toggle order
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = column.key
    sortOrder.value = 'asc'
  }

  emit('sort', sortKey.value, sortOrder.value)
}
</script>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.table-header {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #333;
  background-color: #f8f9fa;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.table-header--center {
  text-align: center;
}

.table-header--right {
  text-align: right;
}

.table-header--sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.table-header--sortable:hover {
  background-color: #e9ecef;
}

.table-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-sort-icon {
  display: flex;
  align-items: center;
  color: #999;
  flex-shrink: 0;
}

.table-header--sorted .table-sort-icon {
  color: #007bff;
}

.table tbody tr {
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s ease;
}

.table tbody tr:hover {
  background-color: #f8f9fa;
}

.table tbody tr:last-child {
  border-bottom: none;
}

.table tbody td {
  padding: 12px 16px;
  font-size: 14px;
  color: #333;
}

.table-cell--left {
  text-align: left;
}

.table-cell--center {
  text-align: center;
}

.table-cell--right {
  text-align: right;
}

.table-loading,
.table-empty {
  border-bottom: none;
}

.table-loading-cell,
.table-empty-cell {
  padding: 40px 16px;
  text-align: center;
  color: #999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

