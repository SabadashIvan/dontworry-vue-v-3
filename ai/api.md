# DontWorry API (Backend Contract)

This document is derived strictly from the current backend codebase (Laravel + Sanctum + stancl/tenancy) contained in the provided archive.

## 1) Conventions

### 1.1 Base prefix
All backend API routes are prefixed with `v1`.

### 1.2 Response envelope
Most controller responses use a unified JSON envelope:

- Success:
  ```json
  {
    "data": <any>,
    "message": "<optional>",
    "meta": { "paginator": { ... } }
  }
  ```

- Error:
  ```json
  {
    "message": "<string>",
    "errors": <optional>
  }
  ```

Notes:
- `message` and `meta` are omitted when empty.
- Pagination meta is returned only for list endpoints implemented via `BaseResourceController::indexRequest`.

### 1.3 Pagination
List endpoints that paginate return:

- `data`: an array of items
- `meta.paginator`: a paginator resource (the exact fields depend on `App\Http\Resources\PaginatorResource`)

Input:
- Many index DTOs include `perPage` and `page`. If `perPage` is not provided, the backend defaults to its internal service default.

### 1.4 Validation
Request validation is implemented via Spatie Laravel Data DTOs (e.g., `#[Required]`, `#[StringType]`, `#[Exists]`, etc.).
Validation errors are returned by Laravel’s standard JSON validation response (HTTP 422) unless explicitly overridden.

### 1.5 Tenancy model
Tenant initialization for tenant-scoped routes is performed by middleware group `tenant:init`:

- `Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain`
- `Modules\Users\Http\Middleware\InitializeUser`

Implications:
- **Tenant-scoped routes must be called on a tenant subdomain** (tenancy is derived from the request host/subdomain).
- After tenancy initialization, `InitializeUser` maps the authenticated **CentralUser** (Sanctum) to a **tenant User** and sets `auth('tenant')->user()`.

## 2) Authentication

### 2.1 Sanctum
The API uses `auth:sanctum` middleware for protected routes.

The backend issues a Personal Access Token on:
- `POST /v1/users/auth/login`
- `POST /v1/users/auth/register`

Both endpoints return a payload containing:
- `user` (CentralUser)
- `token` (plain text Sanctum token)

### 2.2 Recommended request auth (based on backend behavior)
The backend `logout` implementation calls:

```php
$request->user()->currentAccessToken()->delete();
```

This requires a Sanctum **personal access token** to be present (i.e., requests should include `Authorization: Bearer <token>`).

Therefore, for the SPA:
- Store the token client-side (storage choice is your decision) and send it as `Authorization: Bearer <token>` for all protected API calls.
- Cookie-based “stateful SPA” auth may exist (Laravel stateful API middleware is enabled), but the current logout path is token-oriented.

## 3) Environments & base URLs

The backend is configured as a multi-tenant app with central domains (in `config/tenancy.php`) including `localhost` and `127.0.0.1`.

Practical rule:
- Central routes: call the backend on the **central host** (e.g., `http://localhost:8000`).
- Tenant routes: call the backend on the **tenant subdomain host** (e.g., `http://{tenant}.localhost:8000`).

## 4) Endpoints

Legend:
- **Auth:** requires `Authorization: Bearer <token>`
- **Tenant:** requires calling on tenant subdomain + `tenant:init`

---

## 4.1 Users

### Public auth

#### POST `/v1/users/auth/register`
Creates a central user, logs them in, generates a Sanctum token, and triggers email verification notification.

Request (RegisterDTO):
- `name` (string, required)
- `email` (email, required)
- `password` (string, required)
- `password_confirmation` (string, required)

Response `data`:
- `user`: CentralUser
- `token`: string
- `message`: string

#### POST `/v1/users/auth/login`

Request (LoginDTO):
- `email` (email, required)
- `password` (string, required)

Response `data`:
- `user`: CentralUser
- `token`: string

Error:
- 401 if credentials invalid or user blocked.

#### POST `/v1/users/auth/forgot-password`

Request (ForgotPasswordDTO):
- `email` (email, required)

Response:
- Success: `message` indicates reset link sent.
- Error: `message` (e.g., user not found).

#### POST `/v1/users/auth/reset-password`

Request (ResetPasswordDTO):
- `token` (string, required)
- `email` (email, required)
- `password` (string, required)
- `password_confirmation` (string, required)

Response:
- Success: `message` indicates password reset.

### OAuth

#### GET `/v1/users/oauth/providers`
Returns enabled OAuth providers list.

#### GET `/v1/users/oauth/providers/{provider}/redirect`
Returns `data.redirect_url`.

#### GET `/v1/users/oauth/providers/{provider}/callback`
Query DTO (OAuthCallbackDTO):
- `code` (string, optional)
- `error` (string, optional)
- `error_description` (string, optional)

Response:
- Error if cancelled/failed.
- Success returns `data` from OAuth service.

### Protected auth

#### POST `/v1/users/auth/logout`  (Auth)
Invalidates session, regenerates CSRF token, and deletes current Sanctum token.

#### POST `/v1/users/auth/verification-notification` (Auth)
- Throttled: `throttle:6,1`
- Resends verification email if not verified.

#### POST `/v1/users/auth/verify-email/{id}/{hash}` (Auth)
- Requires `signed` middleware (signed URL).
- Marks email as verified.

### Central profile

#### GET `/v1/users/me/central` (Auth)
Returns current CentralUser.

#### PUT `/v1/users/me/central` (Auth)
Request (CentralUser UpdateDTO):
- `name` (string, optional)

Response `data`:
- `user`: updated CentralUser

### Tenant profile

#### GET `/v1/users/me` (Auth + Tenant)
Returns current tenant `User` with `avatar` appended.

#### PUT `/v1/users/me` (Auth + Tenant)
Request (Tenant User UpdateDTO):
- `avatar` (file, optional)

Response `data`:
- `user`: updated tenant User (note: avatar is appended only in `me()` endpoint).

#### DELETE `/v1/users/me/avatar` (Auth + Tenant)
Deletes tenant user avatar media.

### Roles & permissions (tenant)

#### POST `/v1/users/{userId}/roles/assign` (Auth + Tenant)
#### DELETE `/v1/users/{userId}/roles/remove` (Auth + Tenant)

#### CRUD `/v1/users/roles` (Auth + Tenant)
#### GET `/v1/users/permissions` (Auth + Tenant)

---

## 4.2 Tenants

### CRUD tenants (central)

#### CRUD `/v1/tenants` (Auth)
`TenantController` is implemented as a resource controller.

Create request (Tenant CreateDTO):
- `title` (string, required)
- `domain` (string, required)
- `timezone` (string, optional)

Update request (Tenant UpdateDTO):
- `title` (string, optional)
- `timezone` (string, optional)

Notes:
- Tenants are stancl/tenancy `Tenant` models; custom attributes like `timezone` are stored via tenant “data” mechanism.
- `domain` is created/updated via tenant domains relation.

### Invitations

#### GET `/v1/tenants/invitations/view/{token}` (Public)
Returns invitation by token.
Loads relations: `tenant`, `invitedBy`.

#### POST `/v1/tenants/invitations/accept` (Auth)
Accepts invitation by token and attaches current user to the tenant.

Request (AcceptDTO):
- `token` (string, required)

#### Tenant-scoped invitations (Auth + Tenant)
These must be called on a tenant subdomain.

- GET `/v1/tenants/invitations`
- GET `/v1/tenants/invitations/{id}`
- POST `/v1/tenants/invitations`
- DELETE `/v1/tenants/invitations/{id}`

Create request (Invitation CreateDTO):
- `email` (email, required)

---

## 4.3 Workspace (tenant)

All endpoints in this section require **Auth + Tenant** and are prefixed with `/v1/workspace`.

### Clients (projects)

Resource: `/v1/workspace/clients`

Create request (Client CreateDTO):
- `title` (string, required)
- `description` (string, optional)
- `avatar` (file, optional)
- `tags` (array<string>, optional)

Update request (Client UpdateDTO):
- `title` (string, optional)
- `description` (string, optional)
- `avatar` (file, optional)
- `tags` (array<string>, nullable)

Notes:
- `index()` appends `avatar` to each returned client.
- `store`/`update` responses return the model as created/updated, but **do not append** `avatar` automatically.

Extra:
- DELETE `/v1/workspace/clients/{id}/avatar` removes avatar media.

### Directories

Resource: `/v1/workspace/directories`

Create request (Directory CreateDTO):
- `client_id` (int, required, exists: clients)
- `title` (string, required)
- `parent_id` (int, nullable, exists: directories)

Update request (Directory UpdateDTO):
- `client_id` (int, optional, exists: clients)
- `title` (string, optional)
- `parent_id` (int, nullable, exists: directories)

### Websites

Resource: `/v1/workspace/websites`

Create request (Website CreateDTO):
- `client_id` (int, required, exists: clients)
- `directory_id` (int, required, exists: directories)
- `host` (string, required)
- `parse_pages` (bool, optional)

Behavior:
- If `parse_pages=true`, a tenant job `ParseWebsiteJob` is dispatched.

Extra:
- GET `/v1/workspace/directories/{directoryId}/websites` returns websites by directory.

### Pages

Resource: `/v1/workspace/pages`

Create request (Page CreateDTO):
- `website_id` (int, required, exists: websites)
- `title` (string, required)
- `slug` (string, required)

Update request (Page UpdateDTO):
- `website_id` (int, optional, exists: websites)
- `title` (string, optional)
- `slug` (string, optional)

---

## 4.4 Monitoring (tenant)

All endpoints in this section require **Auth + Tenant** and are prefixed with `/v1/monitoring`.

### Checkers (central models, tenant API)

Resource: `/v1/monitoring/checkers`

Create request (Checker CreateDTO):
- `title` (string, required)
- `service` (enum int, required) — `Modules\Monitoring\Enums\CheckerService`
- `config` (array/object, optional)
- `is_active` (bool, optional)

Update request (Checker UpdateDTO):
- `title` (string, optional)
- `service` (enum int, optional)
- `config` (array/object, optional)
- `is_active` (bool, optional)

Special response fields:
- `show()` appends:
  - `config_fields`: object keyed by config key, each value includes `{type,label,default,min,max,options}` plus `cron` and optionally `timeout/verify_ssl`.
  - `result_fields`: object keyed by result key, each value includes `{label}`.

### Checks

Resource: `/v1/monitoring/checks`

Create request (Check CreateDTO):
- `client_id` (int, required, exists: clients)
- `title` (string, required)
- `checker_id` (int, required, exists: checkers)
- `page_ids` (array<int>, optional, exists: pages)
- `config` (array/object, optional)
- `is_active` (bool, optional)

Update request (Check UpdateDTO):
- `client_id` (int, optional)
- `title` (string, optional)
- `checker_id` (int, optional)
- `page_ids` (array<int>, optional)
- `config` (array/object, optional)
- `is_active` (bool, optional)

Special response fields:
- Index/Show retrieval appends `checker` (a `Checker` model loaded from the central database).
- Run history endpoints attach `runHistory` based on Horizon/Redis job history tags.

Additional endpoints:
- POST `/v1/monitoring/checks/{id}/run` triggers an immediate run (dispatches a tenant job).
- GET `/v1/monitoring/checks/run-history` returns paginated checks with `runHistory`.
- GET `/v1/monitoring/checks/{id}/run-history` returns a single check with `runHistory`.

Important implementation note (backend behavior):
- The `Check` model has a `config()` accessor that currently returns a config DTO **class reference** rather than config values. If you need to edit check config in the SPA, verify the API output in practice; a backend fix may be required for correct serialization.

### Reports

Resource: `/v1/monitoring/reports`

Reports are created by checker runs.

Special response behavior:
- `index()` loads relations:
  - `check` (id, title)
  - `check.checker` (id, title, service)
  - `page` (id, title, slug, website_id)
  - `page.website` (id, host)
- `index()` and `show()` append `report_fields`, which is the checker-specific field list with computed `{label,value,color}` based on report `result`.

The `result` attribute is serialized via the checker’s Result DTO.

---

## 4.5 Notifications (tenant)

All endpoints in this section require **Auth + Tenant** and are prefixed with `/v1/notifications`.

### Notifications

- GET `/v1/notifications` — paginated notifications via `IndexDTO` (`perPage`, `page`).
- GET `/v1/notifications/unread` — uses `UnreadDTO` (`perPage`, `page`, `limit`).
- GET `/v1/notifications/unread/count` — integer.
- POST `/v1/notifications/{id}/read` — marks one as read.
- POST `/v1/notifications/mark-all-read` — marks all as read.

### Preferences

- GET `/v1/notifications/preferences`
- PUT `/v1/notifications/preferences` — bulk matrix update
  - Request (UpdatePreferencesDTO):
    - `preferences` (required array)
    - Structure validated as nested arrays with `enabled` (bool) and `settings` (array)

- PUT `/v1/notifications/preferences/single` — update one
  - Request (UpdateSinglePreferenceDTO):
    - `group` (enum int, required) — `Modules\Notifications\Enums\NotificationGroup`
    - `channel` (enum string, required) — `Modules\Notifications\Enums\NotificationChannel`
    - `enabled` (bool, required)
    - `settings` (array, optional)

### Telegram

- POST `/v1/notifications/telegram/connection-link`
- POST `/v1/notifications/telegram/connect`
  - Request: `{ "token": "..." }`
- POST `/v1/notifications/telegram/disconnect`

---

## 4.6 Sales

### GET `/v1/sales/subscriptions/tariffs` (Public)
Returns all tariff definitions derived from `Modules\Sales\Enums\TariffType::getAll()`.
Each tariff includes:
- `value`, `label`
- `max_websites`
- `allowed_notification_channels`
- `max_status_pages_per_website`
- `has_report_export`
- `report_history_days`
- `has_personal_manager`
- `allowed_checkers` (list of `{name,label}`)
