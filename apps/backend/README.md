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

## Endpoints

- `GET /health` — health check
- `GET /api/v1/projects` — list projects (query params)
- `GET /api/v1/projects/:id` — get project
- `POST /api/v1/projects` — create project
- `PATCH /api/v1/projects/:id` — update project
- `DELETE /api/v1/projects/:id` — delete project
- `GET /api/v1/project-types` — list project types
- `GET /api/v1/project-statuses` — list project statuses
