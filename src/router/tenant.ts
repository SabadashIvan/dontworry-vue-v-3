/**
 * Tenant Routes
 * Routes accessible only on tenant subdomain
 */

import type { RouteRecordRaw } from 'vue-router'

const tenantRoutes: RouteRecordRaw[] = [
  {
    path: '/app',
    name: 'tenant-dashboard',
    component: () => import('@/views/TenantLayout.vue'),
    redirect: '/app/dashboard',
    meta: {
      requiresAuth: true,
      requiresTenant: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('@/views/ProjectsListView.vue'),
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('@/views/ProjectDetailView.vue'),
      },
      {
        path: 'websites',
        name: 'websites',
        component: () => import('@/views/WebsitesListView.vue'),
      },
      {
        path: 'checks',
        name: 'checks',
        component: () => import('@/views/ChecksListView.vue'),
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/ReportsListView.vue'),
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/views/NotificationsView.vue'),
      },
      {
        path: 'settings/profile',
        name: 'profile-settings',
        component: () => import('@/views/ProfileSettingsView.vue'),
      },
    ],
  },
]

export default tenantRoutes

