# RIVR Multi-Tenant SaaS TODOs

A focused, actionable checklist to complete the multi-tenant SaaS. Check items off as they ship. File paths indicate where edits should occur.

## Core Multi-Tenancy (P0)

- [x] Tenant resolution middleware — `apps/api/src/middleware/tenant.ts`
  - [x] Extract subdomain/custom domain from `Host`
  - [x] Lookup business in platform `businesses`; set `req.tenant`, `req.businessId`
  - [x] Handle `exec` subdomain for executive portal
  - [x] Invalid-tenant error handling + structured logging
- [x] Tenant-aware DB access — `apps/api/src/lib/tenant-db.ts`
  - [x] Schema-based switching (search_path in transaction) + scaffolding for pooling
  - [x] Tenant-aware enforcement switch (require tenant when ENFORCE_TENANT=true)
  - [x] Automatic tenant filtering via storage wrapper (search_path applied per op)
  - [x] Connection lifecycle/cleanup (scoped to tx lifetime)
- [x] Storage refactor to tenant-bound instance — `apps/api/src/storage.ts`
  - [x] Convert global singleton to class bound to tenant context
  - [x] Update all routes to obtain tenant-scoped storage per request
- [x] Per-tenant schema provisioning — `apps/api/scripts/create-tenant-schema.ts`
  - [x] Create schema + tables for a new tenant
  - [x] Optional: migrate seed data for first tenant (`apps/api/scripts/migrate-initial-tenant-seed.ts`)
- [ ] Server wiring — `apps/api/src/server.ts`
  - [x] Register tenant middleware before routes
  - [x] CORS for subdomains/custom domains
  - [x] Include tenant context in request logs

## Frontend Subdomain/Tenant Context (P0)

- [x] Subdomain routing config — `apps/app/next.config.ts`
- [x] Subdomain validation middleware (App Router compatible) — `apps/app/src/middleware.ts`
- [x] Tenant provider + hooks — `apps/app/src/lib/tenant-context.tsx`
- [x] Use tenant context in layout — `apps/app/src/app/layout.tsx`
- [x] Apply tenant branding (logo/colors) across UI — `apps/app/src/components/tenant-branding.tsx`

## Auth & RBAC (P0)

- [x] Tenant-specific JWT — `apps/api/src/auth.ts`
  - [x] Embed tenant/business identifiers in access/refresh tokens
  - [x] Refresh token rotation + revocation
  - [x] Session management per business (platform `refresh_tokens` table)
- [x] Enhanced RBAC — `apps/api/src/auth/rbac.ts`
  - [x] Granular permissions, role inheritance, route-level checks (middleware helpers)
- [x] Complete password change endpoint — `apps/api/src/auth-routes.ts`
- [ ] (Optional) MFA support

## Business Registration & Onboarding (P1)

- [x] Subdomain availability check — `apps/app/src/components/auth/register-form.tsx`
- [x] Backend subdomain validation + conflicts — `apps/api/src/auth.ts`
- [x] Automated schema provisioning on registration
- [x] Email verification + welcome email (scaffolded via mailto link)
- [x] Onboarding wizard — `apps/app/src/components/onboarding/`

## Realtime & Driver Communications (P1)

- [x] WebSocket server startup fix — `apps/api/src/routes/websocket-routes.ts` + `apps/api/src/index.ts`
  - [x] Attach WS to the actual HTTP server (single `listen`) and start it
  - [x] Add tenant-scoped channels/rooms and WS auth
- [ ] In-app messaging
  - [x] Persist messages with tenant scope, delivery/seen states

## Route Optimization (P1)

- [ ] Integrate a real optimizer (Google/Mapbox/OR-Tools) — `apps/api/src/route-optimizer.ts`
- [ ] Add constraints: service times, vehicle capacity, time windows, priority
- [ ] Compute/persist ETAs; expose via API
- [ ] Per-tenant usage metering for billing

## Production Workflow (P1)

- [ ] Backend endpoints to update `productionStatus` and timestamps consistently
- [ ] Wire admin UI — `apps/app/src/components/admin/production-tab.tsx`
- [ ] Move asset storage to S3/GCS with presigned uploads (photos, attachments)
- [ ] Email automations by stage using `email_templates` + logs

## Billing & Subscriptions (Stripe) (P1)

- [ ] Stripe integration — `apps/api/src/billing/stripe.ts`
  - [ ] Checkout/session, customer portal, webhook handlers
- [ ] Subscription lifecycle — `apps/api/src/billing/subscription.ts`
  - [ ] Trial, upgrade/downgrade, cancel, proration
- [ ] Enforce plan limits in middleware (drivers/customers/routes)
- [ ] Exec billing UI — `apps/app/src/components/rivr-exec/billing/`

## Analytics & Reporting (P2)

- [x] APIs for cross-business and per-business analytics — `apps/api/src/routes/analytics.ts`
- [x] Exec analytics UI — `apps/app/src/components/rivr-exec/analytics/`
- [x] Add caching/rollups for performance

## Security, Privacy, Compliance (P2)

- [ ] PII encryption at rest — `apps/api/src/security/encryption.ts`
- [ ] Data retention/deletion & GDPR helpers — `apps/api/src/security/privacy.ts`
- [ ] Audit logging — `apps/api/src/audit/`
- [ ] Security monitoring/anomaly detection — `apps/api/src/security/monitoring.ts`
- [ ] Per-tenant rate limiting; full request validation coverage

## API & Integrations (P2)

- [ ] API key management and per-plan rate limits
- [ ] Webhooks and integration templates — `apps/api/src/integrations/`
- [ ] Public API docs per tenant

## Testing (P0→P2 ongoing)

- [ ] Unit: tenant middleware, tenant DB, auth, storage, billing
- [ ] Integration: multi-tenant isolation, optimizer, WS auth
- [ ] E2E: registration → onboarding → production workflow → billing
- [ ] Performance/load tests (per-tenant isolation and WS scaling)

## Deployment & Ops (P1)

- [ ] Load balancer with SSL, subdomain routing, health checks
- [ ] Database: pooling, replicas, automated backups, failover
- [ ] Object storage for uploads (S3/GCS)
- [ ] Observability: request IDs, tenant-tagged logs, metrics, alerts
- [ ] CI/CD: build/test/lint, migrations gating, secrets management

## Docs & Developer Experience (P2)

- [ ] Update `.env.example` in `apps/api` and `apps/app` (DB, BASE_DOMAIN, STRIPE, JWT, SMTP, SENTRY)
- [ ] README: multi-tenant setup/runbook
- [ ] Scripts: tenant schema creation + seeding
- [ ] Migration guide for adding new tenants
- [x] ENV docs: add `ENVIRONMENT.md` with required env vars and API keys
