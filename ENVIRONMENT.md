# Environment variables and API keys

This document lists the environment variables required to run the platform locally and in production.

Use separate `.env` files for each app:

- API: `apps/api/.env`
- Web (Next.js): `apps/app/.env`

## Global concepts

- BASE_DOMAIN: Your base domain (e.g., `rivr.app` in prod). For local dev, you can use `localhost` and the `X-Tenant-Subdomain` header (see below).
- EXEC_SUBDOMAIN: Subdomain for the RIVR executive portal (default `exec`).
- Tenant override (dev): Send header `X-Tenant-Subdomain: your-subdomain` to target a tenant locally when using `localhost`.

---

## API (.env)

Required for the API server in `apps/api`.

```env
# Core
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/rivr_platform

# Multi-tenant routing
BASE_DOMAIN=localhost
EXEC_SUBDOMAIN=exec

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security & rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
ENFORCE_TENANT=false

# CORS
# Comma-separated list of allowed origins (exact matches). Example:
# ALLOWED_ORIGINS=https://rivr-front-dev.onrender.com,https://rivr-front-prod.onrender.com
ALLOWED_ORIGINS=

# Email (use Mailtrap; leave unset for no-op in dev)
MAILTRAP_TOKEN=
MAILTRAP_FROM_EMAIL=no-reply@rivr.app
MAILTRAP_FROM_NAME=RIVR

# Stripe (enable when billing is implemented)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Monitoring (optional)
SENTRY_DSN=

# Storage (enable when moving to S3/GCS)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
AWS_S3_ENDPOINT=

# Route optimization providers (choose one when upgrading optimizer)
GOOGLE_MAPS_API_KEY=
MAPBOX_TOKEN=
```

Notes:

- `DATABASE_URL` must point to the shared platform DB containing the `businesses` table and per-tenant schemas when implemented.
- For local dev subdomains, keep `BASE_DOMAIN=localhost` and use `X-Tenant-Subdomain` header to pick a tenant.

---

## Web (Next.js) (.env)

Required for the Next.js app in `apps/app`.

```env
# API endpoints
NEXT_PUBLIC_API_BASE_URL=http://localhost:5001

# WebSocket (adjust when consolidated under a single server)
NEXT_PUBLIC_WS_URL=ws://localhost:5001/ws

# Branding/analytics (optional)
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_BASE_DOMAIN=localhost
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` must be reachable from the browser.
- `NEXT_PUBLIC_WS_URL` should point to the API's WebSocket path.

---

## Local development tips

- When running on `localhost`, subdomains are not available by default. Use the `X-Tenant-Subdomain` header in requests to the API to select a tenant. Example with curl:

```sh
curl -H "X-Tenant-Subdomain: demo-business" http://localhost:5001/api/admin/customers
```

- Alternatively, use a wildcard domain that resolves to `127.0.0.1` (e.g., `lvh.me`) and set `BASE_DOMAIN=lvh.me` to test subdomain routing like `acme.lvh.me`.

---

## Production checklist

- Set strong secrets for `JWT_SECRET` and provider API keys.
- Configure `BASE_DOMAIN` (e.g., `rivr.app`) and DNS/wildcard SSL.
- Configure Stripe keys and webhooks for billing.
- Configure object storage (S3/GCS) for file uploads.
- Set up monitoring (`SENTRY_DSN`) and adjust `LOG_LEVEL`.
