# Pinia Stores (Vue 3 SPA) for DontWorry

This document specifies a Pinia store layer that matches the backend modules and behaviors.

## 1) Design goals

1. **Backend-aligned**: store actions mirror API endpoints in `api.md`.
2. **Predictable caching**: normalize entities by `id` and keep list caches separate from detail caches.
3. **Explicit tenancy**: tenant-scoped stores must reset on tenant subdomain change.
4. **Stateless API client**: stores do not embed axios; they call a shared `apiClient`.

## 2) Store inventory

### 2.1 Core
- `useAuthStore` (central): token, central user, auth lifecycle.
- `useTenantContextStore` (core): selected tenant metadata, derived `tenantSubdomain`, helper redirects.
- `useUiStore` (core): global toasts, confirm dialogs, loading overlays.

### 2.2 Central domain
- `useTenantsStore` (central): list/create/update tenants, select tenant.
- `useTenantInvitationsStore` (mixed):
  - central operations: `accept(token)`, `publicView(token)`
  - tenant operations (requires tenant subdomain): `index()`, `store(email)`, `destroy(id)`
- `useSubscriptionStore` (public/central): tariffs cache.
- `useCentralProfileStore` (central): `/v1/users/me/central`.

### 2.3 Tenant domain
Workspace:
- `useProjectsStore` (Projects = Clients)
- `useDirectoriesStore`
- `useWebsitesStore`
- `usePagesStore`

Monitoring:
- `useCheckersStore` (central checkers, but accessed via tenant endpoint)
- `useChecksStore`
- `useReportsStore`

Notifications:
- `useNotificationsStore`
- `useNotificationPreferencesStore`
- `useTelegramStore`

RBAC:
- `useRolesStore`
- `usePermissionsStore`
- `useUserRolesStore`

## 3) State shapes (recommended)

### 3.1 Common helpers

**Normalized entity map** (by id):
```ts
type EntityMap<T> = Record<number, T>
```

**List cache key** (captures server params):
```ts
type ListKey = string // e.g. JSON.stringify({resource:"projects", page:1, perPage:20, filters:{...}})
```

**List cache entry**:
```ts
type ListCache = {
  ids: number[]
  paginator?: Paginator
  fetchedAt: number
}
```

### 3.2 Auth store
```ts
state: {
  token: string | null
  centralUser: CentralUser | null
  isReady: boolean
}

actions:
- register(payload)
- login(payload)
- logout()
- hydrateFromStorage()
```

Notes:
- The backend returns `token` on login/register and `logout` deletes the current access token; token auth is the most compatible approach.

### 3.3 Tenant context store
```ts
state: {
  tenant: { id: string; title: string; domain: string } | null
  centralDomain: string
}

getters:
- tenantSubdomain(): string | null // derived from window.location.host
- isTenantHost(): boolean

actions:
- setTenantFromTenantsList(tenant)
- resetTenantContext()
```

### 3.4 Projects (Clients) store
```ts
state: {
  byId: EntityMap<Project>
  lists: Record<ListKey, ListCache>
  loading: boolean
  error: ApiError | null
}

actions:
- fetchList(params)
- fetchOne(id)
- create(dto) // multipart if avatar
- update(id, dto) // multipart if avatar
- delete(id)
- deleteAvatar(id)
```

Backend nuance:
- `GET /workspace/clients` appends `avatar`.
- `POST/PUT /workspace/clients` return the model without the appended avatar field; if the UI needs updated avatar URLs immediately, refetch the item.

### 3.5 Directories store
```ts
state: {
  byId: EntityMap<Directory>
  lists: Record<ListKey, ListCache>
}

actions:
- fetchList(params)
- create(dto)
- update(id, dto)
- delete(id)
```

UI helpers (derived, client-side):
- `treeByClientId(clientId)` build a parent/child hierarchy from `parent_id`.

### 3.6 Websites store
```ts
state: {
  byId: EntityMap<Website>
  lists: Record<ListKey, ListCache>
}

actions:
- fetchList(params)
- fetchByDirectory(directoryId)
- create(dto)
- update(id, dto)
- delete(id)
```

Backend nuance:
- On create, if `parse_pages=true`, the backend dispatches a tenant job (`ParseWebsiteJob`). Pages may appear later.

### 3.7 Pages store
```ts
state: {
  byId: EntityMap<Page>
  lists: Record<ListKey, ListCache>
}

actions:
- fetchList(params)
- create(dto)
- update(id, dto)
- delete(id)
```

UI helpers:
- build `fullUrl` on the client from `website.host` + `page.slug` if the backend response does not include computed fields.

### 3.8 Checkers store
```ts
state: {
  byId: EntityMap<Checker>
  lists: Record<ListKey, ListCache>
}

actions:
- fetchList(params)
- fetchOne(id) // expects `config_fields` and `result_fields` appended
- create(dto)
- update(id, dto)
- delete(id)
```

Backend nuance:
- Checkers are stored centrally but managed via tenant endpoint `v1/monitoring/checkers`.
- `GET /checkers/{id}` appends:
  - `config_fields`: object keyed by field name, including cron + (sometimes) basic fields.
  - `result_fields`: object keyed by result field name with labels.

### 3.9 Checks store
```ts
state: {
  byId: EntityMap<Check>
  lists: Record<ListKey, ListCache>
  runHistoryByCheckId: Record<number, JobDTO[]>
}

actions:
- fetchList(params) // controller appends `checker` relation-like attribute
- fetchOne(id)      // controller appends `checker`
- create(dto)
- update(id, dto)
- delete(id)
- run(id)
- fetchRunHistory(params)
- fetchItemRunHistory(id, params)
```

Backend nuance:
- `GET /checks` and `GET /checks/{id}` append `checker`.
- `run-history` endpoints add `runHistory` with Horizon job info (Redis-based).
- The Check model currently defines an accessor for `config` that returns a config DTO class reference, not the stored JSON. If the UI requires editing stored `config`, validate the actual API output and be prepared to adjust backend behavior.

### 3.10 Reports store
```ts
state: {
  byId: EntityMap<Report>
  lists: Record<ListKey, ListCache>
}

actions:
- fetchList(params) // index appends `report_fields`
- fetchOne(id)      // show appends `report_fields`
- delete(id)
```

Backend nuance:
- `report_fields` is computed on backend and includes formatted values and optional color tokens.

### 3.11 Notifications store
```ts
state: {
  unreadCount: number
  unreadList: { ids: number[]; paginator?: Paginator } | null
}

actions:
- fetchAll()
- fetchUnread(params)
- fetchUnreadCount()
- markAsRead(id)
- markAllAsRead()
```

### 3.12 Notification preferences store
```ts
state: {
  matrix: Record<string, any> | null
}

actions:
- fetchMatrix()
- updateMatrix(preferences)
- updateSingle({group, channel, enabled, settings})
```

### 3.13 Telegram store
```ts
state: {
  connectionLink: string | null
}

actions:
- getConnectionLink()
- connect(token)
- disconnect()
```

## 4) Store lifecycle and tenancy boundaries

1. Central stores (`auth`, `tenants`, `central profile`, `tariffs`) must survive tenant switches.
2. Tenant stores (workspace/monitoring/notifications) must be **reset** when:
   - user logs out
   - browser navigates to another tenant subdomain

Recommended implementation:
- `useTenantContextStore` emits an event or exposes `resetTenantStores()` which calls `.$reset()` on tenant stores.

## 5) API error handling in stores

Standardize on a single error shape in the client:
```ts
type ApiError = {
  status: number
  message: string
  errors?: any
}
```

Rules:
- 401 from tenant endpoints can be:
  - not logged in / token invalid
  - user blocked
  - tenant blocked
  - missing tenant user mapping
- 403 typically indicates policy/permission restrictions.
- 422 is validation.

Stores should not render errors; they should return errors and let the view layer decide.
