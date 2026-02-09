# PMS Backend (Phase 2)

Standalone Node.js API service for the Projects domain. Implements the same contract as `/api/v1` (OpenAPI projects-v1).

## Setup

1. Copy root `.env` (or symlink) so `DATABASE_URL` and `NEXTAUTH_SECRET` are set.
2. From repo root: `npm run backend` (or `cd apps/backend && npm install && npm run prisma:generate && npm start`).
3. Backend listens on `PORT` (default 4000). Set `CORS_ORIGIN=http://localhost:3000` to allow the frontend.

## Auth

Requests must include `Authorization: Bearer <jwt>`. The JWT is the same as NextAuth session token. Frontend obtains it via `GET /api/auth/token` (same-origin) and sends it to the backend.

## Feature flag

Set `NEXT_PUBLIC_USE_PROJECTS_API=true` and `NEXT_PUBLIC_PROJECTS_BACKEND_URL=http://localhost:4000` in the frontend env to route projects traffic to this service.

## Rate limiting

- **Global:** 200 requests per 15 minutes per IP (configurable via `RATE_LIMIT_MAX_GLOBAL`).
- **API v1:** 100 requests per 15 minutes per IP for `/api/v1/*` (configurable via `RATE_LIMIT_MAX_API`).
- When exceeded, responses are 429 with body `{ error: "Too many requests", code: "RATE_LIMITED" }`. Headers `RateLimit-*` are set per standard.

## Observability

- **Request ID:** Every response includes `X-Request-ID`. Send `X-Request-ID` on the request to preserve it.
- **Structured logs:** JSON lines to stdout (request log with `requestId`, `route`, `method`, `statusCode`, `durationMs`, `userId` when authenticated). Errors go to stderr with `requestId` and stack.
- **Prometheus metrics:** `GET /metrics` exposes request count, duration histogram, and response size (no auth). Configure your scraper to hit this endpoint.
- **Sentry (optional):** Set `SENTRY_DSN` and install `@sentry/node` to report errors to Sentry. If unset or package not installed, the server runs without Sentry.

## Additional env (optional)

- `BODY_LIMIT` — JSON body size limit (default `512kb`).
- `REQUEST_TIMEOUT_MS` — Server request timeout in ms (default `30000`).
- `SENTRY_DSN` — Sentry DSN for error tracking; requires `npm install @sentry/node`.

## API error shape

Errors return JSON: `{ error: string, code?: string, requestId?: string }`. Use `requestId` for support and log correlation.

## Endpoints

- `GET /health`
- `GET /metrics` — Prometheus metrics (no auth) — health check
- `GET /api/v1/projects` — list projects (query params)
- `GET /api/v1/projects/:id` — get project
- `POST /api/v1/projects` — create project
- `PATCH /api/v1/projects/:id` — update project
- `DELETE /api/v1/projects/:id` — delete project
- `GET /api/v1/project-types` — list project types
- `GET /api/v1/project-statuses` — list project statuses
