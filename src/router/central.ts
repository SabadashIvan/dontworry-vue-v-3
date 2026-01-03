/**
 * Central Routes
 * Routes accessible on central domain (no tenant required)
 */

import type { RouteRecordRaw } from 'vue-router'

const centralRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: {
      requiresAuth: false,
      requiresCentral: true,
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: {
      requiresAuth: false,
      requiresCentral: true,
    },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: {
      requiresAuth: false,
      requiresCentral: true,
    },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: {
      requiresAuth: false,
      requiresCentral: true,
    },
  },
  {
    path: '/tenants',
    name: 'tenants',
    component: () => import('@/views/TenantListView.vue'),
    meta: {
      requiresAuth: true,
      requiresCentral: true,
    },
  },
  {
    path: '/tenants/select',
    name: 'tenant-select',
    component: () => import('@/views/TenantSelectView.vue'),
    meta: {
      requiresAuth: true,
      requiresCentral: true,
    },
  },
  {
    path: '/invite/:token',
    name: 'invitation',
    component: () => import('@/views/InvitationView.vue'),
    meta: {
      requiresAuth: false,
      requiresCentral: true,
    },
  },
]

export default centralRoutes

