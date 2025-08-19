# RIVR Multi-Tenant SaaS (Monorepo)

A TurboRepo workspace containing the API (Express + Drizzle), Web App (Next.js App Router), and shared packages (schema, logger, UI, jest presets, TS config).

## Prerequisites

- Node.js 22+ and pnpm
- PostgreSQL database (single platform DB with per-tenant schemas)
- Optional: `psql` CLI for quick DB checks

## Repository Layout

- `apps/api`: Express API with multi-tenant middleware, RBAC, WebSockets
- `apps/app`: Next.js (App Router) web application
- `packages/schema`: Drizzle schema used by API
- `packages/logger`, `packages/ui`, `packages/jest-presets`, `packages/typescript-config`

## Environment Setup

1. Install deps

```sh
pnpm i
```

2. Configure environment files

- API: `apps/api/.env`
- Web: `apps/app/.env`

Use `ENVIRONMENT.md` for full variable descriptions. Minimal local example:

`apps/api/.env`

```env
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/rivr_platform
BASE_DOMAIN=localhost
EXEC_SUBDOMAIN=exec
JWT_SECRET=dev-secret-change
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d
ENFORCE_TENANT=false
```

`apps/app/.env`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001
NEXT_PUBLIC_WS_URL=ws://localhost:5001/ws
NEXT_PUBLIC_BASE_DOMAIN=localhost
```

## Database

We use a single platform database with:

- Platform tables (e.g., `businesses`, `refresh_tokens`)
- Per-tenant schemas for tenant data (via `search_path`)

Run migrations/push (Drizzle):

```sh
cd apps/api
pnpm db:push
```

## Seeding (demo data)

Use these commands from `apps/api` to populate demo data, including tenants and tenant-scoped driver passwords.

```sh
cd apps/api

# Push the latest schema to the DB
pnpm db:push

# Full seed (admins, businesses, tenants with customers, drivers, pickup requests)
pnpm seed

# Auth-only seed (only platform admins + businesses/users, no tenant data)
pnpm seed:auth
```

After a successful full seed, you can log in with:

- Admin: `admin@rivr.com` / `admin123`
- Business Owners: `robert@smithauto.com` / `business123` (tenant `smith-auto`), `jane@doemotors.com` / `business123` (tenant `doe-motors`)
- Drivers: `alex@rivr.com` / `driver123`, `maria@rivr.com` / `driver123`, `david@rivr.com` / `driver123` (use tenant `smith-auto` or `doe-motors`)

### Reseeding safely

If you need to reseed (e.g., to refresh driver passwords or tenant data):

```sh
cd apps/api
pnpm db:push   # ensure schema is up-to-date
pnpm seed      # re-run full seed
```

The full seed will:

- Clear existing platform demo data (admins, drivers, businesses, users)
- Ensure each tenant schema exists and has the required columns
- Insert/update known test drivers with hashed passwords per tenant
- Populate customers and pickup requests for each tenant

### Render deployment note

On Render, ensure the API service runs `db:push` and a full seed after deploy. For manual reseed on Render, run the same commands in a shell on the API service:

```sh
pnpm --filter ./apps/api db:push
pnpm --filter ./apps/api seed
```

### Create a tenant and seed data

Follow these steps to create a tenant schema and seed initial tenant data.

1. Prerequisites

```sh
cd apps/api
pnpm db:push
# Ensure apps/api/.env has DATABASE_URL and the DB user can CREATE SCHEMA
```

2. Option A: Create tenant via API registration (auto-provision schema)

- POST to `/api/auth/business/register` with your business details. This creates a `businesses` row and auto-provisions a tenant schema named `tenant_<subdomain>`.

Example:

```sh
curl -X POST http://localhost:5001/api/auth/business/register \
  -H 'Content-Type: application/json' \
  -d '{
    "businessName": "Acme Corporation",
    "ownerFirstName": "John",
    "ownerLastName": "Doe",
    "ownerEmail": "john@acme-corp.com",
    "phone": "+1-555-0123",
    "address": "123 Business Ave, City, ST 12345",
    "subdomain": "acme-corp",
    "password": "SecurePassword123!"
  }'
```

- Seed the new tenant schema:

```sh
cd apps/api
pnpm tenant:seed tenant_acme-corp
```

3. Option B: Create and seed a schema for an existing business row

- If you already have a `businesses` row (e.g., from `pnpm seed:auth` or `pnpm seed:full`) with `database_schema`, create and seed that exact schema name:

```sh
cd apps/api
# Create schema (schema name must match businesses.database_schema)
pnpm tenant:create <subdomain> <database_schema>

# Seed initial tenant data
pnpm tenant:seed <database_schema>
```

Examples for seeded demo data:

```sh
# Smith Auto (database_schema=smith_auto)
pnpm tenant:create smith-auto smith_auto
pnpm tenant:seed smith_auto

# Doe Motors (database_schema=doe_motors)
pnpm tenant:create doe-motors doe_motors
pnpm tenant:seed doe_motors
```

4. Verify tenant access in development

- Send requests with `X-Tenant-Subdomain: <subdomain>` header. For example:

```sh
curl http://localhost:5001/api/analytics/business/summary \
  -H 'X-Tenant-Subdomain: acme-corp'
```

Troubleshooting:

- Ensure `DATABASE_URL` is set and the DB user can create schemas.
- The value passed to `pnpm tenant:seed` must match `businesses.database_schema`.
- On localhost, use the `X-Tenant-Subdomain` header to target a tenant.

## Running the stack (dev)

From the repo root:

```sh
pnpm -w dev
```

If you prefer separate terminals:

```sh
# Terminal 1 (API)
cd apps/api && pnpm dev

# Terminal 2 (Web)
cd apps/app && pnpm dev
```

API default: `http://localhost:5001`
Web default: `http://localhost:3000`

For local tenant routing on localhost, use the header `X-Tenant-Subdomain: demo`. The frontend already forwards this header automatically when on a subdomain-like host or `BASE_DOMAIN=localhost`.

## Build

```sh
pnpm -w build
```

Note: `RIVR-App/` is a separate example and may fail to build; it is unrelated to the main `apps/api` and `apps/app` packages.

## Useful Endpoints

- Auth (examples): `/api/auth/business/login`, `/api/auth/refresh`, `/api/auth/logout`
- Driver: `/api/driver/messages`, `/api/driver/status`
- WebSocket: `ws://localhost:5001/ws?token=<accessToken>`
- Analytics (exec): `/api/analytics/platform/summary`
- Analytics (tenant): `/api/analytics/business/summary`

## Troubleshooting

- Ensure `DATABASE_URL` is reachable and user has rights to create schemas.
- When using tenants locally, include `X-Tenant-Subdomain` header or use a wildcard domain like `lvh.me` and set `BASE_DOMAIN=lvh.me`.
- Check `ENVIRONMENT.md` for full env details.
