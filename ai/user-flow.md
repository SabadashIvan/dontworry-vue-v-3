User Experience (UX) Flow: DontWorry SPA
This document defines the application logic from the perspective of a user, mapping their journey across the Central and Tenant environments.

1. Central Mode: The "Gatekeeper" Layer
Users start on the central domain (e.g., dontworry.com) to manage their identity and organizational access.

Authentication: Users register or log in using Sanctum-based cookie authentication. This establishes their identity as a CentralUser.

Tenant Discovery: Upon login, the user sees a list of all Workspaces (Tenants) they own or belong to.

Workspace Creation: Users can create a new organization by providing a title and a subdomain (e.g., acme-inc).

The Switch: When a user selects a workspace, the SPA performs a hard redirect to the tenant's specific subdomain (e.g., acme-inc.dontworry.com).

2. Tenant Mode: The "Workspace" Layer
Once on a subdomain, the SPA initializes in Tenant Mode. The user is now working within an isolated database context.

A. Project & Asset Management (The "Workspace" Module)
Users organize the websites they want to monitor using a hierarchical structure:

Project (Client): The top-level container (e.g., "E-commerce Client"). Users can upload an avatar and assign tags for categorization.

Directories: Optional folders used to group websites within a project.

Websites: The actual domains (e.g., example.com).

Auto-discovery: During creation, users can toggle "Parse pages" to automatically populate the page list.

Limits: If the user's subscription tariff is reached, the UI blocks further creation and shows an upgrade CTA.

Pages: Specific URLs (slugs) within a website that will be targeted by tests.

B. Monitoring & Testing (The "Monitoring" Module)
This is the core functional area where users configure checks:

Check Configuration:

The user selects a Checker type (e.g., SSL Check, PageSpeed).

The SPA fetches a dynamic schema from the backend and renders a configuration form (fields like integer, boolean, or select).

The user assigns this "Check" to specific Pages.

Execution & Analysis:

Users can trigger a "Manual Run" for an immediate test result.

Reports are generated, allowing users to see historical performance data and specific error details via result_fields.

C. Team Collaboration & Alerts (The "Notifications" Module)
Invitations: Users invite team members via email to join their specific tenant.

Telegram Integration: Users can generate a connection link to sync their Telegram account for real-time alerts.

Preferences Matrix: A settings grid where users decide which notification groups (e.g., "Critical Errors") go to which channels (Email, Telegram).

3. Global Exit
Logout: When a user logs out, the SPA destroys the local session and tokens, then redirects the browser back to the central domain login page.