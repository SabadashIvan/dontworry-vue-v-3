# MASTER PROMPT (Opus 4.5) — Vue 3 SPA for DontWorry Backend (Strict API-First, Multitenant by Subdomain)

## ROLE
You are a Senior Frontend Architect and Vue.js 3 (Composition API) engineer. You will design and implement a SPA **strictly** against the existing backend contract described below.

You MUST NOT:
- invent endpoints, request/response fields, or backend behavior
- introduce filters/search params that are not explicitly supported
- assume server-side relationship filtering exists (it mostly does not)

If something is unclear, you list assumptions and provide safe fallback UX patterns.

---

## BACKEND FACTS (NON-NEGOTIABLE)

### 1) Base URL + Versioning
All module routes are mounted under:
- `/api/...`
- version segments: `/api/v1/...`

### 2) Unified API response envelope
Success responses (typical):
```json
{ "data": ..., "message": "...", "meta": ... }
Fields may be omitted if null/empty.
Error responses:

json
Copy code
{ "message": "...", "errors": ... }
Pagination:

Request params: ?perPage=<1..50>&page=<>=1

Response: meta.paginator contains total, per_page, current_page, last_page, etc.

3) Authentication: Sanctum SPA cookies (CSRF required)
Frontend must use cookie-based auth.

Before the first stateful request, call:

GET /sanctum/csrf-cookie

All subsequent requests must:

send cookies (session + XSRF)

include headers:

Accept: application/json

X-XSRF-TOKEN: <value from XSRF-TOKEN cookie>

Referer: <frontend origin> (backend expects this in SPA setup)

Important behavior:

session cookie dontworry_session expires by backend config; handle re-login

if CSRF mismatch occurs (e.g. 419), refresh /sanctum/csrf-cookie and retry once

4) Multitenancy: DB per tenant, tenant resolved by subdomain (Stancl Tenancy)
Tenant context is initialized by middleware group tenant:init which includes:

InitializeTenancyBySubdomain

InitializeUser (binds authenticated central user to tenant user)

Therefore:

Tenant-scoped APIs MUST be called on the tenant subdomain host (Host header matters; browser cannot spoof it).

Tenant is NOT passed via tenant_id param/header by frontend.

If user is not a member of that tenant, backend returns 401 with message like:

"Could not define tenant user"

or tenant/user blocked messages

DOMAIN MODEL MAPPING FOR THE SPA (Use backend naming, but map UX labels)
Backend entities you must use:

Central context (no tenant required)
Central User (global auth identity)

Tenant (workspace): has title, domain (subdomain), timezone

Tenant context (requires auth:sanctum + tenant:init)
Workspace (tied to tenant):

Client (use as “Project” in UI): title, description, tags[], avatar (available in responses where appended)

Directory: grouping for websites (hierarchy via parent_id)

Website: client_id, directory_id, host (e.g. example.com), optional parse_pages on create

Page: website_id, title, slug

Monitoring (tests):

Checker: catalog item (central connection) describing a test type; on show it includes config_fields and result_fields

Check (use as “Test” in UI): configured instance of a checker, belongs to client_id, can be assigned to multiple page_ids

Report: execution result, can include result_fields on show

UI naming recommendation:

“Project” = Client

“Website tests” = Checks (configured) + Reports (results)

EXACT API INVENTORY (DO NOT CHANGE)
Users (central auth + profiles)
Public:

POST /api/v1/users/auth/register

body: { name, email, password, password_confirmation }

POST /api/v1/users/auth/login

body: { email, password }

POST /api/v1/users/auth/forgot-password

POST /api/v1/users/auth/reset-password

OAuth:

GET /api/v1/users/oauth/providers

GET /api/v1/users/oauth/providers/{provider}/redirect

GET /api/v1/users/oauth/providers/{provider}/callback

Auth required (auth:sanctum):

POST /api/v1/users/auth/logout

Email verification:

POST /api/v1/users/auth/verification-notification

POST /api/v1/users/auth/verify-email/{id}/{hash}

Central “me” (no tenant):

GET /api/v1/users/me/central

PUT /api/v1/users/me/central

Central delete flow:

POST /api/v1/users/me/request-delete

POST /api/v1/users/me/confirm-delete

Tenant “me” (requires tenant:init):

GET /api/v1/users/me

PUT /api/v1/users/me

DELETE /api/v1/users/me/avatar

Roles/permissions (tenant:init):

POST /api/v1/users/{userId}/roles/assign

DELETE /api/v1/users/{userId}/roles/remove

GET/POST/PUT/DELETE /api/v1/users/roles... (apiResource)

GET /api/v1/users/permissions

Tenants (workspaces)
Auth required (auth:sanctum), central context:

GET /api/v1/tenants

POST /api/v1/tenants body: { title, domain, timezone? }

GET /api/v1/tenants/{id}

PUT /api/v1/tenants/{id} body: { title?, timezone? }

DELETE /api/v1/tenants/{id}

Invitations:
Public:

GET /api/v1/tenants/invitations/view/{token}

Auth required:

POST /api/v1/tenants/invitations/accept body: { token } (no tenant:init)

Tenant-scoped (auth + tenant:init):

GET /api/v1/tenants/invitations

POST /api/v1/tenants/invitations body: { email }

GET /api/v1/tenants/invitations/{id}

DELETE /api/v1/tenants/invitations/{id}

Workspace (auth + tenant:init), prefix /api/v1/workspace
Clients:

GET/POST/GET{id}/PUT/DELETE /api/v1/workspace/clients

DELETE /api/v1/workspace/clients/{id}/avatar

client create/update supports avatar upload + tags[] (multipart)

Directories:

GET/POST/GET{id}/PUT/DELETE /api/v1/workspace/directories

Websites:

GET/POST/GET{id}/PUT/DELETE /api/v1/workspace/websites

GET /api/v1/workspace/directories/{directoryId}/websites

website create body: { client_id, directory_id, host, parse_pages? }

Pages:

GET/POST/GET{id}/PUT/DELETE /api/v1/workspace/pages

page create body: { website_id, title, slug? } (slug auto if omitted)

Monitoring (auth + tenant:init), prefix /api/v1/monitoring
Checkers:

GET/POST/GET{id}/PUT/DELETE /api/v1/monitoring/checkers

GET /api/v1/monitoring/checkers/{id} returns appended config_fields, result_fields

Checks (Tests):

GET/POST/GET{id}/PUT/DELETE /api/v1/monitoring/checks

Extra:

POST /api/v1/monitoring/checks/{id}/run

GET /api/v1/monitoring/checks/run-history

GET /api/v1/monitoring/checks/{id}/run-history

check create body: { checker_id, client_id, title, config?, is_active?, page_ids[] }

Reports:

GET/POST/GET{id}/PUT/DELETE /api/v1/monitoring/reports

GET /api/v1/monitoring/reports/{id} appends result_fields

Notifications (auth + tenant:init), prefix /api/v1/notifications
GET /api/v1/notifications

GET /api/v1/notifications/unread

GET /api/v1/notifications/unread/count

POST /api/v1/notifications/{id}/read

POST /api/v1/notifications/mark-all-read
Preferences:

GET /api/v1/notifications/preferences

PUT /api/v1/notifications/preferences

PUT /api/v1/notifications/preferences/single
Telegram:

POST /api/v1/notifications/telegram/connection-link

POST /api/v1/notifications/telegram/connect

POST /api/v1/notifications/telegram/disconnect

SPA ARCHITECTURE REQUIREMENTS (Vue 3 + TS)
Mandatory stack:

Vue 3 (Composition API)

TypeScript

Pinia

Vue Router

Vite

Axios (preferred)

Host-based app modes
The SAME SPA must work in two modes based on hostname:

Central mode (no tenant): login/register + tenant list/create + invitation public view/accept

Tenant mode (tenant subdomain): workspace + monitoring + notifications

Implement a deterministic resolver:

Determine subdomain from window.location.hostname

Decide central vs tenant via env list (e.g. VITE_CENTRAL_DOMAINS=localhost,127.0.0.1,<prod-root-domain>)

In tenant mode, tenantKey = subdomain

API base URL strategy (critical for tenancy)
Because backend resolves tenant by Host, requests to tenant-scoped endpoints must be made to the tenant host.

Implement env-driven strategy:

default: baseURL = window.location.origin and call /api/... (same host)

optionally support VITE_API_ORIGIN_TEMPLATE like:

http://{host}:8000 or https://{host}

where {host} is window.location.hostname
Do NOT invent a separate api.domain.com unless it preserves tenant host.

HTTP client behavior
Always send cookies: withCredentials: true

Before login (and before first stateful call), fetch CSRF cookie:

GET /sanctum/csrf-cookie

Always attach X-XSRF-TOKEN header from cookie value

Interceptors:

401: clear auth state, redirect to /login

419: refresh CSRF once and retry request once

Pinia stores (minimum)
useAppContextStore:

mode: central | tenant

hostname, subdomain

helpers to build tenant redirect URL

useAuthStore:

isAuthenticated (derived from /api/v1/users/me/central in central mode OR /api/v1/users/me in tenant mode)

login/logout/register flows

useTenantsStore (central mode):

list/create/update/delete tenants

useProjectsStore (tenant mode, Clients)

useWebsitesStore (tenant mode)

usePagesStore (tenant mode)

useCheckersStore (tenant mode)

useChecksStore (tenant mode)

useReportsStore (tenant mode)

Each store must have:

clear responsibilities

reset() for logout

Routing (recommended)
Central mode routes:

/login, /register, /forgot-password, /reset-password

/tenants (list)

/tenants/new

/invitation/:token (public view via /api/v1/tenants/invitations/view/{token})

/invitation/:token/accept (POST accept)

Tenant mode routes:

/ dashboard

/projects (clients)

/projects/:clientId (client overview)

/projects/:clientId/websites

/projects/:clientId/websites/:websiteId/pages

/projects/:clientId/tests (checks list filtered client-side by client_id)

/projects/:clientId/tests/:checkId

/reports (reports list; allow filtering client-side by client_id if needed)

/notifications

Important: backend provides mostly flat lists. If you need “by client” views, you MUST:

either filter client-side after fetching pages

or iteratively fetch all pages via pagination (perPage max 50)

UX constraints derived from backend
Website creation may fail with message: "You cannot create one more website. Please upgrade your subscription."

show error toast + disable create when detected repeatedly (no guessing of limits)

To configure a check:

list checkers via GET /api/v1/monitoring/checkers

for selected checker, fetch details via GET /api/v1/monitoring/checkers/{id} to obtain config_fields

build dynamic form from config_fields types: boolean/integer/select

submit config as object and page_ids array

Manual run:

POST /api/v1/monitoring/checks/{id}/run and show result message

Reports:

list via GET /api/v1/monitoring/reports

details via GET /api/v1/monitoring/reports/{id} to display appended result_fields

OUTPUT YOU MUST PRODUCE
A concrete SPA architecture (folders, modules, router, stores)

App bootstrap flow for central vs tenant mode

HTTP client implementation (axios) respecting Sanctum CSRF and tenancy

Minimal working skeleton code examples:

main.ts bootstrap

apiClient.ts

router.ts with guards

sample store: tenants + clients + checks

A “no-invention” checklist that enumerates what is guaranteed vs assumed

Keep it production-grade, but avoid over-engineering.

