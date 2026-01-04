/**
 * Tenant Routes
 * Routes accessible only on tenant subdomain
 */

import type { RouteRecordRaw } from 'vue-router'

const tenantRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'tenant-layout',
    component: () => import('@/views/TenantLayout.vue'),
    redirect: '/dashboard',
    meta: {
      requiresAuth: true,
      requiresTenant: true,
    },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: {
          requiresAuth: true,
          requiresTenant: true,
        },
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
        path: 'directories/:id',
        name: 'directory-detail',
        component: () => import('@/views/DirectoryDetailView.vue'),
      },
      {
        path: 'websites',
        name: 'websites',
        component: () => import('@/views/WebsitesListView.vue'),
      },
      {
        path: 'websites/:id',
        name: 'website-detail',
        component: () => import('@/views/WebsiteDetailView.vue'),
      },
      {
        path: 'checks',
        name: 'checks',
        component: () => import('@/views/ChecksListView.vue'),
      },
      {
        path: 'checks/:id',
        name: 'check-detail',
        component: () => import('@/views/CheckDetailView.vue'),
      },
      {
        path: 'checks/:id/history',
        name: 'check-history',
        component: () => import('@/views/CheckDetailView.vue'),
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

