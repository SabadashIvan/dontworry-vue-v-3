# Frontend Architecture (Vue 3 SPA) aligned to DontWorry Backend

This document defines a Vue 3 SPA architecture that matches the backend contract and tenancy/auth mechanics found in the provided Laravel codebase.

## 1) Product boundaries and terminology

The backend entities (and recommended UI naming) map as follows:

- **Tenant** (central DB, stancl/tenancy): the isolated workspace boundary, addressed by **subdomain**.
- **CentralUser** (central DB): the account that authenticates via Sanctum and “enters” tenants.
- **Tenant User** (tenant DB): per-tenant user record linked to the central user (`central_user_id`).

Workspace module:
- **Client** → recommended UI label: **Project** (what you described as “project”).
- **Directory** → folder-like hierarchy inside a Project.
- **Website** → a host/domain (`host`) associated to a Project (and optionally a Directory).
- **Page** → a page within a Website (`slug`), used as a target for checks.

Monitoring module:
- **Checker** → definition of a checker type (central DB), e.g. PageSpeed, HTTPS, W3C validator.
- **Check** → per-tenant configured check bound to pages; can be scheduled via `cron` in config.
- **Report** → check execution result stored per page.

Notifications module:
- Notifications are stored per-tenant.
- Preferences are stored centrally per (central_user_id, tenant_id).

Sales module:
- Tariffs are defined in `TariffType` and drive feature limits (e.g., max websites, allowed checkers, allowed channels).

## 2) Runtime topology: central vs tenant subdomain

### 2.1 Why subdomain matters
Tenant initialization is done by `InitializeTenancyBySubdomain`. That means the backend determines the tenant purely from the request host.

Therefore:
- Any call to a tenant-scoped endpoint (Workspace, Monitoring, Notifications, tenant user profile/roles) must go to a **tenant subdomain**.
- Any call to a central endpoint (auth, tenants CRUD, invitation accept, tariffs, OAuth provider listing) can be made to the **central domain**.

### 2.2 Recommended hosting model for the SPA
Build the SPA once and serve it for:
- the **central domain** (authentication + tenant selection)
- every **tenant subdomain** (actual workspace: projects, websites, checks, reports)

At runtime the SPA determines whether it is running on a tenant subdomain by inspecting `window.location.hostname`.

## 3) Core user flows

### 3.1 Registration / login (central domain)
1. User registers or logs in via:
   - `POST /v1/users/auth/register`
   - `POST /v1/users/auth/login`
2. Backend returns `{ user, token }`.
3. SPA stores the token and treats the session as authenticated.
4. SPA loads available tenants via `GET /v1/tenants`.
5. User selects a tenant.
6. SPA redirects the browser to `https://{tenant_subdomain}.{base_domain}`.

### 3.2 Tenant-scoped workspace (tenant subdomain)
Once on tenant subdomain:
- All tenant routes use `auth:sanctum` + `tenant:init`.
- `tenant:init` maps the authenticated CentralUser to tenant `auth('tenant')`.

The SPA then uses:
- Workspace endpoints (`/v1/workspace/*`)
- Monitoring endpoints (`/v1/monitoring/*`)
- Notifications endpoints (`/v1/notifications/*`)

### 3.3 Invitation flow
- Public view of invitation details:
  - `GET /v1/tenants/invitations/view/{token}`
- Accept invitation (authenticated):
  - `POST /v1/tenants/invitations/accept` with `{ "token": "..." }`

Note: accepting invitation does not require `tenant:init` (it is a central-domain operation).

### 3.4 Project creation flow (Client)
Tenant user creates a “Project” via:
- `POST /v1/workspace/clients` (multipart supported for avatar)

After Project exists, user can:
- create directories
- add websites
- parse pages automatically (optional)
- create checks bound to pages
- run checks and view reports

## 4) Frontend codebase structure

Recommended Vue 3 + TypeScript SPA structure:

```
src/
  app/                     # bootstrap + global providers
    main.ts
    router/
    plugins/
  core/                    # cross-cutting infra (no feature logic)
    api/
    auth/
    tenancy/
    errors/
    types/
  features/
    auth/
    tenants/
    workspace/
    monitoring/
    notifications/
    sales/
  shared/
    ui/                    # base UI components
    components/
    composables/
    utils/
  stores/                  # Pinia stores (thin facade around services)
  views/                   # route-level pages
```

Principles:
- **Feature isolation**: feature folders own their routes, UI, and small domain services.
- **Single API client**: one axios/fetch wrapper under `core/api`.
- **Stores are orchestration**: API calls + caching + pagination; no UI logic.

## 5) Routing model

### 5.1 Central routes
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/tenants/select` (tenant switcher)
- `/invite/:token` (invitation view; may live centrally)

### 5.2 Tenant routes
- `/app` (dashboard)
- `/projects` (Clients list)
- `/projects/:clientId` (project overview)
- `/projects/:clientId/directories`
- `/projects/:clientId/websites`
- `/websites/:websiteId/pages`
- `/checks` (checks list)
- `/checks/:checkId`
- `/reports` (reports list)
- `/notifications`
- `/settings/profile`

Implement router guards:
- `requiresAuth`: token present and “me” can be loaded
- `requiresTenant`: hostname contains a tenant subdomain (see `core/tenancy`)

## 6) Domain model (relationships)

Strictly from backend migrations and models:

- Tenant (central)
  - has many domains (stancl)
  - has many tenant users via `tenant_user` pivot with `central_user_id`

Tenant DB:
- Client (Project)
  - has many Directory
  - has many Website
  - has many Check
  - has many Report

- Directory
  - belongs to Client
  - belongs to Directory (parent)

- Website
  - belongs to Client
  - belongs to Directory (nullable in DB schema)
  - has many Page

- Page
  - belongs to Website
  - many-to-many with Check via `check_page`

- Check
  - belongs to Client
  - belongs to Checker (central)
  - many-to-many with Page

- Report
  - belongs to Check
  - belongs to Page
  - belongs to Client

Central DB:
- Checker
  - has many Check (logical, but in code it uses central connection)

## 7) Feature modules (UI scope)

### 7.1 Auth
- login/register/forgot/reset
- email verification resend
- token storage + refresh strategy (backend does not implement refresh; re-login is required when token expires/revoked)

### 7.2 Tenant management
- list/create/update/delete tenants (central endpoints)
- invite users to tenant (tenant endpoints)
- accept invitation (central endpoint)

### 7.3 Workspace
- projects (clients): list/create/update/delete, avatar, tags
- directories: list/create/update/delete
- websites: list/create/update/delete, “parse pages” toggle on create
- pages: list/create/update/delete

### 7.4 Monitoring
- checkers: list/show (admin-like CRUD exists; decide if you expose it)
- checks: list/create/update/delete, bind pages, config, is_active
- run check, run-history
- reports: list/show/delete; show formatted `report_fields`

### 7.5 Notifications
- list notifications, unread count, mark as read
- preferences matrix and single toggle updates
- telegram connection (link/connect/disconnect)

### 7.6 Sales
- tariffs list (public)
- show plan limits in UI, and handle backend “feature blocked” errors (e.g., website creation limit)

## 8) Non-functional requirements

### 8.1 Multi-tenant correctness
- Never call tenant-scoped endpoints from a central hostname.
- When switching tenant, always perform a hard redirect to the new subdomain.

### 8.2 Robustness
- Global handling for:
  - 401 (token missing/expired/blocked)
  - 403 (policy denied)
  - 422 (validation errors)
  - 429 (throttle)
  - 5xx (unexpected)

### 8.3 Developer experience
Given your project generator screenshots, recommended Vue setup:
- TypeScript: enabled
- Router: enabled
- Pinia: enabled
- ESLint + Prettier: enabled
- Unit testing (Vitest): optional but recommended
- E2E: optional (Cypress/Playwright)
- Oxlint: optional (experimental) — ensure it does not conflict with ESLint rules

