# System Core (Vue 3 SPA) for DontWorry

This document defines the SPA “core layer”: environment configuration, API client, auth/tenancy bootstrap, router guards, and shared utilities.

## 1) Project setup (Vue CLI/Vite)

Based on your Vue 3 SPA target and the shown Vite scaffold screens, a practical baseline is:

- TypeScript: **on**
- Router: **on** (SPA)
- Pinia: **on**
- ESLint: **on**
- Prettier: **on**
- Vitest: **on**
- E2E: **optional** (recommended if you want regression coverage on auth/tenancy flows)
- Experimental (Oxlint): **optional**

## 2) Core runtime constraints from backend

These are not stylistic preferences; they follow directly from the backend:

1. Tenant initialization relies on **subdomain** (`InitializeTenancyBySubdomain`).
2. Protected routes use `auth:sanctum`; **login/register return a Sanctum token**.
3. Tenant routes require `tenant:init`, which maps authenticated CentralUser → tenant User.
4. `logout` deletes `currentAccessToken()`; in practice, this implies the SPA should send `Authorization: Bearer <token>`.

## 3) Environment variables

Recommended `.env` keys for the SPA:

- `VITE_APP_ENV`: `local | staging | prod`
- `VITE_API_SCHEME`: `http` or `https`
- `VITE_API_PORT`: backend port in local dev (e.g. `8000`)
- `VITE_API_PATH_PREFIX`: `/v1` (default)
- `VITE_CENTRAL_HOST`: optional override for central domain (e.g. `app.dontworry.test`)

Reasoning:
- Tenant-scoped calls must hit the tenant subdomain.
- Central-scoped calls can hit a central host; you may keep it the same host if you run a single wildcard host.

## 4) Deriving API base URLs

### 4.1 Tenant-scoped base URL
Backend tenancy is derived from the request host. Therefore the safest tenant API base is:

- `tenantApiBase = <scheme>://<currentHost>:<apiPort>`

Example in local dev:
- SPA: `http://acme.dontworry.test:5173`
- API: `http://acme.dontworry.test:8000`

### 4.2 Central-scoped base URL
For central calls (auth, tenants CRUD, invitation accept, tariffs) you have two viable models:

- **Single-host model**: central API shares the same host pattern as tenant API (wildcard host) and tenancy middleware is not applied on central endpoints.
- **Dedicated central host**: e.g. `http://dontworry.test:8000` (or `http://app.dontworry.test:8000`).

In code you can implement:
- `centralApiBase = VITE_CENTRAL_HOST ? <scheme>://<VITE_CENTRAL_HOST>:<apiPort> : tenantApiBase`

## 5) API client

### 5.1 One axios instance per scope
Create two configured clients:

- `centralApi` (baseURL = centralApiBase)
- `tenantApi` (baseURL = tenantApiBase)

Both should:
- set `Accept: application/json`
- set `Content-Type: application/json` by default
- attach `Authorization: Bearer <token>` if present

### 5.2 Envelope parsing
Backend responses are typically:

- success: `{ data, message?, meta? }`
- error: `{ message, errors? }`

Implement a small helper that:
- returns `{ data, message, meta }` on success
- throws a typed error on failure (`status`, `message`, `errors`)

### 5.3 File uploads
Backend accepts file uploads in DTOs:

- Client avatar: `clients.avatar`
- Tenant user avatar: `users/me.avatar`

For those requests:
- use `multipart/form-data`
- send `FormData` where file fields are appended under the correct key

## 6) Authentication and bootstrap flow

### 6.1 Central login
Call:
- `POST /v1/users/auth/login` with `{ email, password }`

Store:
- `token`
- `centralUser`

### 6.2 Post-login tenant selection
Immediately fetch:
- `GET /v1/tenants` (central)

Then:
- if user has 1 tenant: redirect to that tenant subdomain
- else: show “Choose workspace” screen

### 6.3 Tenant entry (first request on tenant subdomain)
Once on a tenant host, the first tenant-scoped request must pass through `tenant:init`.

A good probe call is:
- `GET /v1/users/me` (tenant)

If it returns:
- 200 → tenant user is initialized
- 401 with message `Could not define tenant user` → the user is not attached to this tenant (or tenant user record missing)

### 6.4 Logout
Call:
- `POST /v1/users/auth/logout` (central)

Because the backend deletes `currentAccessToken()`, send the Bearer token.

After success:
- clear token
- redirect to central login

## 7) Router strategy

### 7.1 Route groups

Central routes (work without tenant subdomain):
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/tenants/select`
- `/invite/:token` (public invitation view + accept)
- `/tariffs`

Tenant routes (require tenant subdomain):
- `/app` (shell)
  - `/app/projects`
  - `/app/projects/:id`
  - `/app/directories`
  - `/app/websites`
  - `/app/pages`
  - `/app/checkers`
  - `/app/checks`
  - `/app/reports`
  - `/app/notifications`
  - `/app/settings/profile`

### 7.2 Guards

Global `beforeEach` checks:

- If route is protected and no token: redirect to `/login`.
- If route is tenant-only but host is central: redirect to `/tenants/select` (or show a “Pick tenant” page).
- If route is central-only but host is tenant: allow (it can still call centralApi), but consider UX (you may keep a dedicated central host).

## 8) Tenancy in local development

### 8.1 The cookie domain problem
If you later decide to rely on cookie-based Sanctum auth across subdomains, `SESSION_DOMAIN` must be configured to a parent domain.
In the backend `.env.example`, `SESSION_DOMAIN` is empty (host-only cookies), which typically does **not** work across subdomains.

Because this SPA is designed around Bearer tokens, you can develop without cross-subdomain cookie sharing.
However, tenant resolution still requires subdomains.

### 8.2 Practical local setup
Use a domain that supports wildcard subdomains mapped to `127.0.0.1`, for example:
- a custom `*.dontworry.test` with your local DNS / hosts configuration

Then:
- run the SPA dev server on `http://<tenant>.dontworry.test:5173`
- run the backend on `http://<tenant>.dontworry.test:8000`

If you need multiple tenant subdomains, add them to your hosts/DNS mapping.

## 9) Subscription limits (frontend enforcement)

The backend enforces at least one limit in `WebsiteController::store`:

- if `SubscriptionService::canCreateWebsite()` is false, it returns `error("Website limit reached")`.

Frontend guidance:
- fetch `/v1/sales/subscriptions/tariffs` and show limits in the UI
- on “Create website” screen, handle the backend error message and present an upgrade CTA

## 10) Known backend behaviors to reflect in UI

1. **Avatar fields are appended only on some read endpoints**:
   - `GET /v1/workspace/clients` appends `avatar`
   - `GET /v1/users/me` appends `avatar`
   - create/update endpoints do not append `avatar` by default
   
   UX implication: after updating an avatar, re-fetch the relevant profile/list.

2. **Check model `config` accessor looks inconsistent** (it returns a config DTO class name instead of the stored value).
   
   UX implication: for an “Edit check config” screen, verify API output on `GET /v1/monitoring/checks/:id`. If `config` is not usable, you’ll need a backend patch.

3. **Checker field schemas are provided by backend**:
   - `GET /v1/monitoring/checkers/:id` appends `config_fields` and `result_fields`

   UX implication: build check config forms dynamically from `config_fields`.
